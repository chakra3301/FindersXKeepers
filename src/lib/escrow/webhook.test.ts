import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import { handleWebhookRequest } from "./webhook";
import { STRIPE_API_VERSION } from "./stripe-client";
import { createFakeAdmin, type Tables } from "@/lib/test-support/fake-admin";

const WEBHOOK_SECRET = "whsec_test_secret";
const stripe = new Stripe("sk_test_dummy", { apiVersion: STRIPE_API_VERSION });

/** Wrap a Stripe event payload with a valid test signature. */
function signed(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
  return { rawBody: payload, signature };
}

function event(type: string, object: Record<string, unknown>) {
  return { id: `evt_${type}`, type, data: { object } };
}

function seedTables(): Tables {
  return {
    requests: [{ id: "r1", status: "open", created_at: "2026-01-01T00:00:00Z" }],
    payments: [
      {
        id: "p1",
        request_id: "r1",
        stripe_payment_intent_id: "pi_1",
        amount_jpy: 50_000,
        status: "pending",
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
  };
}

describe("handleWebhookRequest — checkout.session.completed", () => {
  it("confirms the hold (pending → held) and moves open → sourcing", async () => {
    const { tables, client } = createFakeAdmin(seedTables());
    const { rawBody, signature } = signed(
      event("checkout.session.completed", {
        metadata: { requestId: "r1" },
        payment_intent: "pi_1",
      }),
    );

    const res = await handleWebhookRequest({
      rawBody,
      signature,
      stripe,
      webhookSecret: WEBHOOK_SECRET,
      admin: client,
    });

    expect(res.status).toBe(200);
    expect(tables.payments[0].status).toBe("held");
    expect(tables.requests[0].status).toBe("sourcing");
  });

  it("is idempotent on re-delivery (stays held + sourcing, no throw)", async () => {
    const { tables, client } = createFakeAdmin(seedTables());
    const { rawBody, signature } = signed(
      event("checkout.session.completed", {
        metadata: { requestId: "r1" },
        payment_intent: "pi_1",
      }),
    );
    const deps = { rawBody, signature, stripe, webhookSecret: WEBHOOK_SECRET, admin: client };

    await handleWebhookRequest(deps);
    const second = await handleWebhookRequest(deps); // redelivery

    expect(second.status).toBe(200);
    expect(tables.payments[0].status).toBe("held");
    expect(tables.requests[0].status).toBe("sourcing");
  });

  it("upgrades a session-id placeholder to the real payment_intent id", async () => {
    const seed = seedTables();
    seed.payments[0].stripe_payment_intent_id = "cs_test_pending";
    const { tables, client } = createFakeAdmin(seed);
    const { rawBody, signature } = signed(
      event("checkout.session.completed", {
        metadata: { requestId: "r1" },
        payment_intent: "pi_1",
      }),
    );

    await handleWebhookRequest({
      rawBody,
      signature,
      stripe,
      webhookSecret: WEBHOOK_SECRET,
      admin: client,
    });

    expect(tables.payments[0].status).toBe("held");
    expect(tables.payments[0].stripe_payment_intent_id).toBe("pi_1");
  });
});

describe("handleWebhookRequest — signature + other events", () => {
  it("rejects a bad signature with 400 and writes nothing", async () => {
    const { tables, client } = createFakeAdmin(seedTables());
    const res = await handleWebhookRequest({
      rawBody: JSON.stringify(event("checkout.session.completed", {})),
      signature: "t=1,v1=deadbeef",
      stripe,
      webhookSecret: WEBHOOK_SECRET,
      admin: client,
    });
    expect(res.status).toBe(400);
    expect(tables.payments[0].status).toBe("pending");
    expect(tables.requests[0].status).toBe("open");
  });

  it("payment_intent.payment_failed marks the pending payment failed", async () => {
    const { tables, client } = createFakeAdmin(seedTables());
    const { rawBody, signature } = signed(
      event("payment_intent.payment_failed", { id: "pi_1" }),
    );
    await handleWebhookRequest({ rawBody, signature, stripe, webhookSecret: WEBHOOK_SECRET, admin: client });
    expect(tables.payments[0].status).toBe("failed");
  });

  it("charge.refunded fully reconciles to refunded with the split", async () => {
    const seed = seedTables();
    seed.payments[0].status = "held";
    const { tables, client } = createFakeAdmin(seed);
    const { rawBody, signature } = signed(
      event("charge.refunded", {
        payment_intent: "pi_1",
        amount: 50_000,
        amount_refunded: 50_000,
      }),
    );
    await handleWebhookRequest({ rawBody, signature, stripe, webhookSecret: WEBHOOK_SECRET, admin: client });
    expect(tables.payments[0].status).toBe("refunded");
    expect(tables.payments[0].captured_jpy).toBe(0);
    expect(tables.payments[0].refunded_jpy).toBe(50_000);
  });
});
