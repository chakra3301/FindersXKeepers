# Escrow Cap-Difference Refund Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make escrow settle at the real four-line order total on ship — capturing the order total to us and returning the unused cap to the customer in one event — instead of releasing the whole cap-sized hold.

**Architecture:** Extend the escrow seam's `release` with an optional capture amount (backward-compatible); the stub models the capture/return split. `recordShipment` (the existing release-on-tracking trigger) passes the order total into `releaseEscrow`, which records the split on the `payments` row via two new columns. Then re-honest the Plan-2 checkout copy (the difference refund is now real) and surface the split on the detail/received screens. Stub-backed only — no Stripe.

**Tech Stack:** Next.js 16 + TS strict · Supabase (Postgres + RLS) · Vitest · the in-memory `StubEscrowProvider` + fake-admin test harness from Plan 2.

**Spec:** `docs/superpowers/specs/2026-06-14-escrow-difference-refund-design.md`

---

## File structure

**New files:**
- `supabase/migrations/0002_escrow_settlement.sql` — add `captured_jpy` / `refunded_jpy` to `payments` + reconciliation check.
- `src/lib/escrow/stub.test.ts` — unit test for the stub's partial-capture split.

**Modified files:**
- `src/lib/escrow/types.ts` — `release(paymentIntentId, captureJpy?)`; `EscrowIntent` gains `capturedJpy?`/`refundedJpy?`.
- `src/lib/escrow/stub.ts` — partial-capture `release`.
- `src/lib/db/types.ts` — `Payment` gains the two columns.
- `src/lib/requests/operations.ts` — `releaseEscrow(requestId, captureJpy?, admin)` records the split; `recordShipment` passes the order total.
- `src/lib/requests/operations.test.ts` — updated + new settlement assertions.
- `src/app/(app)/requests/[id]/checkout/checkout-form.tsx` — honest copy (no deferred-phase caveat).
- `src/app/(app)/requests/[id]/page.tsx` — show the split when `released`.
- `src/app/(app)/requests/[id]/received/received-form.tsx` — settle note reflects the split.

**Seed compatibility (no change needed):** `scripts/seed.ts` sizes the hold to the order total, so seeded settlements compute `captured = order total = held`, `refunded = 0`; the check constraint holds. The difference refund is exercised by the live deposit→approve→ship flow (hold = cap > order) and by the unit tests below.

---

## Task 1: Schema — settlement columns + reconciliation check

**Files:**
- Create: `supabase/migrations/0002_escrow_settlement.sql`
- Modify: `src/lib/db/types.ts` (the `Payment` type)

> Schema/type task — verified by `npm run typecheck` (no unit test). The migration must be applied in the Supabase SQL editor by the operator; tests use the fake-admin harness which stores arbitrary columns.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0002_escrow_settlement.sql
-- Records how a held escrow amount was split at settlement: the portion
-- captured to us vs. the unused cap returned to the customer. Null until a
-- payment is settled (and on the full-refund path).
alter table payments
  add column captured_jpy integer,
  add column refunded_jpy integer;

-- When settled, the split must reconcile exactly to the held amount.
alter table payments
  add constraint payments_settlement_split_chk check (
    captured_jpy is null
    or (
      captured_jpy >= 0
      and refunded_jpy >= 0
      and captured_jpy + refunded_jpy = amount_jpy
    )
  );
