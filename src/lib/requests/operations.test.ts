import { describe, expect, it, vi } from "vitest";
import {
  depositForRequest,
  approveCandidate,
  keepHunting,
  shipApprovedOrder,
  releaseEscrow,
} from "./operations";
import { escrow } from "@/lib/escrow";
import { computeQuote, totalJpy, SHIPPING_ESTIMATE_JPY } from "@/lib/pricing";
import { createFakeAdmin, type Row } from "@/lib/test-support/fake-admin";

function baseRequest(over: Row = {}): Row {
  return {
    id: "req_seed",
    user_id: "u1",
    title: "Test request",
    status: "open",
    min_condition: "any",
    must_haves: [],
    nice_to_haves: [],
    budget_cap_jpy: 50_000,
    rush_tier: "standard",
    deadline_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

/* ---------------------------- tests ---------------------------- */
describe("depositForRequest", () => {
  it("creates a held payment sized to the cap estimate and moves open → sourcing", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ status: "open", budget_cap_jpy: 50_000 })],
      payments: [],
    });

    await depositForRequest("req_seed", "standard", client);

    const expected = totalJpy(
      computeQuote({ itemCostJpy: 50_000, shippingJpy: SHIPPING_ESTIMATE_JPY, rushTier: "standard" }),
    );
    expect(tables.requests[0].status).toBe("sourcing");
    expect(tables.payments).toHaveLength(1);
    expect(tables.payments[0].status).toBe("held");
    expect(tables.payments[0].amount_jpy).toBe(expected);
  });

  it("persists a changed rush tier before sizing the hold", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ status: "open", rush_tier: "standard" })],
      payments: [],
    });
    await depositForRequest("req_seed", "express", client);
    const expected = totalJpy(
      computeQuote({ itemCostJpy: 50_000, shippingJpy: SHIPPING_ESTIMATE_JPY, rushTier: "express" }),
    );
    expect(tables.requests[0].rush_tier).toBe("express");
    expect(tables.payments[0].amount_jpy).toBe(expected);
  });

  it("throws on any non-open request and writes nothing", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ status: "candidate_sent" })],
      payments: [],
    });
    await expect(depositForRequest("req_seed", "standard", client)).rejects.toThrow();
    expect(tables.payments).toHaveLength(0);
    expect(tables.requests[0].status).toBe("candidate_sent");
  });

  it("hosted payment (Stripe): returns checkoutUrl, leaves request open + payment pending", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ status: "open", budget_cap_jpy: 50_000 })],
      payments: [],
    });
    // Stand in for the Stripe provider: an async hold that needs hosted payment.
    const spy = vi.spyOn(escrow, "createHold").mockResolvedValue({
      paymentIntentId: "pi_stripe",
      amountJpy: 55_000,
      status: "pending",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test",
    });
    try {
      const result = await depositForRequest("req_seed", "standard", client);
      expect(result).toEqual({
        checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test",
      });
      // The webhook — not this call — advances the lifecycle.
      expect(tables.requests[0].status).toBe("open");
      expect(tables.payments).toHaveLength(1);
      expect(tables.payments[0].status).toBe("pending");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("approveCandidate", () => {
  it("locks a four-line order ≤ the hold and moves candidate_sent → approved", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "candidate_sent", budget_cap_jpy: 50_000, rush_tier: "standard" })],
      candidates: [{ id: "c1", request_id: "r1", price_jpy: 33_500, status: "proposed", created_at: "2026-01-02T00:00:00Z" }],
      orders: [],
    });

    await approveCandidate("r1", "c1", client);

    const order = tables.orders[0];
    const hold = totalJpy(computeQuote({ itemCostJpy: 50_000, shippingJpy: SHIPPING_ESTIMATE_JPY, rushTier: "standard" }));
    const expectedOrder = computeQuote({ itemCostJpy: 33_500, shippingJpy: SHIPPING_ESTIMATE_JPY, rushTier: "standard" });

    expect(order.item_cost_jpy).toBe(33_500);
    expect(order.finder_fee_jpy).toBe(expectedOrder.finderFeeJpy);
    expect(order.shipping_jpy).toBe(SHIPPING_ESTIMATE_JPY);
    expect(order.tax_jpy).toBe(expectedOrder.taxJpy);
    expect(order.total_jpy).toBe(totalJpy(expectedOrder));
    expect(order.total_jpy).toBeLessThanOrEqual(hold);
    expect(order.candidate_id).toBe("c1");
    expect(tables.candidates[0].status).toBe("approved");
    expect(tables.requests[0].status).toBe("approved");
  });

  it("throws on a non-candidate_sent request and writes no order", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "open" })],
      candidates: [{ id: "c1", request_id: "r1", price_jpy: 10_000, status: "proposed", created_at: "2026-01-02T00:00:00Z" }],
      orders: [],
    });
    await expect(approveCandidate("r1", "c1", client)).rejects.toThrow();
    expect(tables.orders).toHaveLength(0);
    expect(tables.candidates[0].status).toBe("proposed");
  });

  it("rejects an over-cap candidate and writes no order", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "candidate_sent", budget_cap_jpy: 30_000, rush_tier: "standard" })],
      candidates: [{ id: "c1", request_id: "r1", price_jpy: 41_000, status: "proposed", created_at: "2026-01-02T00:00:00Z" }],
      orders: [],
    });
    await expect(approveCandidate("r1", "c1", client)).rejects.toThrow();
    expect(tables.orders).toHaveLength(0);
    expect(tables.candidates[0].status).toBe("proposed");
    expect(tables.requests[0].status).toBe("candidate_sent");
  });
});

