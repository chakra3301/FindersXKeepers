import Stripe from "stripe";
import type { EscrowProvider } from "./types";
import { StubEscrowProvider } from "./stub";
import { StripeEscrowProvider } from "./stripe";
import { readStripeEnv } from "./stripe-env";

export type { EscrowProvider, EscrowIntent, CreateHoldParams } from "./types";

// Pinned to the SDK's bundled API version so behaviour can't drift under us.
const STRIPE_API_VERSION = "2026-05-27.dahlia";

/**
 * Escrow provider factory — the ONE place to swap stub → Stripe.
 *
 * Nothing else in the app imports a concrete provider; everyone depends on the
 * `escrow` singleton below. Flipping ESCROW_PROVIDER=stripe switches the whole
 * app onto Stripe with no other code change.
 */
function createEscrowProvider(): EscrowProvider {
  const provider = process.env.ESCROW_PROVIDER ?? "stub";
  switch (provider) {
    case "stub":
      return new StubEscrowProvider();
    case "stripe": {
      const { secretKey, siteUrl } = readStripeEnv();
      const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
      return new StripeEscrowProvider(stripe, siteUrl);
    }
    default:
      throw new Error(`Unknown ESCROW_PROVIDER: ${provider}`);
  }
}

// Reuse one provider instance across the server process.
const globalForEscrow = globalThis as unknown as {
  __fkEscrow?: EscrowProvider;
};

export const escrow: EscrowProvider =
  globalForEscrow.__fkEscrow ?? createEscrowProvider();

if (process.env.NODE_ENV !== "production") {
  globalForEscrow.__fkEscrow = escrow;
}