```

- [ ] **Step 2: Mirror the columns in the `Payment` type**

In `src/lib/db/types.ts`, the `Payment` type currently ends with `status` + `created_at`. Add the two columns (keep it a `type` alias, not an interface):
```ts
export type Payment = {
  id: string;
  request_id: string;
  stripe_payment_intent_id: string | null;
  amount_jpy: number;
  status: PaymentStatus;
  captured_jpy: number | null;
  refunded_jpy: number | null;
  created_at: string;
};
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean. (Adding nullable fields to a row type doesn't break existing reads; inserts that omit them are fine — the DB defaults them to null.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_escrow_settlement.sql src/lib/db/types.ts
git commit -m "feat(escrow): payments settlement-split columns + reconciliation check

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Escrow interface + stub partial capture (TDD)

**Files:**
- Modify: `src/lib/escrow/types.ts`, `src/lib/escrow/stub.ts`
- Create: `src/lib/escrow/stub.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/escrow/stub.test.ts
import { describe, expect, it } from "vitest";
import { StubEscrowProvider } from "./stub";

describe("StubEscrowProvider.release", () => {
  it("captures the given amount and returns the remainder", async () => {
    const p = new StubEscrowProvider();
    const intent = await p.createHold({ requestId: "r1", amountJpy: 50_000 });
    const settled = await p.release(intent.paymentIntentId, 36_300);
    expect(settled.status).toBe("released");
    expect(settled.capturedJpy).toBe(36_300);
    expect(settled.refundedJpy).toBe(13_700);
  });

  it("defaults to a full capture when no amount is given", async () => {
    const p = new StubEscrowProvider();
    const intent = await p.createHold({ requestId: "r1", amountJpy: 50_000 });
    const settled = await p.release(intent.paymentIntentId);
    expect(settled.capturedJpy).toBe(50_000);
    expect(settled.refundedJpy).toBe(0);
  });

  it("never captures more than was held (clamps)", async () => {
    const p = new StubEscrowProvider();
    const intent = await p.createHold({ requestId: "r1", amountJpy: 10_000 });
    const settled = await p.release(intent.paymentIntentId, 999_999);
    expect(settled.capturedJpy).toBe(10_000);
    expect(settled.refundedJpy).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/escrow/stub.test.ts`
Expected: FAIL — `release` ignores the second arg / `capturedJpy` is undefined.

- [ ] **Step 3: Extend the interface**

In `src/lib/escrow/types.ts`, add the split fields to `EscrowIntent` and the capture param to `release`:
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
}
```
```ts
  /**
   * Settle/release. `captureJpy` omitted → full release (capturedJpy = held,
   * refundedJpy = 0). When `captureJpy` < held, capture that amount to us and
   * return the remainder to the customer.
   */
  release(paymentIntentId: string, captureJpy?: number): Promise<EscrowIntent>;
```

- [ ] **Step 4: Implement the stub's partial capture**

In `src/lib/escrow/stub.ts`, replace the `release` method (the `refund` method keeps using `transition`):
```ts
  async release(
    paymentIntentId: string,
    captureJpy?: number,
  ): Promise<EscrowIntent> {
    const existing = this.intents.get(paymentIntentId);
    const held = existing?.amountJpy ?? 0;
    const capturedJpy = Math.min(captureJpy ?? held, held);
    const intent: EscrowIntent = {
      paymentIntentId,
      amountJpy: held,
      status: "released",
      capturedJpy,
      refundedJpy: held - capturedJpy,
    };
    this.intents.set(paymentIntentId, intent);
    this.log("released", intent);
    return intent;
  }
