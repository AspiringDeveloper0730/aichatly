type CheckoutBody = {
  packageId?: string;
  packageName?: string;
  amountCents?: number | string;
  currency?: string;
  billingCycle?: string;
  userEmail?: string;
};

function toAmountValue(amountCents: number): string {
  return (Math.round(amountCents) / 100).toFixed(2);
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
  if (!accessToken) {
    throw new Error("PayPal access token missing in response");
  }

  return accessToken;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CheckoutBody;
    const packageName = body.packageName?.trim();
    const packageId = body.packageId?.trim();
    const amountCentsRaw = body.amountCents;
    const billingCycle = body.billingCycle?.trim();
    const currency = (body.currency || "USD").toUpperCase();
    const userEmail = body.userEmail?.trim().toLowerCase();

    if (!packageName || !packageId || amountCentsRaw === undefined || amountCentsRaw === null || !userEmail) {
      return Response.json(
        { success: false, error: "Missing required fields: packageId, packageName, amountCents, userEmail" },
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

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_SECRET;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    if (!clientId || !clientSecret) {
      return Response.json(
        { success: false, error: "PayPal is not configured" },
        { status: 500 }
      );
    }

    const accessToken = await getPayPalAccessToken(clientId, clientSecret);

    const customId = JSON.stringify({
      packageId,
      userEmail,
      billingCycle: billingCycle || null,
      amountCents: Math.round(amountCents),
      currency,
    });

    const orderResponse = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: billingCycle ? `${packageName} (${billingCycle})` : packageName,
            custom_id: customId,
            amount: {
              currency_code: currency,
              value: toAmountValue(amountCents),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: `${siteUrl}/panel?payment=success`,
              cancel_url: `${siteUrl}/pricing?payment=cancelled`,
              user_action: "PAY_NOW",
            },
          },
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorBody = await orderResponse.text();
      console.error("[PayPal Checkout] order create error:", errorBody);
      return Response.json({ success: false, error: "Failed to create PayPal order" }, { status: 500 });
    }

    const payload = await orderResponse.json();
    const links = Array.isArray(payload?.links) ? payload.links : [];
    const approveLink = links.find((link: any) => link?.rel === "payer-action")?.href
      || links.find((link: any) => link?.rel === "approve")?.href;

    if (!approveLink) {
      return Response.json({ success: false, error: "PayPal approval URL missing" }, { status: 500 });
    }

    return Response.json({ success: true, url: approveLink });
  } catch (error: any) {
    console.error("[PayPal Checkout] Unexpected error:", error);
    return Response.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
