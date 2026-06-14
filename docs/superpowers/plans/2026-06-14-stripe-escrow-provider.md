# Real Stripe Escrow Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the real `StripeEscrowProvider` + webhook route behind the existing `src/lib/escrow` seam (plain Stripe, capture-now/refund-difference, Checkout redirect, webhook-confirmed holds), fully unit-tested without Stripe keys; live test-mode smoke test deferred to circle-back.

**Architecture:** A `StripeEscrowProvider` takes an **injected** Stripe client so it's unit-testable with a mock. Holds are created as Stripe Checkout Sessions (redirect); the hold is confirmed asynchronously by a webhook that maps the Stripe event → `payments` row + `open→sourcing`. `release` becomes a Stripe refund of the unused cap. The stub stays the default; `ESCROW_PROVIDER=stripe` flips the whole app over with no other code change. Webhook signature-verify and event-handling are split into two unit-testable functions.

**Tech Stack:** Next.js 16 (App Router, route handler) + TS strict · `stripe` Node SDK · Supabase (service-role admin client for webhooks) · Vitest (mocked Stripe client + `webhooks.generateTestHeaderString`).

**Spec:** `docs/superpowers/specs/2026-06-14-stripe-escrow-provider-design.md`

---

## File structure

**New files:**
- `src/lib/escrow/stripe.ts` — `StripeEscrowProvider` (injected `Stripe` client + `siteUrl`) + `createStripeClient()` / `getSiteUrl()` helpers.
- `src/lib/escrow/stripe.test.ts` — provider unit tests (mock client).
- `src/lib/escrow/stripe-webhook.ts` — `verifyStripeEvent(rawBody, signature, stripe, secret)` + `handleStripeEvent(event, admin)`.
- `src/lib/escrow/stripe-webhook.test.ts` — handler tests (fake admin) + signature-verify tests (`generateTestHeaderString`).
- `src/app/api/stripe/webhook/route.ts` — thin POST glue (raw body → verify → handle).

**Modified files:**
- `src/lib/escrow/types.ts` — `EscrowIntent.checkoutUrl?`.
- `src/lib/escrow/index.ts` — `stripe` factory case returns the real provider.
- `src/lib/requests/operations.ts` — `createEscrowHold` returns the intent + reuse-held guard; `depositForRequest` returns `{ checkoutUrl? }`.
- `src/app/(app)/requests/[id]/checkout/actions.ts` — redirect to `checkoutUrl` when present.
- `src/app/(app)/requests/[id]/checkout/checkout-form.tsx` — real-charge copy.
- `src/app/(app)/requests/[id]/page.tsx` — "Confirming your payment…" return state.
- `.env.example` — `NEXT_PUBLIC_SITE_URL`.
- `package.json` — `stripe` dependency.

**Default-path safety:** Every change is behind `ESCROW_PROVIDER`. With the stub (default), `createHold` returns no `checkoutUrl`, so `depositForRequest` stays synchronous and the existing 40 tests are unaffected.

---

## Task 1: Add the Stripe SDK, the `checkoutUrl` field, and the site-URL config

**Files:**
- Modify: `package.json` (via npm), `src/lib/escrow/types.ts`, `.env.example`
- Create: (helpers added in `src/lib/escrow/stripe.ts` in Task 2; here only the dep + interface + env)

- [ ] **Step 1: Install the Stripe Node SDK**

Run: `npm install stripe`
Expected: `stripe` added to `dependencies` in `package.json`; lockfile updated.

- [ ] **Step 2: Add `checkoutUrl` to `EscrowIntent`**

In `src/lib/escrow/types.ts`, extend `EscrowIntent` (keep the existing fields and doc comment):
```ts
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
```

- [ ] **Step 3: Document `NEXT_PUBLIC_SITE_URL` in `.env.example`**

