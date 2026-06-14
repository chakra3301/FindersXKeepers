import type { EscrowProvider } from "./types";
import { StubEscrowProvider } from "./stub";
import { StripeEscrowProvider } from "./stripe";
import { readStripeEnv } from "./stripe-env";
import { createStripeClient } from "./stripe-client";

export type { EscrowProvider, EscrowIntent, CreateHoldParams } from "./types";

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
      return new StripeEscrowProvider(createStripeClient(secretKey), siteUrl);
    }
    default:
      throw new Error(`Unknown ESCROW_PROVIDER: ${provider}`);
  }
}

// Reuse one provider instance across the server process. Bump the version when
// the EscrowProvider interface changes so dev HMR doesn't keep a stale instance.
const ESCROW_CACHE_VERSION = 1;

const globalForEscrow = globalThis as unknown as {
  __fkEscrow?: EscrowProvider;
  __fkEscrowVersion?: number;
};

function getEscrowProvider(): EscrowProvider {
  const cached = globalForEscrow.__fkEscrow;
  if (
    cached &&
    globalForEscrow.__fkEscrowVersion === ESCROW_CACHE_VERSION &&
    typeof cached.resumeCheckout === "function"
  ) {
    return cached;
  }
  const provider = createEscrowProvider();
  globalForEscrow.__fkEscrow = provider;
  globalForEscrow.__fkEscrowVersion = ESCROW_CACHE_VERSION;
  return provider;
}

export const escrow: EscrowProvider = getEscrowProvider();
