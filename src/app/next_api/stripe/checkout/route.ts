
import { stripe } from "@zoerai/integration";
import { supabaseAdmin } from "@/integrations/supabase/server";

export async function POST(req: Request) {
  try {
    console.log("111111111111111")
    const body = await req.json();
    const packageName = body.packageName || body.name;
    const amountCentsRaw = body.amountCents;
    const { packageId, currency, billingCycle } = body;

    if (!packageName || amountCentsRaw === undefined || amountCentsRaw === null) {
      return Response.json(
        { success: false, error: "Missing required fields: packageName, amountCents" },
        { status: 400 }
      );
    }

    // Stripe requires `unitAmount` to be a valid number in the smallest currency unit.
    // Supabase often returns bigint-like values as strings, so coerce and validate here.
    const amountCentsNum =
      typeof amountCentsRaw === "string" ? Number(amountCentsRaw) : amountCentsRaw;

    if (!Number.isFinite(amountCentsNum) || amountCentsNum <= 0) {
      return Response.json(
        {
          success: false,
          error: `Invalid amountCents: ${String(amountCentsRaw)}`,
        },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return Response.json(
        { success: false, error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const stripeUrl =
      process.env.NEXT_PUBLIC_STRIPE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const displayName = billingCycle
      ? `${packageName} (${billingCycle})`
      : packageName;

    const metadata: Record<string, string> = {};
    if (packageId) metadata.package_id = String(packageId);

    // All packages are one-time payments — always use payment mode
    const sessionRequest: Parameters<typeof stripe.createCheckoutSession>[0]["request"] = {
      mode: "payment",
      lineItems: [
        {
          priceData: {
            currency:
              typeof currency === "string" && currency.trim()
                ? currency.trim().toLowerCase()
                : "usd",
            unitAmount: Math.round(amountCentsNum),
            productData: { name: displayName },
          },
          quantity: 1,
        },
      ],
      successUrl: `${stripeUrl}/panel?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${stripeUrl}/pricing?payment=cancelled`,
      metadata,
    };

    const result = await stripe.createCheckoutSession({
      stripeKey: stripeSecretKey,
      request: sessionRequest,
    });

    if (!result.success) {
      console.error("[Stripe Checkout] Error:", result.error);
      return Response.json(
        { success: false, error: result.error || "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return Response.json({ success: true, url: result.data?.url });
  } catch (error: any) {
    console.error("[Stripe Checkout] Unexpected error:", error);
    return Response.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
