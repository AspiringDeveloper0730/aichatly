import { supabaseAdmin } from "@/integrations/supabase/server";

type CheckoutBody = {
  packageId?: string;
  packageName?: string;
  amountCents?: number | string;
  currency?: string;
  billingCycle?: string;
  variantId?: number | string | null;
};

function parseVariantId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw.trim());
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CheckoutBody;
    const packageName = body.packageName?.trim();
    const packageId = body.packageId;
    const amountCentsRaw = body.amountCents;
    const currency = (body.currency || "usd").toLowerCase();

    if (!packageName || amountCentsRaw === undefined || amountCentsRaw === null || !packageId) {
      return Response.json(
        { success: false, error: "Missing required fields: packageId, packageName, amountCents" },
        { status: 400 }
      );
    }

    const amountCents =
      typeof amountCentsRaw === "string" ? Number(amountCentsRaw) : amountCentsRaw;
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return Response.json(
        { success: false, error: `Invalid amountCents: ${String(amountCentsRaw)}` },
        { status: 400 }
      );
    }

    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    if (!apiKey || !storeId) {
      return Response.json(
        { success: false, error: "Lemon Squeezy is not configured" },
        { status: 500 }
      );
    }

    let variantId = parseVariantId(body.variantId);
    if (!variantId) {
      const { data: pkg } = await supabaseAdmin
        .from("packages")
        .select("stripe_price_id")
        .eq("id", packageId)
        .maybeSingle();

      variantId = parseVariantId(pkg?.stripe_price_id);
    }

    if (!variantId) {
      return Response.json(
        {
          success: false,
          error:
            "Missing Lemon Squeezy variant id for package. Set packages.stripe_price_id to the Lemon variant id.",
        },
        { status: 400 }
      );
    }

    const createCheckoutResponse = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            product_options: {
              name: body.billingCycle ? `${packageName} (${body.billingCycle})` : packageName,
            },
            checkout_data: {
              custom: {
                package_id: packageId,
                amount_cents: String(Math.round(amountCents)),
                currency,
              },
            },
            checkout_options: {
              embed: false,
              media: true,
              redirect_url: `${siteUrl}/panel?payment=success`,
            },
            expires_at: null,
            preview: false,
            test_mode: process.env.LEMON_SQUEEZY_TEST_MODE === "true",
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: String(storeId),
              },
            },
            variant: {
              data: {
                type: "variants",
                id: String(variantId),
              },
            },
          },
        },
      }),
    });

    if (!createCheckoutResponse.ok) {
      const errorBody = await createCheckoutResponse.text();
      console.error("[Lemon Checkout] API error:", errorBody);
      return Response.json({ success: false, error: "Failed to create checkout" }, { status: 500 });
    }

    const payload = await createCheckoutResponse.json();
    const url = payload?.data?.attributes?.url;
    if (!url) {
      return Response.json({ success: false, error: "Checkout URL missing in response" }, { status: 500 });
    }

    const successUrl = `${siteUrl}/panel?payment=success`;
    return Response.json({ success: true, url, successUrl });
  } catch (error: any) {
    console.error("[Lemon Checkout] Unexpected error:", error);
    return Response.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