```
Leave `transition` (used by `refund`) unchanged.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/lib/escrow/stub.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Full suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: all green (30 prior + 3 new = 33), typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/escrow/types.ts src/lib/escrow/stub.ts src/lib/escrow/stub.test.ts
git commit -m "feat(escrow): release accepts a capture amount, stub models the split

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Settle at the order total in operations (TDD)

**Files:**
- Modify: `src/lib/requests/operations.ts`, `src/lib/requests/operations.test.ts`

> The operation computes the split from the authoritative DB held amount (`payment.amount_jpy`), not from the stub — so it's correct even for the test's pre-seeded intent ids that the stub never minted.

- [ ] **Step 1: Update the failing tests**

In `src/lib/requests/operations.test.ts`, find the `describe("shipApprovedOrder", ...)` block. REPLACE the first test ("records a demo-tracked shipment, releases escrow, and moves received → shipped") with this version (held cap ¥30,000 > order ¥20,150, so the difference is returned):
```ts
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
```
KEEP the existing second test ("throws on a non-received request and releases nothing") unchanged. Then APPEND two more tests after it, still inside the `shipApprovedOrder` describe block:
```ts
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
```
And add a `releaseEscrow` describe block at the end of the file (import `releaseEscrow` — see Step 2):
```ts
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
```

- [ ] **Step 2: Update the test import**

At the top of `operations.test.ts`, add `releaseEscrow` to the import from `./operations`:
```ts
import {
  depositForRequest,
  approveCandidate,
  keepHunting,
  shipApprovedOrder,
  releaseEscrow,
} from "./operations";
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/lib/requests/operations.test.ts`
Expected: FAIL — `captured_jpy`/`refunded_jpy` are undefined (releaseEscrow doesn't record them yet) and the full-release test fails on the new signature.

- [ ] **Step 4: Implement the split in `releaseEscrow` + pass the order total in `recordShipment`**

In `src/lib/requests/operations.ts`, replace the whole `releaseEscrow` function with:
```ts
/**
 * Settle the held escrow for a request (our trigger). Captures `captureJpy` to
 * us and returns the rest of the hold to the customer; the split is computed
 * from the authoritative held amount on the payment row. `captureJpy` omitted →
 * full release (captured = held, refunded = 0).
 */
export async function releaseEscrow(
  requestId: string,
  captureJpy?: number,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("request_id", requestId)
    .eq("status", "held")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!payment?.stripe_payment_intent_id) return; // nothing held to release

  const held = payment.amount_jpy;
  const capturedJpy = Math.min(captureJpy ?? held, held);
  const refundedJpy = held - capturedJpy;

  const intent = await escrow.release(
    payment.stripe_payment_intent_id,
    capturedJpy,
  );
  await admin
    .from("payments")
    .update({
      status: intent.status,
      captured_jpy: capturedJpy,
      refunded_jpy: refundedJpy,
    })
    .eq("id", payment.id);
}
```
Then in `recordShipment`, change the order lookup to also select `total_jpy`, and pass it as the capture amount:
```ts
  const { data: order, error } = await admin
    .from("orders")
    .select("id, request_id, total_jpy")
    .eq("id", params.orderId)
    .single();
  if (error || !order) throw new Error(`Order ${params.orderId} not found.`);
```
```ts
  // The trigger: only a real tracking number settles escrow + advances status.
  if (params.trackingNumber) {
    await releaseEscrow(order.request_id, order.total_jpy, admin);
    await setRequestStatus(order.request_id, "shipped", admin);
  }
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/lib/requests/operations.test.ts`
Expected: PASS — `shipApprovedOrder` (settle + equal + throws) and the new `releaseEscrow` test all green.

- [ ] **Step 6: Full suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: all green (33 + 2 updated/new settlement tests = 35), typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/requests/operations.ts src/lib/requests/operations.test.ts
git commit -m "feat(escrow): settle at the order total, return the unused cap

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Re-honest the UI (the difference refund is now real)

**Files:**
- Modify: `src/app/(app)/requests/[id]/checkout/checkout-form.tsx`
- Modify: `src/app/(app)/requests/[id]/page.tsx`
- Modify: `src/app/(app)/requests/[id]/received/received-form.tsx`

> No unit tests (presentational copy + a derived display). Verified by build/typecheck and the honesty grep.

- [ ] **Step 1: Replace the deferred-phase checkout caveat with honest copy**

In `src/app/(app)/requests/[id]/checkout/checkout-form.tsx`, find the explainer paragraph that currently contains "Automatic cap-difference refunds are a later phase". Replace that whole paragraph's text with (keep the surrounding `<p>`/markup and any `<strong>` styling pattern):
```tsx
        This is an estimate sized to your budget cap — we hold up to this amount
        in escrow now, and it isn&apos;t a charge. When your item ships we settle
        up: you&apos;re charged only the real four-line total, and any unused part
        of your cap is <strong>returned to you</strong>. Funds release to us only
        when your item ships, and if we can&apos;t find it by your deadline
        you&apos;re refunded in full.
