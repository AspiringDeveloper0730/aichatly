
import { supabaseAdmin } from "@/integrations/supabase/server";

const MAX_DAILY_WATCHES = 4;
const REWARD_SMS = 15;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, action } = body as { userId?: string; action?: "claim" | "status" };

    if (!userId) {
      return Response.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    const resolvedAction = action || "claim";
    if (resolvedAction !== "claim" && resolvedAction !== "status") {
      return Response.json(
        { success: false, error: "action must be 'claim' or 'status'" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: quotaTierData, error: quotaTierError } = await supabaseAdmin
      .from("user_quotas")
      .select("package_tier")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (quotaTierError) {
      console.error("[VideoWatch] quota check error:", quotaTierError);
      return Response.json(
        { success: false, error: "Failed to check user quota" },
        { status: 500 }
      );
    }

    const isFreeUser = quotaTierData?.package_tier === "free";

    if (!isFreeUser) {
      return Response.json({
        success: true,
        rewardSms: 0,
        watchedCount: 0,
        maxCount: MAX_DAILY_WATCHES,
        remainingCount: MAX_DAILY_WATCHES,
      });
    }

    // Since user_daily_rewards is unique per (user, reward_type, reward_date),
    // reward_sms stores cumulative reward for the day.
    const { data: existingRewardRow, error: checkError } = await supabaseAdmin
      .from("user_daily_rewards")
      .select("id, reward_sms")
      .eq("user_id", userId)
      .eq("reward_type", "video_watch")
      .eq("reward_date", today);

    if (checkError) {
      console.error("[VideoWatch] check error:", checkError);
      return Response.json(
        { success: false, error: "Failed to check reward status" },
        { status: 500 }
      );
    }

    const watchedCount = Math.floor(((existingRewardRow?.[0]?.reward_sms ?? 0) as number) / REWARD_SMS);
    const remainingCount = Math.max(0, MAX_DAILY_WATCHES - watchedCount);

    if (resolvedAction === "status") {
      return Response.json({
        success: true,
        watchedCount,
        maxCount: MAX_DAILY_WATCHES,
        remainingCount,
      });
    }

    if (watchedCount >= MAX_DAILY_WATCHES) {
      return Response.json({
        success: false,
        error: `Daily limit reached (${MAX_DAILY_WATCHES}/${MAX_DAILY_WATCHES})`,
        watchedCount,
        maxCount: MAX_DAILY_WATCHES,
        remainingCount: 0,
      });
    }

    const nextWatchedCount = watchedCount + 1;
    const nextRewardSms = nextWatchedCount * REWARD_SMS;

    if (!existingRewardRow?.[0]?.id) {
      const { error: insertError } = await supabaseAdmin
        .from("user_daily_rewards")
        .insert({
          user_id: userId,
          reward_type: "video_watch",
          reward_sms: nextRewardSms,
          reward_date: today,
        });

      if (insertError) {
        console.error("[VideoWatch] insert error:", insertError);
        return Response.json(
          { success: false, error: "Failed to record reward" },
          { status: 500 }
        );
      }
    } else {
      const { error: updateRewardError } = await supabaseAdmin
        .from("user_daily_rewards")
        .update({
          reward_sms: nextRewardSms,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRewardRow[0].id);

      if (updateRewardError) {
        console.error("[VideoWatch] update reward error:", updateRewardError);
        return Response.json(
          { success: false, error: "Failed to record reward" },
          { status: 500 }
        );
      }
    }

    // Update quota — only for free tier users
    const { data: quota, error: quotaFetchError } = await supabaseAdmin
      .from("user_quotas")
      .select("id, sms_limit")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("package_tier", "free")
      .maybeSingle();

    if (!quotaFetchError && quota) {
      const { error: updateError } = await supabaseAdmin
        .from("user_quotas")
        .update({
          sms_limit: quota.sms_limit + REWARD_SMS,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quota.id);

      if (updateError) {
        console.error("[VideoWatch] quota update error:", updateError);
      }
    }

    return Response.json({
      success: true,
      rewardSms: REWARD_SMS,
      watchedCount: nextWatchedCount,
      maxCount: MAX_DAILY_WATCHES,
      remainingCount: Math.max(0, MAX_DAILY_WATCHES - nextWatchedCount),
    });
  } catch (err: any) {
    console.error("[VideoWatch] unexpected error:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
