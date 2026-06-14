# Escrow cap-difference refund (Phase 1, Effort 1) — design spec

**Date:** 2026-06-14
**Status:** approved design; ready for implementation plan
**Predecessor:** Plan 2 (`docs/superpowers/specs/2026-06-13-plan2-design-build-out-design.md`),
merged to `main` at `be89fbc`.
**Master-plan phase:** Phase 1 (real Stripe Connect + auto-refund). This spec is
**Effort 1 of 2**: the escrow-*model* change (cap-vs-final difference refund),
fully backed by the existing in-memory stub. **Effort 2** (real
`StripeEscrowProvider` + webhooks) is a separate later spec that implements the
interface this one defines.

## Goal

Make escrow settle at the **real** four-line order total instead of releasing the
full cap-sized hold. When we find an item cheaper than the budget cap, the unused
difference is **returned to the customer** at the single settle-on-ship moment.
This closes the honesty gap Plan 2 deferred (checkout currently says
"automatic cap-difference refunds are a later phase") and makes the money model
correct end-to-end — without any Stripe dependency yet.

## Confirmed decisions

- **Scope split (confirmed):** model change now (stub-tested, no Stripe); real
  `StripeEscrowProvider` + webhooks is a separate follow-up effort.
- **Settlement timing (confirmed): at ship, one event.** Hold the full cap
  through sourcing; at ship — the existing release-on-tracking-number moment —
  capture the real order total **to us** and return `held − captured` **to the
  customer** in that same release. No second money-moment; preserves constraint
  #2 (release hangs off a tracking number); maps cleanly to Stripe
  partial-capture in Effort 2.
- **Interface shape:** extend the existing `release` with an optional capture
  amount (backward-compatible) rather than adding a new `settle` method.
- **Schema:** record the split on the existing `payments` row via two new
  nullable columns, not a second payment row.

## The five non-negotiable constraints (carried through)

1. **Four-line pricing** — the captured amount is the four-line order total
   (`orders.total_jpy`); the hold is the four-line cap estimate. No collapsing.
2. **Never hold raw customer funds** — all movement still flows through
   `src/lib/escrow`; settlement still hangs off a shipment tracking number.
3. **特商法 footer** — unaffected.
4. **Prohibited-items checkpoint** — unaffected.
5. **Escrow + lifecycle always show REAL state** — the difference refund is now
   **real**, so the deferred-phase copy is replaced with honest copy, and the
   split is surfaced where escrow shows `released`.

---

## Section 1 — Money semantics & the escrow interface

**Unchanged:** `createHold` at checkout holds the full cap estimate (`held`);
`approveCandidate` locks the real four-line order (≤ hold) with **no** money
move; `refundEscrow` (full refund on cancel/dispute) is untouched.

**New — settle on ship:** `recordShipment` (already the release trigger) passes
the order total as a capture amount into `releaseEscrow`, which calls
`escrow.release(intentId, captureJpy)`. The provider captures `captureJpy` to us
and returns `held − captureJpy` to the customer — one event.

### Interface change (`src/lib/escrow/types.ts`)

```ts
export interface EscrowIntent {
  paymentIntentId: string;
  amountJpy: number;          // the held amount (cap estimate) — unchanged meaning
  status: PaymentStatus;
  capturedJpy?: number;       // set on settlement: released to us
  refundedJpy?: number;       // set on settlement: returned to the customer
}

export interface EscrowProvider {
  readonly name: string;
  createHold(params: CreateHoldParams): Promise<EscrowIntent>;
  /**
   * Settle/release. captureJpy omitted → full release (capturedJpy = held,
   * refundedJpy = 0), backward-compatible with today's callers. When
   * captureJpy < held, capture that amount to us and return the remainder to
   * the customer.
   */
  release(paymentIntentId: string, captureJpy?: number): Promise<EscrowIntent>;
  refund(paymentIntentId: string): Promise<EscrowIntent>;
  getStatus(paymentIntentId: string): Promise<PaymentStatus>;
}
```

### Stub (`src/lib/escrow/stub.ts`)

`release(intentId, captureJpy?)`: `held = existing.amountJpy`;
`captured = captureJpy ?? held`; `refunded = held − captured`. Set
`status = "released"`, store `capturedJpy`/`refundedJpy` on the intent, return
it. (The stub still "captures" at `createHold`; the split is bookkeeping that
mirrors what real Stripe partial-capture will do in Effort 2.)

---

## Section 2 — Data model & operations