In `.env.example`, under the Stripe block, add:
```bash
# App base URL for Stripe redirect targets (success/cancel). Dev default below.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: clean (the new optional field breaks nothing; the stub doesn't set it).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/escrow/types.ts .env.example
git commit -m "feat(escrow): add stripe SDK, EscrowIntent.checkoutUrl, site-url env

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `StripeEscrowProvider` (TDD, mocked client)

**Files:**
- Create: `src/lib/escrow/stripe.ts`, `src/lib/escrow/stripe.test.ts`

> The provider takes an injected `Stripe` client so tests pass a mock — no keys, no network. JPY is zero-decimal: amounts pass through as-is.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/escrow/stripe.test.ts
import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { StripeEscrowProvider } from "./stripe";

function fakeStripe(over: Record<string, unknown> = {}): Stripe {
  return {
    checkout: {
      sessions: {
        create: vi.fn(async () => ({
          id: "cs_test_1",
          url: "https://checkout.stripe.com/c/pay/cs_test_1",
          payment_intent: "pi_test_1",
        })),
      },
    },
    paymentIntents: {
      retrieve: vi.fn(async () => ({
        id: "pi_test_1",
        amount: 50_000,
        status: "succeeded",
        amount_refunded: 0,
        latest_charge: { amount: 50_000, amount_refunded: 0 },
      })),
    },
    refunds: { create: vi.fn(async () => ({ id: "re_1" })) },
    ...over,
  } as unknown as Stripe;
}

describe("StripeEscrowProvider.createHold", () => {
  it("creates a JPY Checkout Session and returns a pending intent + redirect URL", async () => {
    const stripe = fakeStripe();
    const p = new StripeEscrowProvider(stripe, "http://localhost:3000");
    const intent = await p.createHold({ requestId: "r1", amountJpy: 50_000 });

    const createArgs = (stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArgs.mode).toBe("payment");
    expect(createArgs.line_items[0].price_data.currency).toBe("jpy");
    expect(createArgs.line_items[0].price_data.unit_amount).toBe(50_000); // zero-decimal, NOT *100
    expect(createArgs.metadata.requestId).toBe("r1");
    expect(createArgs.success_url).toContain("/requests/r1");
    expect(intent).toMatchObject({
      paymentIntentId: "pi_test_1",
      amountJpy: 50_000,
      status: "pending",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_1",
    });
  });
});

describe("StripeEscrowProvider.release", () => {
  it("refunds the unused cap and returns the split", async () => {
    const stripe = fakeStripe();
    const p = new StripeEscrowProvider(stripe, "http://localhost:3000");
    const intent = await p.release("pi_test_1", 36_300); // held 50_000

    expect((stripe.refunds.create as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      payment_intent: "pi_test_1",
      amount: 13_700,
    });
    expect(intent).toMatchObject({ status: "released", capturedJpy: 36_300, refundedJpy: 13_700 });
  });

  it("does not refund when capturing the full hold", async () => {
    const stripe = fakeStripe();
    const p = new StripeEscrowProvider(stripe, "http://localhost:3000");
    const intent = await p.release("pi_test_1"); // no captureJpy → full
    expect((stripe.refunds.create as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect(intent).toMatchObject({ status: "released", capturedJpy: 50_000, refundedJpy: 0 });
  });
});

describe("StripeEscrowProvider.refund", () => {
  it("issues a full refund", async () => {
    const stripe = fakeStripe();
    const p = new StripeEscrowProvider(stripe, "http://localhost:3000");
    const intent = await p.refund("pi_test_1");
    expect((stripe.refunds.create as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      payment_intent: "pi_test_1",
    });
    expect(intent.status).toBe("refunded");
  });
});

describe("StripeEscrowProvider.getStatus", () => {
  it("maps a fully-refunded (still succeeded) charge to refunded", async () => {
    const stripe = fakeStripe({
      paymentIntents: {
        retrieve: vi.fn(async () => ({
          id: "pi_test_1",
          status: "succeeded",
          amount: 50_000,
          latest_charge: { amount: 50_000, amount_refunded: 50_000 },
        })),
      },
    });
    const p = new StripeEscrowProvider(stripe, "http://localhost:3000");
    expect(await p.getStatus("pi_test_1")).toBe("refunded");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/escrow/stripe.test.ts`
Expected: FAIL — `./stripe` / `StripeEscrowProvider` not found.

- [ ] **Step 3: Implement the provider**

