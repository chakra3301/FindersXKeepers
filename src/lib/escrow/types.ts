import type { PaymentStatus } from "@/lib/db/types";

/**
 * The escrow seam.
 *
 * Funds are held by the PROCESSOR and released only on OUR trigger. Money never
 * lands in our own balance/bank logic — this interface deliberately has no
 * "our balance" concept. Today it's backed by a stub; swapping in Stripe
 * Connect later is a single-file change in ./index.ts.
 *
 * Status maps directly to the `payments.status` enum:
 *   pending  → intent created, not yet funded
 *   held     → funds captured into escrow at the processor
 *   released → released to us/supplier on our trigger (item in transit)
 *   refunded → returned to the customer
 *   failed   → processor declined
 */
export interface EscrowIntent {
  /** Processor-side id; maps to payments.stripe_payment_intent_id. */
  paymentIntentId: string;
  amountJpy: number;
  status: PaymentStatus;
  /** Set at settlement: amount captured to us. */
  capturedJpy?: number;
  /** Set at settlement: unused cap returned to the customer. */
  refundedJpy?: number;
  /**
   * Hosted-payment redirect URL (Stripe Checkout). Present when the hold needs
   * the customer to complete payment off-site; absent for the stub (which holds
   * synchronously).
   */
  checkoutUrl?: string;
}

export interface CreateHoldParams {
  requestId: string;
  amountJpy: number;
  /** Optional idempotency key so retries don't double-charge. */
  idempotencyKey?: string;
}

export interface EscrowProvider {
  /** Name of the backing provider, for logging/diagnostics. */
  readonly name: string;

  /** Create a hold: processor authorises + captures funds into escrow. */
  createHold(params: CreateHoldParams): Promise<EscrowIntent>;

  /**
   * Settle/release held funds to us/supplier — OUR trigger (item in transit).
   * `captureJpy` omitted → full release (capturedJpy = held, refundedJpy = 0).
   * When `captureJpy` < held, capture that amount to us and return the
   * remainder to the customer.
   */
  release(paymentIntentId: string, captureJpy?: number): Promise<EscrowIntent>;

  /** Refund held funds back to the customer. */
  refund(paymentIntentId: string): Promise<EscrowIntent>;

  /** Read current processor-side status. */
  getStatus(paymentIntentId: string): Promise<PaymentStatus>;

  /**
   * Resume an in-flight hosted checkout when the customer returns without
   * paying. Returns the redirect URL if the session is still open; undefined
   * when the provider has no hosted checkout or the session expired.
   */
  resumeCheckout(checkoutRef: string): Promise<string | undefined>;
}
