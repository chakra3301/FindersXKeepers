import type { EscrowProvider } from "./types";
import { StubEscrowProvider } from "./stub";

export type { EscrowProvider, EscrowIntent, CreateHoldParams } from "./types";

/**
 * Escrow provider factory — the ONE place to swap stub → Stripe Connect.
 *
 * When the real integration lands, add a `StripeEscrowProvider` and return it
 * for `ESCROW_PROVIDER=stripe`. Nothing else in the app imports a concrete
 * provider; everyone depends on the `escrow` singleton below.
 */
function createEscrowProvider(): EscrowProvider {
  const provider = process.env.ESCROW_PROVIDER ?? "stub";
  switch (provider) {
    case "stub":
      return new StubEscrowProvider();
    case "stripe":
      // The real provider is Phase 1, Effort 2 (needs Stripe test keys + the
      // webhook route). Env validation already lives in ./stripe-env
      // (readStripeEnv), ready for it. Until then, keep ESCROW_PROVIDER=stub.
      throw new Error(
        "StripeEscrowProvider is not built yet (Phase 1, Effort 2). " +
          "Keep ESCROW_PROVIDER=stub for now — the env seam in ./stripe-env " +
          "is ready for the real keys.",
      );
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
