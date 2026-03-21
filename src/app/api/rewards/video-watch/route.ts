
import { supabaseAdmin } from "@/integrations/supabase/server";

const MAX_DAILY_WATCHES = 4;
const REWARD_SMS = 15;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return Response.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // Check how many video watches today
    const { data: existingRewards, error: checkError } = await supabaseAdmin
      .from("user_daily_rewards")
      .select("id")
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

    const watchedCount = existingRewards?.length ?? 0;

    if (watchedCount >= MAX_DAILY_WATCHES) {
      return Response.json({
        success: false,
        error: `Daily limit reached (${MAX_DAILY_WATCHES}/${MAX_DAILY_WATCHES})`,
        watchedCount,
        maxCount: MAX_DAILY_WATCHES,
      });
    }

    // Insert reward record
    const { error: insertError } = await supabaseAdmin
      .from("user_daily_rewards")
      .insert({
        user_id: userId,
        reward_type: "video_watch",
        reward_sms: REWARD_SMS,
        reward_date: today,
      });

    if (insertError) {
      // Handle duplicate constraint gracefully
      if (insertError.code === "23505") {
        return Response.json({
          success: false,
          error: "Reward already claimed for this period",
          watchedCount,
          maxCount: MAX_DAILY_WATCHES,
        });
      }
      console.error("[VideoWatch] insert error:", insertError);
      return Response.json(
        { success: false, error: "Failed to record reward" },
        { status: 500 }
      );
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
      watchedCount: watchedCount + 1,
      maxCount: MAX_DAILY_WATCHES,
    });
  } catch (err: any) {
    console.error("[VideoWatch] unexpected error:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