```ts
// src/lib/escrow/stripe.ts
import Stripe from "stripe";
import type { PaymentStatus } from "@/lib/db/types";
import type { CreateHoldParams, EscrowIntent, EscrowProvider } from "./types";
import { readStripeEnv } from "./stripe-env";

/**
 * Real escrow backed by plain Stripe (test mode). Capture-now / refund-difference:
 * createHold charges the cap via a Checkout Session (confirmed async by webhook);
 * release refunds the unused cap; refund refunds in full. JPY is zero-decimal —
 * amounts pass through as-is. The Stripe client is injected for testability.
 */
export class StripeEscrowProvider implements EscrowProvider {
  readonly name = "stripe";

  constructor(
    private readonly stripe: Stripe,
    private readonly siteUrl: string,
  ) {}

  async createHold(params: CreateHoldParams): Promise<EscrowIntent> {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "jpy",
              unit_amount: params.amountJpy, // zero-decimal: no *100
              product_data: { name: "Finders Keepers escrow deposit" },
            },
          },
        ],
        metadata: { requestId: params.requestId },
        payment_intent_data: { metadata: { requestId: params.requestId } },
        success_url: `${this.siteUrl}/requests/${params.requestId}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.siteUrl}/requests/${params.requestId}?checkout=cancelled`,
      },
      params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined,
    );

    // payment_intent may be a string id or an expanded object; normalize to the id.
    const pi = session.payment_intent;
    const paymentIntentId = typeof pi === "string" ? pi : (pi?.id ?? session.id);

    return {
      paymentIntentId,
      amountJpy: params.amountJpy,
      status: "pending",
      checkoutUrl: session.url ?? undefined,
    };
  }

  async release(paymentIntentId: string, captureJpy?: number): Promise<EscrowIntent> {
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
    await this.stripe.refunds.create({ payment_intent: paymentIntentId });
    return { paymentIntentId, amountJpy: 0, status: "refunded" };
  }

  async getStatus(paymentIntentId: string): Promise<PaymentStatus> {
    const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    if (pi.status !== "succeeded") {
      return pi.status === "canceled" ? "failed" : "pending";
    }
    // A refund does NOT change PI status — inspect the charge's refund total.
    const charge = pi.latest_charge as Stripe.Charge | null;
    const amount = charge?.amount ?? pi.amount;
    const refunded = charge?.amount_refunded ?? 0;
    if (refunded === 0) return "held";
    if (refunded >= amount) return "refunded";
    return "released";
  }
}

/** Construct the real Stripe client (pinned API version) from env. */
export function createStripeClient(): Stripe {
  const { secretKey } = readStripeEnv();
  // Pin apiVersion to the installed SDK's version (tsc enforces a valid literal;
  // resolve the exact string from `node_modules/stripe` types when implementing).
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
}

/** Pinned to the installed stripe-node release — see Step 3 note. */
export const STRIPE_API_VERSION = "__SET_TO_INSTALLED_SDK_VERSION__" as Stripe.LatestApiVersion;

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
```
> **API-version note:** replace `"__SET_TO_INSTALLED_SDK_VERSION__"` with the exact version the installed SDK pins (e.g. open `node_modules/stripe/types/lib.d.ts` / the SDK's `LatestApiVersion` literal). `tsc` will reject an invalid string, so this is verifiable at typecheck. If `Stripe.LatestApiVersion` is exported by the installed version, use `apiVersion: undefined`-free construction with that literal directly.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/escrow/stripe.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean (this confirms the pinned `apiVersion` literal and the SDK call shapes).

- [ ] **Step 6: Commit**

```bash
git add src/lib/escrow/stripe.ts src/lib/escrow/stripe.test.ts
git commit -m "feat(escrow): StripeEscrowProvider (checkout hold, refund-difference release)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Webhook event handler (TDD, fake admin)

**Files:**
- Create: `src/lib/escrow/stripe-webhook.ts` (the `handleStripeEvent` half), `src/lib/escrow/stripe-webhook.test.ts`

> `handleStripeEvent(event, admin)` is the reconciliation logic — pure DB work against the injected admin client. Idempotent by matching the payment row on `stripe_payment_intent_id` and guarding status transitions.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/escrow/stripe-webhook.test.ts
import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { handleStripeEvent } from "./stripe-webhook";

// Minimal fake admin reused from operations.test patterns: stores rows, supports
// from().select().eq().maybeSingle()/single(), update().eq(), and the requests
// status path used by setRequestStatus.
type Row = Record<string, unknown>;
function createFakeAdmin(seed: Record<string, Row[]>) {
  const tables = JSON.parse(JSON.stringify(seed)) as Record<string, Row[]>;
  function from(table: string) {
    tables[table] ??= [];
    let op: "select" | "update" = "select";
    let payload: Row | null = null;
    const filters: [string, unknown][] = [];
    const builder = {
      select() { return builder; },
      update(p: Row) { op = "update"; payload = p; return builder; },
      eq(c: string, v: unknown) { filters.push([c, v]); return builder; },
      order() { return builder; },
      limit() { return builder; },
      match() { return tables[table].filter((r) => filters.every(([c, v]) => r[c] === v)); },
      run() {
        const m = builder.match();
        if (op === "update") { m.forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; }
        return { data: m, error: null };
      },
      single() { const r = builder.match()[0]; return Promise.resolve(r ? { data: r, error: null } : { data: null, error: { message: "no rows" } }); },
      maybeSingle() { return Promise.resolve({ data: builder.match()[0] ?? null, error: null }); },
      then(res: (v: unknown) => void) { res(builder.run()); },
    };
    return builder;
  }
  return { tables, client: { from } as never };
}

function checkoutCompleted(requestId: string, pi: string): Stripe.Event {
  return {
    id: "evt_1",
    type: "checkout.session.completed",
    data: { object: { metadata: { requestId }, payment_intent: pi } },
  } as unknown as Stripe.Event;
}

describe("handleStripeEvent: checkout.session.completed", () => {
  it("marks the pending payment held and moves open → sourcing", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [{ id: "r1", status: "open" }],
      payments: [{ id: "p1", request_id: "r1", stripe_payment_intent_id: "pi_1", amount_jpy: 50_000, status: "pending" }],
    });
    await handleStripeEvent(checkoutCompleted("r1", "pi_1"), client);
    expect(tables.payments[0].status).toBe("held");
    expect(tables.requests[0].status).toBe("sourcing");
  });

  it("is idempotent on redelivery (already sourcing → no-op, no throw)", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [{ id: "r1", status: "sourcing" }],
      payments: [{ id: "p1", request_id: "r1", stripe_payment_intent_id: "pi_1", amount_jpy: 50_000, status: "held" }],
    });
    await handleStripeEvent(checkoutCompleted("r1", "pi_1"), client);
    expect(tables.payments[0].status).toBe("held");
    expect(tables.requests[0].status).toBe("sourcing");
  });
});

describe("handleStripeEvent: payment_intent.payment_failed", () => {
  it("marks the payment failed", async () => {
    const { tables, client } = createFakeAdmin({
      payments: [{ id: "p1", request_id: "r1", stripe_payment_intent_id: "pi_1", amount_jpy: 50_000, status: "pending" }],
    });
    const ev = { id: "evt_2", type: "payment_intent.payment_failed", data: { object: { id: "pi_1" } } } as unknown as Stripe.Event;
    await handleStripeEvent(ev, client);
    expect(tables.payments[0].status).toBe("failed");
  });
});

describe("handleStripeEvent: unknown event", () => {
  it("ignores unrelated events without throwing", async () => {
    const { client } = createFakeAdmin({ payments: [] });
    const ev = { id: "evt_x", type: "customer.created", data: { object: {} } } as unknown as Stripe.Event;
    await expect(handleStripeEvent(ev, client)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/escrow/stripe-webhook.test.ts`
Expected: FAIL — `handleStripeEvent` not exported.

- [ ] **Step 3: Implement the handler**

```ts
// src/lib/escrow/stripe-webhook.ts
import Stripe from "stripe";
import type { AdminClient } from "@/lib/supabase/admin";
import { setRequestStatus } from "@/lib/requests/operations";

/** Normalize a Stripe `payment_intent` field (string | object | null) to its id. */
function piId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    return String((value as { id: unknown }).id);
  }
  return null;
}

/**
 * Reconcile a verified Stripe event into our DB. Idempotent: payment rows are
 * matched by the unique `stripe_payment_intent_id`, and status transitions are
 * guarded (only `open` advances to `sourcing`), so webhook redelivery is a no-op.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  admin: AdminClient,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const requestId = session.metadata?.requestId;
      const intentId = piId(session.payment_intent);
      if (!requestId || !intentId) return;

      // Mark the matching pending payment held (idempotent if already held).
      await admin
        .from("payments")
        .update({ status: "held" })
        .eq("stripe_payment_intent_id", intentId);

      // Advance only from open (redelivery / already-sourcing → no-op).
      const { data: req } = await admin
        .from("requests")
        .select("status")
        .eq("id", requestId)
        .maybeSingle();
      if (req?.status === "open") {
        await setRequestStatus(requestId, "sourcing", admin);
      }
      return;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await admin
        .from("payments")
        .update({ status: "failed" })
        .eq("stripe_payment_intent_id", pi.id);
      return;
    }
    default:
      // Other events (incl. refund reconciliation, which releaseEscrow already
      // writes synchronously) are ignored here.
      return;
  }
}
```
> Note: this imports `setRequestStatus` from `operations.ts`. `operations.ts` imports `escrow` from `./index`, which can construct the Stripe client — but only lazily when `ESCROW_PROVIDER=stripe`. No import cycle issue at module load for the stub default; verify typecheck stays clean.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/escrow/stripe-webhook.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/escrow/stripe-webhook.ts src/lib/escrow/stripe-webhook.test.ts
git commit -m "feat(escrow): idempotent Stripe webhook event handler

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Signature verification + webhook route (TDD for verify)

**Files:**
- Modify: `src/lib/escrow/stripe-webhook.ts` (add `verifyStripeEvent`), `src/lib/escrow/stripe-webhook.test.ts`
- Create: `src/app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Write the failing signature-verify tests**

Append to `src/lib/escrow/stripe-webhook.test.ts`:
```ts
import Stripe from "stripe";
import { verifyStripeEvent } from "./stripe-webhook";

describe("verifyStripeEvent", () => {
  // generateTestHeaderString + constructEvent are pure crypto — no keys/network.
  const stripe = new Stripe("sk_test_dummy", { apiVersion: STRIPE_API_VERSION });
  const secret = "whsec_test_secret";
  const payload = JSON.stringify({ id: "evt_ok", object: "event", type: "checkout.session.completed", data: { object: {} } });

  it("parses a correctly-signed payload", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = verifyStripeEvent(payload, header, stripe, secret);
    expect(event.id).toBe("evt_ok");
  });

  it("throws on a tampered signature", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(() => verifyStripeEvent(payload + "x", header, stripe, secret)).toThrow();
  });
});
```
Add the import for `STRIPE_API_VERSION` at the top of the test file:
```ts
import { STRIPE_API_VERSION } from "./stripe";
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/escrow/stripe-webhook.test.ts`
Expected: FAIL — `verifyStripeEvent` not exported.

- [ ] **Step 3: Implement `verifyStripeEvent`**

Add to `src/lib/escrow/stripe-webhook.ts`:
```ts
/**
 * Verify a Stripe webhook signature and return the typed event. Throws if the
 * signature is invalid (caller maps that to HTTP 400). Pure crypto — no network.
 */
