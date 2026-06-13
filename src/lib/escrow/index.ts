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
      throw new Error(
        "Stripe Connect escrow is not implemented yet. " +
          "Add StripeEscrowProvider here and set ESCROW_PROVIDER=stripe.",
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
