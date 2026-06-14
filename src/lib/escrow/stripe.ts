import type Stripe from "stripe";
import type { PaymentStatus } from "@/lib/db/types";
import type {
  CreateHoldParams,
  EscrowIntent,
  EscrowProvider,
} from "./types";

/**
 * Real escrow provider backed by Stripe (plain, not Connect — we're the merchant
 * of record). Capture-now, refund-the-difference:
 *   - createHold → a Stripe Checkout Session that charges the four-line cap
 *     estimate; the hold is CONFIRMED asynchronously by the webhook.
 *   - release(captureJpy) → keep the order total, refund (held − captureJpy).
 *   - refund → full refund (cancellation / no-find).
 *
 * JPY is a Stripe zero-decimal currency, so amounts pass through as-is
 * (¥50,000 → amount: 50000), never ×100.
 *
 * The Stripe client is injected so the provider is unit-testable without keys.
 */
export class StripeEscrowProvider implements EscrowProvider {
  readonly name = "stripe";

  constructor(
    private readonly stripe: Stripe,
    private readonly siteUrl: string,
  ) {}

  async createHold(params: CreateHoldParams): Promise<EscrowIntent> {
    const returnTo = `${this.siteUrl}/requests/${params.requestId}`;
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "jpy",
              unit_amount: params.amountJpy,
              product_data: {
                name: "Finders × Keepers — escrow hold",
                description: `Budget-cap hold for request ${params.requestId}`,
              },
            },
          },
        ],
        metadata: { requestId: params.requestId },
        payment_intent_data: { metadata: { requestId: params.requestId } },
        success_url: `${returnTo}?checkout=complete`,
        cancel_url: `${returnTo}/checkout?checkout=cancelled`,
      },
      params.idempotencyKey
        ? { idempotencyKey: params.idempotencyKey }
        : undefined,
    );

    return {
      // Checkout Session creates the PaymentIntent asynchronously; until the
      // webhook fires we key the pending row by session id.
      paymentIntentId: paymentIntentIdOf(session.payment_intent, session.id),
      amountJpy: params.amountJpy,
      // The hold is not confirmed until checkout.session.completed arrives.
      status: "pending",
      checkoutUrl: session.url ?? undefined,
    };
  }

  async release(
    paymentIntentId: string,
    captureJpy?: number,
  ): Promise<EscrowIntent> {
    const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    const held = pi.amount;
    const capturedJpy = Math.max(0, Math.min(captureJpy ?? held, held));
    const refundedJpy = held - capturedJpy;

    if (refundedJpy > 0) {
      await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundedJpy,
      });
    }

    return {
      paymentIntentId,
      amountJpy: held,
      status: "released",
      capturedJpy,
      refundedJpy,
    };
  }

  async refund(paymentIntentId: string): Promise<EscrowIntent> {
    const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    const held = pi.amount;
    await this.stripe.refunds.create({ payment_intent: paymentIntentId });
    return {
      paymentIntentId,
      amountJpy: held,
      status: "refunded",
      capturedJpy: 0,
      refundedJpy: held,
    };
  }

  async getStatus(paymentIntentId: string): Promise<PaymentStatus> {
    const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    return mapPaymentIntentStatus(pi);
  }

  async resumeCheckout(checkoutRef: string): Promise<string | undefined> {
    if (!checkoutRef.startsWith("cs_")) return undefined;
    const session = await this.stripe.checkout.sessions.retrieve(checkoutRef);
    if (session.status === "open" && session.url) return session.url;
    return undefined;
  }
}

function paymentIntentIdOf(
  pi: string | Stripe.PaymentIntent | null,
  checkoutSessionId: string,
): string {
  if (pi) {
    return typeof pi === "string" ? pi : pi.id;
  }
  return checkoutSessionId;
}

/** Map a Stripe PaymentIntent (with latest_charge expanded) to our enum. */
export function mapPaymentIntentStatus(
  pi: Stripe.PaymentIntent,
): PaymentStatus {
  switch (pi.status) {
    case "succeeded": {
      const charge =
        pi.latest_charge && typeof pi.latest_charge !== "string"
          ? pi.latest_charge
          : null;
      const refunded = charge?.amount_refunded ?? 0;
      if (refunded >= pi.amount) return "refunded";
      if (refunded > 0) return "released"; // partial refund = our settlement split
      return "held";
    }
    case "processing":
    case "requires_action":
    case "requires_confirmation":
    case "requires_capture":
    case "requires_payment_method":
      return "pending";
    case "canceled":
      return "refunded";
    default:
      return "failed";
  }
}