export function verifyStripeEvent(
  rawBody: string,
  signature: string,
  stripe: Stripe,
  webhookSecret: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/escrow/stripe-webhook.test.ts`
Expected: PASS (4 handler + 2 verify = 6 tests).

- [ ] **Step 5: Write the webhook route (thin glue)**

```ts
// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readStripeEnv } from "@/lib/escrow/stripe-env";
import { createStripeClient } from "@/lib/escrow/stripe";
import { verifyStripeEvent, handleStripeEvent } from "@/lib/escrow/stripe-webhook";

// Stripe requires the raw body for signature verification.
export async function POST(req: Request): Promise<Response> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = createStripeClient();
  const { webhookSecret } = readStripeEnv();

  let event;
  try {
    event = verifyStripeEvent(rawBody, signature, stripe, webhookSecret);
  } catch (e) {
    return NextResponse.json(
      { error: `signature verification failed: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  await handleStripeEvent(event, createAdminClient());
  return NextResponse.json({ received: true });
}
```

- [ ] **Step 6: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: clean; the route `ƒ /api/stripe/webhook` appears in the build output.

- [ ] **Step 7: Commit**

```bash
git add src/lib/escrow/stripe-webhook.ts src/lib/escrow/stripe-webhook.test.ts "src/app/api/stripe/webhook/route.ts"
git commit -m "feat(escrow): Stripe webhook route + signature verification

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Wire the seam + async deposit flow

**Files:**
- Modify: `src/lib/escrow/index.ts`, `src/lib/requests/operations.ts`, `src/app/(app)/requests/[id]/checkout/actions.ts`, `src/lib/requests/operations.test.ts`

- [ ] **Step 1: Update the failing/asserting tests for the new shapes**

In `src/lib/requests/operations.test.ts`, the `depositForRequest` happy-path tests await `depositForRequest(...)` and assert on `tables`. The return type changes to `{ checkoutUrl?: string }`; existing tests ignore the return so they still pass. ADD one test (inside the `depositForRequest` describe) asserting the stub returns no URL and still transitions:
```ts
  it("returns no checkoutUrl on the stub path and transitions to sourcing", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ status: "open", budget_cap_jpy: 50_000 })],
      payments: [],
    });
    const result = await depositForRequest("req_seed", "standard", client);
    expect(result).toEqual({});
    expect(tables.requests[0].status).toBe("sourcing");
    expect(tables.payments[0].status).toBe("held");
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/requests/operations.test.ts`
Expected: FAIL — `depositForRequest` returns `undefined`, not `{}` (the new test fails until Step 4).

- [ ] **Step 3: Wire the factory**

In `src/lib/escrow/index.ts`, replace the `stripe` case throw:
```ts
    case "stripe": {
      const { StripeEscrowProvider, createStripeClient, getSiteUrl } =
        require("./stripe") as typeof import("./stripe");
      return new StripeEscrowProvider(createStripeClient(), getSiteUrl());
    }
