import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { StripeEscrowProvider, mapPaymentIntentStatus } from "./stripe";

/* A minimal fake of the Stripe surface the provider touches. */
function fakeStripe(over: {
  session?: Partial<Stripe.Checkout.Session>;
  paymentIntent?: Partial<Stripe.PaymentIntent>;
} = {}) {
  const sessions = {
    create: vi.fn().mockResolvedValue({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
      payment_intent: "pi_test_1",
      ...over.session,
    }),
  };
  const paymentIntents = {
    retrieve: vi.fn().mockResolvedValue({
      id: "pi_test_1",
      amount: 50_000,
      status: "succeeded",
      latest_charge: null,
      ...over.paymentIntent,
    }),
  };
  const refunds = { create: vi.fn().mockResolvedValue({ id: "re_test_1" }) };

  const stripe = {
    checkout: { sessions },
    paymentIntents,
    refunds,
  } as unknown as Stripe;

  return { stripe, sessions, paymentIntents, refunds };
}

const SITE = "https://fk.example.com";

describe("StripeEscrowProvider.createHold", () => {
  it("creates a JPY Checkout session with the cap amount + metadata and returns pending + checkoutUrl", async () => {
    const { stripe, sessions } = fakeStripe();
    const provider = new StripeEscrowProvider(stripe, SITE);

    const intent = await provider.createHold({
      requestId: "req_1",
      amountJpy: 50_000,
      idempotencyKey: "idem_1",
    });

    expect(intent).toEqual({
      paymentIntentId: "pi_test_1",
      amountJpy: 50_000,
      status: "pending",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_1",
    });

    const [params, options] = sessions.create.mock.calls[0];
    expect(params.mode).toBe("payment");
    expect(params.metadata).toEqual({ requestId: "req_1" });
    expect(params.line_items[0].price_data.currency).toBe("jpy");
    // zero-decimal: passes through as-is, never ×100
    expect(params.line_items[0].price_data.unit_amount).toBe(50_000);
    expect(params.success_url).toBe(`${SITE}/requests/req_1?checkout=complete`);
    expect(params.cancel_url).toContain(`${SITE}/requests/req_1/checkout`);
    expect(options).toEqual({ idempotencyKey: "idem_1" });
  });

  it("reads the payment_intent id when Stripe returns it as an object", async () => {
    const { stripe } = fakeStripe({
      session: { payment_intent: { id: "pi_obj" } as Stripe.PaymentIntent },
    });
    const provider = new StripeEscrowProvider(stripe, SITE);
    const intent = await provider.createHold({ requestId: "r", amountJpy: 1000 });
    expect(intent.paymentIntentId).toBe("pi_obj");
  });

  it("falls back to the Checkout Session id when payment_intent is not yet available", async () => {
    const { stripe } = fakeStripe({
      session: { id: "cs_test_pending", payment_intent: null },
    });
    const provider = new StripeEscrowProvider(stripe, SITE);
    const intent = await provider.createHold({ requestId: "r", amountJpy: 1000 });
    expect(intent.paymentIntentId).toBe("cs_test_pending");
  });
});

describe("StripeEscrowProvider.release", () => {
  it("refunds (held − captured) and returns the split", async () => {
    const { stripe, refunds } = fakeStripe({
      paymentIntent: { amount: 50_000 },
    });
    const provider = new StripeEscrowProvider(stripe, SITE);

    const intent = await provider.release("pi_test_1", 36_300);

    expect(refunds.create).toHaveBeenCalledWith({
      payment_intent: "pi_test_1",
      amount: 13_700,
    });
    expect(intent).toMatchObject({
      status: "released",
      amountJpy: 50_000,
      capturedJpy: 36_300,
      refundedJpy: 13_700,
    });
  });

  it("captures the full hold and issues no refund when no amount is given", async () => {
    const { stripe, refunds } = fakeStripe({ paymentIntent: { amount: 20_000 } });
    const provider = new StripeEscrowProvider(stripe, SITE);

    const intent = await provider.release("pi_test_1");

    expect(refunds.create).not.toHaveBeenCalled();
    expect(intent.capturedJpy).toBe(20_000);
    expect(intent.refundedJpy).toBe(0);
  });

  it("clamps a capture larger than the hold", async () => {
    const { stripe, refunds } = fakeStripe({ paymentIntent: { amount: 10_000 } });
    const provider = new StripeEscrowProvider(stripe, SITE);

    const intent = await provider.release("pi_test_1", 999_999);

    expect(refunds.create).not.toHaveBeenCalled();
    expect(intent.capturedJpy).toBe(10_000);
    expect(intent.refundedJpy).toBe(0);
  });
});