describe("keepHunting", () => {
  it("rejects the candidate and moves candidate_sent → sourcing", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "candidate_sent" })],
      candidates: [{ id: "c1", request_id: "r1", price_jpy: 10_000, status: "proposed", created_at: "2026-01-02T00:00:00Z" }],
    });
    await keepHunting("r1", "c1", client);
    expect(tables.candidates[0].status).toBe("rejected");
    expect(tables.requests[0].status).toBe("sourcing");
  });

  it("throws on a non-candidate_sent request", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "sourcing" })],
      candidates: [{ id: "c1", request_id: "r1", price_jpy: 10_000, status: "proposed", created_at: "2026-01-02T00:00:00Z" }],
    });
    await expect(keepHunting("r1", "c1", client)).rejects.toThrow();
    expect(tables.candidates[0].status).toBe("proposed");
  });
});

describe("shipApprovedOrder", () => {
  it("settles at the order total: captures it, returns the unused cap, ships", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "received" })],
      orders: [{ id: "o1", request_id: "r1", item_cost_jpy: 14_500, finder_fee_jpy: 1_500, shipping_jpy: 4_000, tax_jpy: 150, total_jpy: 20_150, created_at: "2026-01-03T00:00:00Z" }],
      shipments: [],
      payments: [{ id: "p1", request_id: "r1", stripe_payment_intent_id: "pi_test_held", amount_jpy: 30_000, status: "held", created_at: "2026-01-02T00:00:00Z" }],
    });

    await shipApprovedOrder("r1", client);

    expect(tables.shipments).toHaveLength(1);
    expect(tables.shipments[0].tracking_number).toContain("DEMO-");
    expect(tables.requests[0].status).toBe("shipped");
    expect(tables.payments[0].status).toBe("released");
    expect(tables.payments[0].captured_jpy).toBe(20_150); // released to us
    expect(tables.payments[0].refunded_jpy).toBe(9_850);   // returned to the customer
  });

  it("throws on a non-received request and releases nothing", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "approved" })],
      orders: [{ id: "o1", request_id: "r1", item_cost_jpy: 1, finder_fee_jpy: 1, shipping_jpy: 1, tax_jpy: 1, total_jpy: 4, created_at: "2026-01-03T00:00:00Z" }],
      shipments: [],
      payments: [{ id: "p1", request_id: "r1", stripe_payment_intent_id: "pi_test_held2", amount_jpy: 4, status: "held", created_at: "2026-01-02T00:00:00Z" }],
    });
    await expect(shipApprovedOrder("r1", client)).rejects.toThrow();
    expect(tables.shipments).toHaveLength(0);
    expect(tables.payments[0].status).toBe("held");
  });

  it("returns zero when the order equals the hold", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "received" })],
      orders: [{ id: "o1", request_id: "r1", item_cost_jpy: 16_000, finder_fee_jpy: 1_600, shipping_jpy: 4_000, tax_jpy: 160, total_jpy: 21_760, created_at: "2026-01-03T00:00:00Z" }],
      shipments: [],
      payments: [{ id: "p1", request_id: "r1", stripe_payment_intent_id: "pi_eq", amount_jpy: 21_760, status: "held", created_at: "2026-01-02T00:00:00Z" }],
    });
    await shipApprovedOrder("r1", client);
    expect(tables.payments[0].captured_jpy).toBe(21_760);
    expect(tables.payments[0].refunded_jpy).toBe(0);
  });
});

describe("releaseEscrow", () => {
  it("defaults to a full release when no capture amount is given", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "received" })],
      payments: [{ id: "p1", request_id: "r1", stripe_payment_intent_id: "pi_full", amount_jpy: 5_000, status: "held", created_at: "2026-01-02T00:00:00Z" }],
    });
    await releaseEscrow("r1", undefined, client);
    expect(tables.payments[0].status).toBe("released");
    expect(tables.payments[0].captured_jpy).toBe(5_000);
    expect(tables.payments[0].refunded_jpy).toBe(0);
  });
});
