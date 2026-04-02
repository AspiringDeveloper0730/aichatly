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

async function getPayPalAccessToken(clientId: string, secret: string): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const tokenResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    throw new Error(`PayPal token error: ${errorBody}`);
  }

  const tokenPayload = await tokenResponse.json();
  const accessToken = tokenPayload?.access_token as string | undefined;
  if (!accessToken) throw new Error("Missing PayPal access token");
  return accessToken;
}

async function verifyWebhookSignature(headers: Headers, rawBody: string, accessToken: string, webhookId: string) {
  const authAlgo = headers.get("paypal-auth-algo");
  const certUrl = headers.get("paypal-cert-url");
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const transmissionTime = headers.get("paypal-transmission-time");

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return false;
  }

  const verifyResponse = await fetch("https://api-m.paypal.com/v1/notifications/verify-webhook-signature", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });

  if (!verifyResponse.ok) return false;
  const payload = await verifyResponse.json();
  return payload?.verification_status === "SUCCESS";
}

function safeParseCustomId(customId: string | undefined): {
  packageId?: string;
  userEmail?: string;
  amountCents?: number;
  currency?: string;
} {
  if (!customId) return {};
  try {
    const parsed = JSON.parse(customId);
    return {
      packageId: typeof parsed?.packageId === "string" ? parsed.packageId : undefined,
      userEmail: typeof parsed?.userEmail === "string" ? parsed.userEmail.toLowerCase() : undefined,
      amountCents: Number.isFinite(Number(parsed?.amountCents)) ? Number(parsed.amountCents) : undefined,
      currency: typeof parsed?.currency === "string" ? parsed.currency.toLowerCase() : undefined,
    };
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_SECRET;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!clientId || !clientSecret || !webhookId) {
      return new Response("PayPal webhook not configured", { status: 500 });
    }

    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    const accessToken = await getPayPalAccessToken(clientId, clientSecret);
    const isValid = await verifyWebhookSignature(req.headers, rawBody, accessToken, webhookId);
    if (!isValid) return new Response("Invalid signature", { status: 401 });

    if (event?.event_type !== "CHECKOUT.ORDER.APPROVED") {
      return new Response("Ignored", { status: 200 });
    }

    const orderId = event?.resource?.id as string | undefined;
    if (!orderId) return new Response("Missing order id", { status: 400 });

    const captureResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!captureResponse.ok) {
      const errorBody = await captureResponse.text();
      console.error("[PayPal Webhook] capture failed:", errorBody);
      return new Response("Capture failed", { status: 500 });
    }

    const capturePayload = await captureResponse.json();
    const purchaseUnit = capturePayload?.purchase_units?.[0];
    const custom = safeParseCustomId(purchaseUnit?.custom_id);
    const capture = purchaseUnit?.payments?.captures?.[0];
    const captureId = capture?.id as string | undefined;
    const captureStatus = capture?.status as string | undefined;

    if (captureStatus !== "COMPLETED") {
      return new Response("Capture not completed", { status: 200 });
    }

    const packageId = custom.packageId;
    const customerEmail = custom.userEmail || (capturePayload?.payer?.email_address as string | undefined);

    if (!packageId || !customerEmail) {
      return new Response("Missing package id or user email", { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", customerEmail.toLowerCase())
      .maybeSingle();
    if (!profile?.id) return new Response("User not found", { status: 404 });

    const { data: pkg } = await supabaseAdmin
      .from("packages")
      .select("quota_tier, package_type")
      .eq("id", packageId)
      .maybeSingle();
    if (!pkg) return new Response("Package not found", { status: 404 });

    if (captureId) {
      const { data: existing } = await supabaseAdmin
        .from("package_purchases")
        .select("id")
        .eq("stripe_payment_intent_id", captureId)
        .maybeSingle();
      if (existing?.id) {
        return new Response("Already processed", { status: 200 });
      }
    }

    const amountPaid =
      custom.amountCents
      ?? (Number.isFinite(Number(capture?.amount?.value))
        ? Math.round(Number(capture.amount.value) * 100)
        : 0);
    const paidCurrency = custom.currency || String(capture?.amount?.currency_code || "usd").toLowerCase();

    const { error: purchaseError } = await supabaseAdmin.from("package_purchases").insert({
      user_id: profile.id,
      package_id: packageId,
      amount_paid_cents: amountPaid,
      currency: paidCurrency,
      stripe_payment_intent_id: captureId || orderId,
    });
    if (purchaseError) {
      console.error("[PayPal Webhook] package_purchases insert failed:", purchaseError.message);
    }

    try {
      await initializeUserQuota(profile.id, pkg.quota_tier, pkg.package_type);
    } catch (quotaError: any) {
      console.error("[PayPal Webhook] initializeUserQuota failed:", quotaError?.message);
    }

    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("[PayPal Webhook] Unexpected error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