describe("StripeEscrowProvider.resumeCheckout", () => {
  it("returns the session url when the checkout session is still open", async () => {
    const retrieve = vi.fn().mockResolvedValue({
      id: "cs_test_open",
      status: "open",
      url: "https://checkout.stripe.com/c/pay/cs_test_open",
    });
    const stripe = {
      checkout: { sessions: { create: vi.fn(), retrieve } },
      paymentIntents: { retrieve: vi.fn() },
      refunds: { create: vi.fn() },
    } as unknown as Stripe;
    const provider = new StripeEscrowProvider(stripe, SITE);

    const url = await provider.resumeCheckout("cs_test_open");

    expect(url).toBe("https://checkout.stripe.com/c/pay/cs_test_open");
    expect(retrieve).toHaveBeenCalledWith("cs_test_open");
  });

  it("returns undefined for expired sessions or non-session refs", async () => {
    const retrieve = vi.fn().mockResolvedValue({
      id: "cs_test_expired",
      status: "expired",
      url: "https://checkout.stripe.com/c/pay/cs_test_expired",
    });
    const stripe = {
      checkout: { sessions: { create: vi.fn(), retrieve } },
      paymentIntents: { retrieve: vi.fn() },
      refunds: { create: vi.fn() },
    } as unknown as Stripe;
    const provider = new StripeEscrowProvider(stripe, SITE);

    expect(await provider.resumeCheckout("cs_test_expired")).toBeUndefined();
    expect(await provider.resumeCheckout("pi_test_1")).toBeUndefined();
  });
});

describe("StripeEscrowProvider.refund", () => {
  it("issues a full refund and returns refunded", async () => {
    const { stripe, refunds } = fakeStripe({ paymentIntent: { amount: 41_000 } });
    const provider = new StripeEscrowProvider(stripe, SITE);

    const intent = await provider.refund("pi_test_1");

    expect(refunds.create).toHaveBeenCalledWith({ payment_intent: "pi_test_1" });
    expect(intent).toMatchObject({
      status: "refunded",
      amountJpy: 41_000,
      capturedJpy: 0,
      refundedJpy: 41_000,
    });
  });
});

describe("mapPaymentIntentStatus", () => {
  const pi = (over: Partial<Stripe.PaymentIntent>) =>
    ({ amount: 50_000, status: "succeeded", latest_charge: null, ...over }) as Stripe.PaymentIntent;

  it("succeeded with no refund → held", () => {
    expect(mapPaymentIntentStatus(pi({}))).toBe("held");
  });
  it("succeeded with a partial refund → released", () => {
    expect(
      mapPaymentIntentStatus(
        pi({ latest_charge: { amount_refunded: 13_700 } as Stripe.Charge }),
      ),
    ).toBe("released");
  });
  it("succeeded fully refunded → refunded", () => {
    expect(
      mapPaymentIntentStatus(
        pi({ latest_charge: { amount_refunded: 50_000 } as Stripe.Charge }),
      ),
    ).toBe("refunded");
  });
  it("requires_payment_method → pending", () => {
    expect(mapPaymentIntentStatus(pi({ status: "requires_payment_method" }))).toBe("pending");
  });
  it("canceled → refunded", () => {
    expect(mapPaymentIntentStatus(pi({ status: "canceled" }))).toBe("refunded");
  });
});