### Migration `supabase/migrations/0002_escrow_settlement.sql`

```sql
alter table payments
  add column captured_jpy integer,
  add column refunded_jpy integer;

-- When settled, the split must reconcile to the held amount.
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

Both columns are null until settlement (and stay null on the full-refund path —
the constraint only applies once `captured_jpy` is set). Mirror in the `Payment`
type (`src/lib/db/types.ts`): `captured_jpy: number | null;
refunded_jpy: number | null;`.

### Operations (`src/lib/requests/operations.ts`)

- **`releaseEscrow(requestId, captureJpy?, admin)`** — finds the latest `held`
  payment, derives `held = payment.amount_jpy`, clamps
  `capture = Math.min(captureJpy ?? held, held)` (defensive — `price ≤ cap` is
  already enforced by the candidate over-cap gate), calls
  `escrow.release(intentId, capture)`, then writes `status='released'`,
  `captured_jpy = capture`, `refunded_jpy = held − capture` on the row.
- **`recordShipment`** — extend the order lookup to also select `total_jpy`, and
  pass `order.total_jpy` as `captureJpy` to `releaseEscrow`. No signature change
  to `recordShipment` or `shipApprovedOrder`.

The full-release default (no `captureJpy`) is retained so any existing/seed
caller that releases without an order total still behaves exactly as before
(captured = held, refunded = 0).

---

## Section 3 — UI honesty, tests, scope

### UI (the difference refund is now REAL)

- **Checkout** (`checkout-form.tsx`): remove the "automatic cap-difference
  refunds are a later phase" caveat added in Plan 2; state plainly that the full
  cap is held now and, at ship, the customer is charged only the real four-line
  total with the unused part of the cap returned to them. "released" still means
  to us; "returned to you" still means the customer's money.
- **Detail page** (`requests/[id]/page.tsx`, `escrowState === "released"`): when
  `refunded_jpy > 0`, show the split — "¥{captured} released to us · ¥{refunded}
  returned to you" — read from the payment row (already fetched by
  `getRequestDetail`).
- **Received screen** (`received/received-form.tsx`): the approve-&-ship note
  reflects that settling releases the order total to us and returns any unused
  cap.
- A small shared formatter for the split may live in `src/lib/escrow/display.ts`
  (optional; only if it removes duplication between the two screens).

### Tests (`src/lib/requests/operations.test.ts`, existing fake-admin harness)

- Update the two `shipApprovedOrder` tests: on settle, the payment is `released`
  with `captured_jpy = order.total_jpy` and `refunded_jpy = held − total`.
- Add: difference is returned when `order.total < held` (refunded > 0); refunded
  is `0` when `order.total === held`; `releaseEscrow` with no capture amount
  performs a full release (captured = held, refunded = 0).
- The fake admin already stores arbitrary columns, so it carries the new fields;
  the order lookup in `recordShipment` must include `total_jpy` in seeded rows.

### Out of scope — explicitly wanted later, NOT dropped

- **Order-history split display** — show "¥X returned to you" on settled rows in
  `/history`. Wanted; deferred from this effort (history stays status-only for
  now). Tracked here so it isn't lost.
- **Effort 2 — real `StripeEscrowProvider` + webhooks** — implements this
  interface for real (Stripe partial-capture maps to `release(intentId,
  captureJpy)`), plus the webhook route reconciling `payments`, idempotency, and
  auth-hold-expiry handling. Separate spec.
- **Connect-vs-plain-Stripe decision** — whether sellers/finders are paid via
  connected accounts or we're the merchant of record keeping funds as
  reimbursement + fee. Decided in the Effort 2 spec.

## Reuse

`src/lib/escrow` (provider seam + stub), `src/lib/requests/operations.ts`
(`releaseEscrow`/`recordShipment`/`shipApprovedOrder`), the fake-admin test
harness in `operations.test.ts`, `PriceBreakdown`, `escrowStateFromPayments`,
the detail/received/checkout screens from Plan 2.

## Done criteria

- `release(intentId, captureJpy?)` lands; stub models the split; full-release
  default preserved.
- Migration `0002` applies; `Payment` type mirrors the columns.
- `releaseEscrow`/`recordShipment` settle at the order total and record the
  split.
- Checkout copy is honest (no deferred-phase caveat); detail + received surface
  the split.
- `npm test` green (existing 30 + the new/updated settlement tests).
- `npm run typecheck`, `npm run lint`, `npm run build` clean.
