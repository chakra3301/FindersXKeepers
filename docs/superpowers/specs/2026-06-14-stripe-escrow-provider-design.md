# Real Stripe escrow provider (Phase 1, Effort 2) — design spec

**Date:** 2026-06-14
**Status:** approved design; ready for implementation plan
**Predecessor:** Phase 1 Effort 1 — cap-difference refund (stub-backed), on `main` at `d2b2bf0`;
plus the no-keys prep (`readStripeEnv`, env docs) at `ff13ca5`.
**Setup guide:** `docs/stripe-setup.md`

## Goal

Implement the real `StripeEscrowProvider` behind the existing `src/lib/escrow`
seam (plus the Stripe webhook route and the async-payment flow rewiring) so escrow
runs on real Stripe (test mode) instead of the in-memory stub — capturing the cap
at checkout, refunding the unused difference at ship, and refunding in full on
cancellation. The stub stays the default (`ESCROW_PROVIDER=stub`); flipping to
`stripe` switches the whole app onto Stripe with no other code change.

## Confirmed decisions

- **Plain Stripe, not Connect.** We're the merchant of record; the customer's
  payment reimburses us + our finder's fee; the Japanese seller is paid
  out-of-band. No connected accounts, no transfers — standard PaymentIntents
  settle to our one Stripe account.
- **Capture-now, refund-difference.** At checkout we capture the full cap to our
  Stripe balance (Stripe holds it until payout). At ship we refund
  `held − orderTotal` and keep the order total. Cancellation/no-find = full
  refund. Chosen over authorize-only because card auth holds expire in ~7 days,
  shorter than sourcing can take.
- **Stripe Checkout (redirect).** Card entry happens on Stripe's hosted page; a
  webhook confirms the hold. (Embedded Payment Element deferred.)
- **The hold is confirmed asynchronously by the webhook**, not synchronously in
  `depositForRequest` — the request moves `open → sourcing` only once payment
  succeeds.
- **JPY is a Stripe zero-decimal currency** — amounts pass through as-is
  (¥50,000 → `amount: 50000`), never ×100.

## The five non-negotiable constraints (carried through)

1. **Four-line pricing** — the captured amount is the four-line cap estimate at
   checkout and the four-line order total at settlement. Unchanged.
