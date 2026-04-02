
import { supabaseAdmin } from "@/integrations/supabase/server";

const MAX_DAILY_SHARES = 8;
const REWARD_SMS = 5;
const SHARE_TRACKING_SECRET = process.env.SHARE_TRACKING_SECRET || process.env.NEXTAUTH_SECRET || "dev-share-secret";

type ShareAction = "prepare" | "verify_click" | "status";

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

async function signPayload(payload: string): Promise<string> {
  const crypto = await import("crypto");
  return crypto
    .createHmac("sha256", SHARE_TRACKING_SECRET)
    .update(payload)
    .digest("base64url");
}

async function createTrackingCode(data: Record<string, unknown>): Promise<string> {
  const payload = toBase64Url(JSON.stringify(data));
  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
}

async function verifyTrackingCode(code: string): Promise<Record<string, unknown> | null> {
  const [payload, signature] = code.split(".");
  if (!payload || !signature) return null;
  const expected = await signPayload(payload);
  if (expected !== signature) return null;
  try {
    return JSON.parse(fromBase64Url(payload));
  } catch {
    return null;
  }
}

async function getTodayShareCount(userId: string, today: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("user_daily_rewards")
    .select("id, reward_sms")
    .eq("user_id", userId)
    .eq("reward_type", "character_share")
    .eq("reward_date", today)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Because this table is unique by (user, reward_type, day), reward_sms stores accumulated share rewards.
  return Math.floor((data?.reward_sms ?? 0) / REWARD_SMS);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, action, platform, trackingCode, shareId } = body as {
      userId?: string;
      action?: ShareAction;
      platform?: string;
      trackingCode?: string;
      shareId?: string;
    };

    if (!action || (action !== "prepare" && action !== "verify_click" && action !== "status")) {
      return Response.json(
        { success: false, error: "action must be 'prepare', 'verify_click' or 'status'" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    if (action === "prepare") {
      if (!userId) {
        return Response.json(
          { success: false, error: "userId is required" },
          { status: 400 }
        );
      }

      const { data: quota, error: quotaError } = await supabaseAdmin
        .from("user_quotas")
        .select("package_tier")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (quotaError) {
        console.error("[CharacterShare] quota check error:", quotaError);
        return Response.json(
          { success: false, error: "Failed to check user quota" },
          { status: 500 }
        );
      }
      const isFreeUser = quota?.package_tier === "free";

      let shareCount = 0;
      if (isFreeUser) {
        try {
          shareCount = await getTodayShareCount(userId, today);
        } catch (checkError) {
          console.error("[CharacterShare] check error:", checkError);
          return Response.json(
            { success: false, error: "Failed to check reward status" },
            { status: 500 }
          );
        }

        if (shareCount >= MAX_DAILY_SHARES) {
          return Response.json({
            success: false,
            error: "You reached to 8 limits to share today",
            shareCount,
            maxCount: MAX_DAILY_SHARES,
          });
        }
      }

      const code = await createTrackingCode({
        userId,
        platform: platform || "unknown",
        date: today,
        nonce: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      });

      return Response.json({
        success: true,
        shareId: code,
        shareCount,
        maxCount: MAX_DAILY_SHARES,
        remainingCount: Math.max(0, MAX_DAILY_SHARES - shareCount),
        isFreeUser,
      });
    }

    if (action === "status") {
      if (!userId) {
        return Response.json(
          { success: false, error: "userId is required" },
          { status: 400 }
        );
      }

      const { data: quota, error: quotaError } = await supabaseAdmin
        .from("user_quotas")
        .select("package_tier")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (quotaError) {
        console.error("[CharacterShare] status quota check error:", quotaError);
        return Response.json(
          { success: false, error: "Failed to check user quota" },
          { status: 500 }
        );
      }

      const isFreeUser = quota?.package_tier === "free";
      if (!isFreeUser) {
        return Response.json({
          success: true,
          shareCount: 0,
          maxCount: MAX_DAILY_SHARES,
          remainingCount: MAX_DAILY_SHARES,
          isFreeUser: false,
        });
      }

      const shareCount = await getTodayShareCount(userId, today);
      return Response.json({
        success: true,
        shareCount,
        maxCount: MAX_DAILY_SHARES,
        remainingCount: Math.max(0, MAX_DAILY_SHARES - shareCount),
        isFreeUser: true,
      });
    }

    const resolvedShareId = shareId || trackingCode;

    if (!resolvedShareId) {
      return Response.json(
        { success: false, error: "shareId is required" },
        { status: 400 }
      );
    }

    const payload = await verifyTrackingCode(resolvedShareId);
    if (!payload || typeof payload.userId !== "string" || typeof payload.date !== "string") {
      return Response.json(
        { success: false, error: "Invalid tracking code" },
        { status: 400 }
      );
    }

    const ownerUserId = payload.userId;

    if (payload.date !== today) {
      return Response.json({
        success: false,
        error: "Tracking code expired",
      });
    }

    const { data: quotaTierData, error: quotaTierError } = await supabaseAdmin
      .from("user_quotas")
      .select("package_tier")
      .eq("user_id", ownerUserId)
      .eq("is_active", true)
      .maybeSingle();

    if (quotaTierError) {
      console.error("[CharacterShare] verify quota check error:", quotaTierError);
      return Response.json(
        { success: false, error: "Failed to check user quota" },
        { status: 500 }
      );
    }

    const isFreeUser = quotaTierData?.package_tier === "free";

    if (!isFreeUser) {
      // Premium and other non-free users can share freely; no +5 reward logic applies.
      return Response.json({
        success: true,
        rewardSms: 0,
        shareCount: 0,
        maxCount: MAX_DAILY_SHARES,
      });
    }

    let shareCount = 0;
    try {
      shareCount = await getTodayShareCount(ownerUserId, today);
    } catch (checkError) {
      console.error("[CharacterShare] verify check error:", checkError);
      return Response.json(
        { success: false, error: "Failed to check reward status" },
        { status: 500 }
      );
    }

    if (shareCount >= MAX_DAILY_SHARES) {
      return Response.json({
        success: false,
        error: "You reached to 8 limits to share today",
        shareCount,
        maxCount: MAX_DAILY_SHARES,
      });
    }

    const nextCount = shareCount + 1;
    const nextRewardSms = nextCount * REWARD_SMS;

    const { data: existingRow, error: rowFetchError } = await supabaseAdmin
      .from("user_daily_rewards")
      .select("id")
      .eq("user_id", ownerUserId)
      .eq("reward_type", "character_share")
      .eq("reward_date", today)
      .maybeSingle();

    if (rowFetchError) {
      console.error("[CharacterShare] row fetch error:", rowFetchError);
      return Response.json(
        { success: false, error: "Failed to update reward status" },
        { status: 500 }
      );
    }

    if (!existingRow) {
      const { error: insertError } = await supabaseAdmin
        .from("user_daily_rewards")
        .insert({
          user_id: ownerUserId,
          reward_type: "character_share",
          reward_sms: nextRewardSms,
          reward_date: today,
        });

      if (insertError) {
        console.error("[CharacterShare] insert error:", insertError);
        return Response.json({
          success: false,
          error: "Failed to record reward",
        });
      }
    } else {
      const { error: updateRewardError } = await supabaseAdmin
        .from("user_daily_rewards")
        .update({
          reward_sms: nextRewardSms,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRow.id);

      if (updateRewardError) {
        console.error("[CharacterShare] update reward error:", updateRewardError);
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
      .eq("user_id", ownerUserId)
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
      shareCount: nextCount,
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
