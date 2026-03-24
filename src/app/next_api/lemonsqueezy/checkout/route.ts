export async function POST(_req: Request) {
  // Lemon Squeezy checkout is intentionally disabled during PayPal migration.
  // Keep this file for an easy rollback path once needed again.
  return Response.json(
    {
      success: false,
      error: "Lemon Squeezy checkout is temporarily disabled. Use /next_api/paypal/checkout.",
    },
    { status: 410 }
  );
}
