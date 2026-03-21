
import { stripe } from "@zoerai/integration";
import { supabaseAdmin } from "@/integrations/supabase/server";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

async function initializeUserQuota(
  userId: string,
  quotaTier: string,
  packageType: string
): Promise<void> {
  // 1. Query quota definition
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

  // 2. Deactivate current active quota
  await supabaseAdmin
    .from("user_quotas")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_active", true);

  // 3. Insert new active quota
  const { error: insertError } = await supabaseAdmin
    .from("user_quotas")
    .insert({
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

// ─── Webhook Handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return new Response("Missing signature or webhook secret", { status: 400 });
    }

    const payload = await req.text();

    const verifyResult = await stripe.verifyWebhook({
      webhookSecret,
      request: { payload, signature, webhookSecret },
    });

    if (!verifyResult.success) {
      console.error("[Stripe Webhook] Verification failed:", verifyResult.error);
      return new Response("Webhook verification failed", { status: 400 });
    }

    const event = verifyResult.data;

    switch (event.type) {
      // ── One-time checkout completed ────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as any;
        console.log("[Stripe Webhook] Checkout completed:", session.id);

        // Only handle one-time payments
        if (session.mode !== "payment") {
          console.log("[Stripe Webhook] Not a one-time payment, skipping.");
          break;
        }

        const email =
          session.customer_email || session.customer_details?.email;

        if (!email) {
          console.error("[Stripe Webhook] No email found in session.");
          break;
        }

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (!profile?.id) {
          console.error("[Stripe Webhook] User not found for email:", email);
          break;
        }

        const packageId = session.metadata?.package_id;
        if (!packageId) {
          console.error("[Stripe Webhook] Missing package_id in session metadata.");
          break;
        }

        // Get package info
        const { data: pkg } = await supabaseAdmin
          .from("packages")
          .select("quota_tier, package_type, name_en")
          .eq("id", packageId)
          .maybeSingle();

        if (!pkg) {
          console.error("[Stripe Webhook] Package not found:", packageId);
          break;
        }

        // 1. Record purchase
        const { error: purchaseError } = await supabaseAdmin
          .from("package_purchases")
          .insert({
            user_id: profile.id,
            package_id: packageId,
            amount_paid_cents: session.amount_total || 0,
            currency: session.currency || "usd",
            stripe_payment_intent_id: session.payment_intent || null,
          });

        if (purchaseError) {
          console.error("[Stripe Webhook] package_purchases insert failed:", purchaseError.message);
        } else {
          console.log("[Stripe Webhook] Purchase recorded for user:", profile.id);
        }

        // 2. Initialize user quota
        try {
          await initializeUserQuota(profile.id, pkg.quota_tier, pkg.package_type);
          console.log("[Stripe Webhook] Quota initialized for user:", profile.id, "tier:", pkg.quota_tier);
        } catch (quotaErr: any) {
          console.error("[Stripe Webhook] initializeUserQuota failed:", quotaErr?.message);
        }

        break;
      }

      // ── Payment intent events ──────────────────────────────────────────────
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as any;
        console.log("[Stripe Webhook] Payment intent succeeded:", paymentIntent.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as any;
        console.log("[Stripe Webhook] Payment intent failed:", paymentIntent.id);
        break;
      }

      default:
        console.log("[Stripe Webhook] Unhandled event type:", event.type);
    }

    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("[Stripe Webhook] Unexpected error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
