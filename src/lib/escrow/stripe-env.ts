/**
 * Validated access to the Stripe environment variables.
 *
 * Read LAZILY (only when `ESCROW_PROVIDER=stripe`) so the default stub path
 * never requires Stripe keys — importing this module has no side effects. The
 * StripeEscrowProvider + webhook route (Effort 2) consume this; it's the single
 * place that knows which Stripe vars are required.
 */
export interface StripeEnv {
  /** Server-side secret key (`sk_test_…` in test mode). */
  secretKey: string;
  /** Webhook signing secret (`whsec_…`) from `stripe listen`. */
  webhookSecret: string;
}

export function readStripeEnv(
  env: Record<string, string | undefined> = process.env,
): StripeEnv {
  const secretKey = env.STRIPE_SECRET_KEY;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    const missing: string[] = [];
    if (!secretKey) missing.push("STRIPE_SECRET_KEY");
    if (!webhookSecret) missing.push("STRIPE_WEBHOOK_SECRET");
    throw new Error(
      `ESCROW_PROVIDER=stripe requires: ${missing.join(", ")}. ` +
        `Add them to .env.local from Stripe test mode ` +
        `(Developers → API keys for the secret key; ` +
        `\`stripe listen --forward-to localhost:3000/api/stripe/webhook\` ` +
        `for the webhook secret).`,
    );
  }

  return { secretKey, webhookSecret };
}
