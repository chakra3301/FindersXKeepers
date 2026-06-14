import Stripe from "stripe";

/** Pinned to the SDK's bundled API version so behaviour can't drift under us. */
export const STRIPE_API_VERSION = "2026-05-27.dahlia";

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
}
