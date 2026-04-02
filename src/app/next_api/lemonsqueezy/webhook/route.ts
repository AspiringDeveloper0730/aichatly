export async function POST(_req: Request) {
  // Lemon Squeezy webhook is intentionally disabled during PayPal migration.
  // Keep this file for an easy rollback path once needed again.
  return new Response("Lemon Squeezy webhook is temporarily disabled.", { status: 410 });
}