```
> Use a lazy `require` inside the case (not a top-level import) so the Stripe client is only constructed — and env only required — when `ESCROW_PROVIDER=stripe`. The stub default never touches Stripe. If the project's lint forbids `require`, use a top-level `import { StripeEscrowProvider, createStripeClient, getSiteUrl } from "./stripe"` and accept that importing `index.ts` references the module (construction still only happens in the `stripe` branch); verify lint/typecheck and prefer whichever passes.

- [ ] **Step 4: `createEscrowHold` returns the intent (+ reuse-held guard); `depositForRequest` returns `{ checkoutUrl? }`**

In `src/lib/requests/operations.ts`, change `createEscrowHold` to return the intent and skip a duplicate hold when one already exists:
```ts
/** Create an escrow hold for a request and record the payment row. Returns the
 *  provider intent (carries checkoutUrl for hosted-payment providers). If a
 *  non-failed hold already exists for the request, returns it without creating a
 *  second capture (idempotent re-deposit). */
export async function createEscrowHold(
  requestId: string,
  lines: PriceLines,
  admin: AdminClient = createAdminClient(),
): Promise<EscrowIntent> {
  const amountJpy = totalJpy(lines);

  // Don't double-charge: if a held payment already exists, reuse it.
  const { data: existing } = await admin
    .from("payments")
    .select("*")
    .eq("request_id", requestId)
    .eq("status", "held")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.stripe_payment_intent_id) {
    return {
      paymentIntentId: existing.stripe_payment_intent_id,
      amountJpy: existing.amount_jpy,
      status: "held",
    };
  }

  const intent = await escrow.createHold({
    requestId,
    amountJpy,
    idempotencyKey: `deposit_${requestId}_${amountJpy}`,
  });
  const { error } = await admin.from("payments").insert({
    request_id: requestId,
    stripe_payment_intent_id: intent.paymentIntentId,
    amount_jpy: amountJpy,
    status: intent.status,
  });
  if (error) throw error;
  return intent;
}
```
Add the `EscrowIntent` type import at the top of `operations.ts` (extend the existing escrow import):
```ts
import { escrow } from "@/lib/escrow";
import type { EscrowIntent } from "@/lib/escrow";
```
Then change `depositForRequest`'s tail (replace lines that currently call `createEscrowHold` + `setRequestStatus`) and its return type:
```ts
export async function depositForRequest(
  requestId: string,
  rushTier: RushTier,
  admin: AdminClient = createAdminClient(),
): Promise<{ checkoutUrl?: string }> {
  // ... unchanged: load req, open-guard, persist rush, build `lines` ...

  const intent = await createEscrowHold(requestId, lines, admin);
  if (intent.checkoutUrl) {
    // Hosted payment (Stripe): the webhook flips held + open→sourcing once paid.
    return { checkoutUrl: intent.checkoutUrl };
  }
  // Synchronous hold (stub): funds are held now, start sourcing immediately.
  await setRequestStatus(requestId, "sourcing", admin);
  return {};
}
```
Confirm `EscrowIntent` is re-exported from `@/lib/escrow` (it is: `export type { ... EscrowIntent ... } from "./types"` in `index.ts`).

- [ ] **Step 5: Redirect to Stripe in the checkout action**

In `src/app/(app)/requests/[id]/checkout/actions.ts`, replace the deposit call + redirect. `redirect()` must stay outside the try/catch; an absolute `checkoutUrl` redirects off-site:
```ts
  let checkoutUrl: string | undefined;
  try {
    ({ checkoutUrl } = await depositForRequest(requestId, rushTier));
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  revalidatePath("/dashboard");
  redirect(checkoutUrl ?? `/requests/${requestId}`);
```

- [ ] **Step 6: Run the tests + typecheck + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all green (40 prior + Task 2/3/4 unit tests + the 1 new deposit test). Stub-path tests unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/lib/escrow/index.ts src/lib/requests/operations.ts "src/app/(app)/requests/[id]/checkout/actions.ts" src/lib/requests/operations.test.ts
git commit -m "feat(escrow): wire Stripe provider + async checkout redirect flow

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Honest UI — real-charge copy + "confirming" return state

**Files:**
- Modify: `src/app/(app)/requests/[id]/checkout/checkout-form.tsx`, `src/app/(app)/requests/[id]/page.tsx`

- [ ] **Step 1: Real-charge checkout copy**

In `src/app/(app)/requests/[id]/checkout/checkout-form.tsx`, replace the explainer paragraph text (keep the `<p>`/`<strong>` markup) so it states a real charge:
```tsx
        We charge your budget cap now and hold it through your hunt. When your
        item ships we settle up: you&apos;re charged only the real four-line total
        and the unused part of your cap is <strong>returned to you</strong>. If we
        can&apos;t find it by your deadline, you&apos;re refunded in full.
```
Also update the authorise checkbox label if it says "hold … in escrow" to "charge … and hold it in escrow" so it matches a real charge. Keep the four-line estimate, the local-currency line, and the rush selector unchanged.

- [ ] **Step 2: "Confirming your payment…" return state on the detail page**

In `src/app/(app)/requests/[id]/page.tsx`, the page already computes `escrowState` and `request`. Add a `searchParams` read and a confirming banner. Change the signature to accept `searchParams`:
```tsx
export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string; checkout?: string }>;
}) {
  const { id } = await params;
  const { session_id, checkout } = await searchParams;
  // ... existing detail fetch ...
```
Then, right after the action banner block, add a confirming banner that shows when the customer just returned from Stripe but the webhook hasn't landed yet (payment still `pending`, or a success redirect while not yet funded):
```tsx
      {(session_id || escrowState === "pending") &&
        escrowState !== "held" &&
        escrowState !== "released" && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-[13.5px]">
            <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Confirming your payment… your escrow will show as held in a moment.
          </div>
        )}
      {checkout === "cancelled" && escrowState === "none" && (
        <div className="mt-6 rounded-2xl border border-warning-border bg-warning-muted px-5 py-4 text-[13.5px] text-warning">
          Checkout was cancelled — your hunt isn&apos;t funded yet. You can deposit again below.
        </div>
      )}