2. **Never hold raw customer funds** — funds flow through Stripe; the provider has
   no "our balance" concept. Capture-now means funds sit on our Stripe balance
   (the processor holds them; payout is on Stripe's schedule), released/refunded
   only through Stripe on our trigger.
3. **特商法 footer** — unaffected.
4. **Prohibited-items checkpoint** — unaffected.
5. **Escrow + lifecycle show REAL state** — checkout copy changes to reflect a
   real charge (see Section 4); release still hangs off the shipment tracking
   number.

---

## Section 1 — End-to-end money flow (async)

```
checkout : depositForRequest → createHold creates a Stripe Checkout Session
           (amount = four-line cap estimate, metadata.requestId) → returns checkoutUrl
           → the checkout action redirects the customer to Stripe's hosted page
           → customer pays (test card 4242…) → Stripe redirects back to /requests/[id]
webhook  : checkout.session.completed → payment row → 'held', open → sourcing
           (THE money-confirmed moment; idempotent)
approve  : unchanged — locks the real ≤-hold four-line order, no money move
           (server-side over-cap guard already added on main)
ship     : recordShipment → releaseEscrow(requestId, orderTotal)
           → escrow.release(intentId, orderTotal) → Stripe refund of (held − orderTotal)
           → payment 'released' (captured_jpy = orderTotal, refunded_jpy = difference)
           → received → shipped
cancel / no-find : refundEscrow → full Stripe refund → 'refunded'
```

`release` and `recordShipment` keep their Effort-1 shapes; only the *provider*
behind `escrow.release` changes (a Stripe refund instead of stub bookkeeping).

---

## Section 2 — The seam (interface evolution + provider)

### Interface (`src/lib/escrow/types.ts`)

Add an optional redirect to the hold result; nothing else changes from Effort 1:
```ts
export interface EscrowIntent {
  paymentIntentId: string;
  amountJpy: number;
  status: PaymentStatus;
  capturedJpy?: number;
  refundedJpy?: number;
  /** Stripe Checkout redirect URL when the hold needs hosted payment; absent for the stub. */
  checkoutUrl?: string;
}
```
The stub returns no `checkoutUrl` (synchronous `held`), so its callers are
unaffected.

### `StripeEscrowProvider` (`src/lib/escrow/stripe.ts`)

Constructed from `readStripeEnv()` (already built) + a `SITE_URL` for redirect
targets. Implements `EscrowProvider`:
- **`createHold({ requestId, amountJpy, idempotencyKey? })`** → create a Checkout
  Session (`mode: 'payment'`, single JPY line item `amount: amountJpy`,
  `metadata: { requestId }`, `success_url`/`cancel_url` → `/requests/[id]`,
  passing the idempotency key). Read `session.payment_intent` for the PI id.
  Return `{ paymentIntentId, amountJpy, status: 'pending', checkoutUrl: session.url }`.
- **`release(paymentIntentId, captureJpy?)`** → `paymentIntents.retrieve` to learn
  `held = pi.amount`; `refundJpy = held − min(captureJpy ?? held, held)`; if
  `refundJpy > 0` call `refunds.create({ payment_intent, amount: refundJpy })`.
  Return `{ paymentIntentId, amountJpy: held, status: 'released',
  capturedJpy: held − refundJpy, refundedJpy: refundJpy }`.
- **`refund(paymentIntentId)`** → `refunds.create({ payment_intent })` (full).
  Return `status: 'refunded'`.
- **`getStatus(paymentIntentId)`** → retrieve PI, map Stripe status →
  `PaymentStatus` (`succeeded`→`held`/`released` per refund state,
  `requires_payment_method`→`pending`, `canceled`→`refunded`, else `failed`).

### Factory (`src/lib/escrow/index.ts`)

The `stripe` case returns `new StripeEscrowProvider(...)` (replacing the
not-implemented throw), constructed from `readStripeEnv()`. Adds the `stripe`
Node SDK dependency (in the locked stack; "ask before a major dep" — it's the
planned integration, not a deviation).

---

## Section 3 — Webhook route + flow rewiring

### Webhook (`src/app/api/stripe/webhook/route.ts`)

A Next 16 route handler. Reads the **raw** body (not parsed JSON) and verifies
the signature with `stripe.webhooks.constructEvent(rawBody, sigHeader,
webhookSecret)`; returns 400 on a bad signature. Uses the **service-role admin
client** (webhooks are signature-authenticated, not user-authenticated).
Idempotent by construction (state-guarded — no separate processed-events table):

- **`checkout.session.completed`** → from `metadata.requestId` + the session's
  PI id, mark the `pending` payment `held`; if the request is still `open`,
  `setRequestStatus(open → sourcing)`; if already past, no-op.
- **`payment_intent.payment_failed`** → mark the payment `failed`.
- **`charge.refunded` / refund events** → reconcile `captured_jpy` /
  `refunded_jpy` / `status` to match Stripe (defensive confirmation of what
  `releaseEscrow`/`refundEscrow` already wrote).

### Flow rewiring (`operations.ts` + the checkout action)

- **`createEscrowHold`** inserts the payment row with the provider's returned
  status (`pending` for Stripe, `held` for the stub) and PI id, and **returns the
  intent** (so the caller can read `checkoutUrl`).
- **`depositForRequest(requestId, rushTier)`** returns `{ checkoutUrl?: string }`:
  persists the rush, builds the estimate, calls `createEscrowHold`. If the intent
  has a `checkoutUrl` (Stripe), it returns the URL and does **not** transition to
  sourcing (the webhook will). If absent (stub), it `setRequestStatus(open →
  sourcing)` and returns `{}` — identical to today.
- **The checkout server action** (`requests/[id]/checkout/actions.ts`) redirects
  to `checkoutUrl` when present, else to `/requests/[id]` as today.

---

## Section 4 — Copy, testing, scope

### Copy (#5 honesty — it's a real charge now)

Update the checkout explainer (`checkout-form.tsx`): the cap is **charged** now,
not just held — "We charge your budget cap now and refund the unused part when
your item ships; if we can't find it by your deadline, you're refunded in full."
"released" stays directed to us; "refunded/returned" to the customer. The
detail/received split display from Effort 1 is unchanged (it already reads the
real columns).

### Testing

- **Without keys (built + tested now):**
  - Provider unit tests with a **mocked `stripe` client**: `createHold` builds a
    session with the right amount/metadata/URLs and returns
    `{ status: 'pending', checkoutUrl }`; `release` refunds `held − captured` and
    returns the split; `refund` refunds full; `getStatus` maps statuses.
  - Webhook unit tests using `stripe.webhooks.generateTestHeaderString` to feed
    **signed** test events through the fake-admin harness: assert
    `checkout.session.completed` → held + sourcing (and idempotent re-delivery is
    a no-op), refund events reconcile, and a bad signature → 400.
- **With keys (circle-back, deferred):** live smoke test in Stripe test mode —
  real Checkout redirect + pay with `4242…`, `stripe listen` forwarding to
  `/api/stripe/webhook`, `stripe trigger`, a real ship-time difference refund,
  and a real full refund. Verified manually; documented in `docs/stripe-setup.md`.

### Scope & sequencing

One coherent subsystem. Plan order: add `stripe` dep + `StripeEscrowProvider`
(unit-tested) → webhook route (unit-tested) → flow rewiring + checkout redirect +
copy → **live verification (deferred until Stripe keys)**. Everything except the
live smoke test is built and tested in this effort.

### Out of scope

- Embedded Payment Element (Checkout redirect is the chosen UI).
- Stripe Connect / connected-account payouts (plain Stripe).
- Production webhook endpoint registration + secrets management, deploy/CI
  (Phase 8).
- Payout scheduling / reconciliation dashboards.

## New env vars (documented in `.env.example`)

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (already in `readStripeEnv`), plus a
site base URL for redirect targets (`NEXT_PUBLIC_SITE_URL`, default
`http://localhost:3000` in dev) and optional
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (unused until embedded UI).

## Reuse

`src/lib/escrow` (seam, `readStripeEnv`, stub for default + tests),
`operations.ts` (`createEscrowHold`/`releaseEscrow`/`recordShipment`/
`depositForRequest`), the fake-admin test harness, the checkout/detail/received
screens.

## Done criteria

- `StripeEscrowProvider` implements the seam; factory returns it for
  `ESCROW_PROVIDER=stripe`; stub remains the default.
- Webhook route verifies signatures and drives held/sourcing + refund
  reconciliation, idempotently.
- `depositForRequest` returns `{ checkoutUrl? }`; the stub flow is byte-for-byte
  unchanged; the checkout action redirects when a URL is present.
- Checkout copy reflects a real charge.
- `npm test` green (existing 40 + provider + webhook unit tests); typecheck /
  lint / build clean — all **without Stripe keys**.
- Live test-mode smoke test documented and deferred to circle-back.
