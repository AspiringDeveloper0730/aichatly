
import { supabaseAdmin } from "@/integrations/supabase/server";

const MAX_DAILY_SHARES = 8;
const REWARD_SMS = 5;

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

    // Check how many character shares today
    const { data: existingRewards, error: checkError } = await supabaseAdmin
      .from("user_daily_rewards")
      .select("id")
      .eq("user_id", userId)
      .eq("reward_type", "character_share")
      .eq("reward_date", today);

    if (checkError) {
      console.error("[CharacterShare] check error:", checkError);
      return Response.json(
        { success: false, error: "Failed to check reward status" },
        { status: 500 }
      );
    }

    const shareCount = existingRewards?.length ?? 0;

    if (shareCount >= MAX_DAILY_SHARES) {
      return Response.json({
        success: false,
        error: `Daily limit reached (${MAX_DAILY_SHARES}/${MAX_DAILY_SHARES})`,
        shareCount,
        maxCount: MAX_DAILY_SHARES,
      });
    }

    // Insert reward record
    const { error: insertError } = await supabaseAdmin
      .from("user_daily_rewards")
      .insert({
        user_id: userId,
        reward_type: "character_share",
        reward_sms: REWARD_SMS,
        reward_date: today,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return Response.json({
          success: false,
          error: "Reward already claimed for this period",
          shareCount,
          maxCount: MAX_DAILY_SHARES,
        });
      }
      console.error("[CharacterShare] insert error:", insertError);
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
        console.error("[CharacterShare] quota update error:", updateError);
      }
    }

    return Response.json({
      success: true,
      rewardSms: REWARD_SMS,
      shareCount: shareCount + 1,
      maxCount: MAX_DAILY_SHARES,
    });
  } catch (err: any) {
    console.error("[CharacterShare] unexpected error:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