```
The existing deposit CTA (shown when `status === "open" && escrowState === "none"`) is correctly suppressed once a `pending` payment exists, so a paid-but-confirming request never shows "deposit" — satisfying the #5 guard.

- [ ] **Step 3: Typecheck + build + honesty grep**

Run: `npm run typecheck && npm run build`
Expected: clean.
Run: `grep -rn "isn't a charge\|it isn’t a charge" "src/app/(app)/requests/[id]/checkout/"`
Expected: no match (the old "not a charge" wording is gone — it IS a charge now).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/requests/[id]/checkout/checkout-form.tsx" "src/app/(app)/requests/[id]/page.tsx"
git commit -m "feat(escrow): real-charge checkout copy + confirming return state

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Done-criteria verification (no-keys) + defer live smoke test

**Files:** none (verification only)

> REQUIRED SKILL: superpowers:verification-before-completion.

- [ ] **Step 1: Full gate (no Stripe keys)**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: tests green (40 + ~11 new Stripe unit tests), typecheck/lint/build clean — all WITHOUT any Stripe keys (stub stays default; provider/webhook tested via mock + `generateTestHeaderString`).

- [ ] **Step 2: Default-path safety check**

Confirm by reading: with `ESCROW_PROVIDER` unset/`stub`, `index.ts` never constructs the Stripe client, `depositForRequest` returns `{}` and transitions to sourcing synchronously, and the 40 pre-existing tests are unchanged. Grep `grep -rn "createStripeClient" src` → only the factory `stripe` case + the webhook route reference it (never at stub module-load).

- [ ] **Step 3: Document the deferred live smoke test**

Append a "Live verification (pending Stripe keys)" checklist to `docs/stripe-setup.md`: set `ESCROW_PROVIDER=stripe` + keys in `.env.local`; `stripe listen --forward-to localhost:3000/api/stripe/webhook`; `npm run dev`; create a request → checkout → pay `4242…` → confirm webhook flips held + sourcing; approve a cheaper candidate → ship → confirm a real partial refund (difference) in the Stripe dashboard; cancel/refund path → full refund. Record this is the ONLY remaining Effort-2 step and it needs account access.

- [ ] **Step 4: Final commit (if doc updated)**

```bash
git add docs/stripe-setup.md
git commit -m "docs(stripe): live test-mode smoke-test checklist (deferred to circle-back)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review notes (author)

