import crypto from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/server";

function calculatePeriodEnd(packageType: string): Date {
  const now = new Date();
  switch (packageType) {
    case "daily":
      now.setDate(now.getDate() + 1);
      return now;
    case "weekly":
      now.setDate(now.getDate() + 7);
      return now;
    case "monthly":
      now.setMonth(now.getMonth() + 1);
      return now;
    case "yearly":
      now.setFullYear(now.getFullYear() + 1);
      return now;
    default:
      now.setMonth(now.getMonth() + 1);
      return now;
  }
}

async function initializeUserQuota(userId: string, quotaTier: string, packageType: string): Promise<void> {
  const { data: quotaDef, error: quotaDefError } = await supabaseAdmin
    .from("package_quota_definitions")
    .select("*")
    .eq("package_tier", quotaTier)
    .maybeSingle();

  if (quotaDefError || !quotaDef) {
    throw new Error(`No quota definition found for tier: ${quotaTier}`);
  }

  const periodStart = new Date();
  const periodEnd = calculatePeriodEnd(packageType);

  await supabaseAdmin
    .from("user_quotas")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_active", true);

  const { error: insertError } = await supabaseAdmin.from("user_quotas").insert({
    user_id: userId,
    subscription_id: null,
    package_tier: quotaTier,
    sms_used: 0,
    sms_limit: quotaDef.sms_limit,
    character_creation_used: 0,
    character_creation_limit: quotaDef.character_creation_limit,
    file_upload_used_today: 0,
    file_upload_daily_limit: quotaDef.daily_file_upload_limit,
    file_upload_total_used: 0,
    file_upload_total_limit: quotaDef.total_file_upload_limit,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    daily_reset_at: new Date().toISOString().split("T")[0],
    is_active: true,
  });

  if (insertError) throw insertError;
}

function isSignatureValid(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    const signature = req.headers.get("x-signature");

    if (!webhookSecret || !signature) {
      return new Response("Missing webhook secret or signature", { status: 400 });
    }

    const payload = await req.text();
    if (!isSignatureValid(payload, signature, webhookSecret)) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(payload);
    const eventName = event?.meta?.event_name as string | undefined;
    if (eventName !== "order_created") {
      return new Response("Ignored", { status: 200 });
    }

    const custom = event?.meta?.custom_data || {};
    const packageId = custom?.package_id as string | undefined;
    const paidAmountRaw = custom?.amount_cents;
    const paidCurrency = (custom?.currency as string | undefined) || "usd";
    const customerEmail = event?.data?.attributes?.user_email as string | undefined;
    const orderIdentifier = String(event?.data?.id || "");

    if (!customerEmail || !packageId) {
      return new Response("Missing required order metadata", { status: 400 });
    }

    const paidAmount = Number(paidAmountRaw || 0);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .maybeSingle();

    if (!profile?.id) {
      return new Response("User not found", { status: 404 });
    }

    const { data: pkg } = await supabaseAdmin
      .from("packages")
      .select("quota_tier, package_type")
      .eq("id", packageId)
      .maybeSingle();

    if (!pkg) {
      return new Response("Package not found", { status: 404 });
    }

    const { error: purchaseError } = await supabaseAdmin.from("package_purchases").insert({
      user_id: profile.id,
      package_id: packageId,
      amount_paid_cents: Number.isFinite(paidAmount) ? Math.round(paidAmount) : 0,
      currency: paidCurrency,
      stripe_payment_intent_id: orderIdentifier || null,
    });

    if (purchaseError) {
      console.error("[Lemon Webhook] package_purchases insert failed:", purchaseError.message);
    }

    try {
      await initializeUserQuota(profile.id, pkg.quota_tier, pkg.package_type);
    } catch (quotaError: any) {
      console.error("[Lemon Webhook] initializeUserQuota failed:", quotaError?.message);
    }

    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("[Lemon Webhook] Unexpected error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