```
Confirm the word "released"/"release" still only ever refers to funds going to **us**, and "returned to you" to the customer.

- [ ] **Step 2: Show the settlement split on the detail page**

In `src/app/(app)/requests/[id]/page.tsx`, the escrow card has an `{escrowState === "released" && (...)}` block currently rendering "Escrow released — your item is on its way." Replace that block with a version that surfaces the split from the settled payment. First, just above the `return` (near where `escrowState` is computed), derive the settled payment:
```tsx
  const settledPayment = payments.find((p) => p.status === "released") ?? null;
```
Then replace the released block:
```tsx
              {escrowState === "released" && (
                <>
                  Escrow released — your item is on its way.
                  {settledPayment && settledPayment.refunded_jpy != null &&
                    settledPayment.refunded_jpy > 0 && (
                      <span className="mt-1 block text-success/80">
                        {formatJpy(settledPayment.captured_jpy)} released to us ·{" "}
                        {formatJpy(settledPayment.refunded_jpy)} returned to you.
                      </span>
                    )}
                </>
              )}
```
(`formatJpy` and `payments` are already imported/destructured on this page.)

- [ ] **Step 3: Reflect the split in the received-screen note**

In `src/app/(app)/requests/[id]/received/received-form.tsx`, the note under the "Approve & ship" button currently reads "Approving releases your escrow to us and puts the item in transit to you." Replace that sentence with:
```tsx
        Approving settles your escrow — the real total is released to us, any
        unused part of your cap is returned to you, and the item goes in transit.
```

- [ ] **Step 4: Build, typecheck, honesty grep**

Run: `npm run typecheck && npm run build`
Expected: clean.
Run: `grep -rn "later phase" src/app/(app)/requests/[id]/checkout/`
Expected: no match (the deferred-phase caveat is gone).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/requests/[id]/checkout/checkout-form.tsx" "src/app/(app)/requests/[id]/page.tsx" "src/app/(app)/requests/[id]/received/received-form.tsx"
git commit -m "feat(escrow): honest UI for the now-real cap-difference refund

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Done-criteria verification

**Files:** none (verification only)

> REQUIRED SKILL: superpowers:verification-before-completion — run every command and confirm output before claiming done.

- [ ] **Step 1: Full gate**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: tests green (35), typecheck clean, lint 0 errors, build clean.

- [ ] **Step 2: Honesty + reconciliation audit**

Run: `grep -rn "later phase" "src/app/(app)/requests/[id]/checkout/"` → no match.
Confirm by reading: every `captured_jpy`/`refunded_jpy` write satisfies `captured + refunded = amount_jpy` (the operation computes `refunded = held - captured`, so it always reconciles); "released" only ever refers to funds to us.

- [ ] **Step 3: Note the operator step**

The migration `supabase/migrations/0002_escrow_settlement.sql` must be applied in the Supabase SQL editor before a live `npm run dev` walkthrough; the seed stays valid (hold = order total → refunded 0). Record this in the completion summary.

---

## Self-review notes (author)

- **Spec coverage:** Section 1 (interface + stub) → Task 2; Section 2 (schema → Task 1, ops → Task 3); Section 3 (UI → Task 4, tests → Tasks 2-3, done-criteria → Task 5). The two deferred-but-wanted items (order-history split, real Stripe) remain out of scope by design.
- **Signature consistency:** `release(paymentIntentId, captureJpy?)` (types/stub), `releaseEscrow(requestId, captureJpy?, admin)` (ops), `recordShipment` calls `releaseEscrow(order.request_id, order.total_jpy, admin)`. `captured_jpy`/`refunded_jpy` column names match across migration, `Payment` type, ops writes, and UI reads.
- **Backward-compat:** `recordShipment` is the only `releaseEscrow` caller; `captureJpy` is optional and defaults to a full release, so the seed and the full-refund path are unaffected.
- **Test count:** 30 (Plan 2) + 3 (stub) + 2 (settlement) = 35.