- **Spec coverage:** interface `checkoutUrl` (T1) · provider createHold/release/refund/getStatus (T2) · webhook handler + idempotency-by-PI-id (T3) · signature verify + route (T4) · factory + async `depositForRequest`/`createEscrowHold` reuse-held + checkout redirect (T5) · real-charge copy + confirming return state (T6, the user's spec refinements) · no-keys gate + deferred live test (T7). Plain-Stripe/capture-now/zero-decimal all reflected.
- **Type/name consistency:** `EscrowIntent.checkoutUrl`, `StripeEscrowProvider(stripe, siteUrl)`, `createStripeClient()`, `getSiteUrl()`, `STRIPE_API_VERSION`, `verifyStripeEvent(rawBody, signature, stripe, webhookSecret)`, `handleStripeEvent(event, admin)`, `depositForRequest → { checkoutUrl? }`, `createEscrowHold → EscrowIntent`. Consistent across tasks.
- **Backward-compat:** stub returns no `checkoutUrl` → synchronous sourcing; `createEscrowHold`'s return was already ignored by the seed; the new reuse-held guard is a no-op when there's no held payment.
- **Open flag for the implementer:** `STRIPE_API_VERSION` must be set to the installed SDK's pinned literal (tsc-verified) — the one value that can't be hardcoded blind in this plan.
