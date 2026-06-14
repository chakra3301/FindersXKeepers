# Stripe setup (for Phase 1, Effort 2 — real escrow)

> Status: **built + unit-tested; live smoke test pending keys.** The
> `StripeEscrowProvider` (`src/lib/escrow/stripe.ts`) and webhook route
> (`src/app/api/stripe/webhook/route.ts`) are implemented and covered by unit
> tests (mocked Stripe client + signed test events). Flipping
> `ESCROW_PROVIDER=stripe` switches the whole app onto Stripe with no other code
> change. What remains is the **live test-mode smoke test** below — it needs real
> `sk_test_…` / `whsec_…` keys.

## Decision (made): plain Stripe
We're the **merchant of record** — the customer payment reimburses us + our
finder's fee; Japanese sellers are paid out-of-band. **No Stripe Connect**, no
connected accounts; standard PaymentIntents settle to our one account. Only
standard test keys are needed.

## Steps (all in TEST MODE — no real money)
1. **Account + test mode:** sign in at dashboard.stripe.com, toggle **Test mode** ON.
2. **API keys:** Developers → API keys → copy the **Secret key** (`sk_test_…`) and
   **Publishable key** (`pk_test_…`).
3. **Stripe CLI** (macOS):
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   ```
4. **Forward webhooks** (with `npm run dev` running, in its own terminal):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the printed **webhook signing secret** (`whsec_…`). Re-print anytime with
   `stripe listen --print-secret`. Fire test events with e.g.
   `stripe trigger payment_intent.succeeded`.
5. **`.env.local`** (never commit — see `.env.example` for the documented block):
   ```bash
   ESCROW_PROVIDER=stripe          # only once the provider is built; keep "stub" until then
   STRIPE_SECRET_KEY=sk_test_…
   STRIPE_WEBHOOK_SECRET=whsec_…
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…   # optional until client-side payment UI
   ```

## Test cards
- Success: `4242 4242 4242 4242` (any future expiry, any CVC, any postal)
- 3DS/auth required: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 0002`

## When ready
Put `sk_test_…` + `whsec_…` in `.env.local`, decide plain-vs-Connect (or ask for a
recommendation), then the Effort 2 brainstorm → spec → build runs against test mode.
`readStripeEnv()` (`src/lib/escrow/stripe-env.ts`) validates the vars and fails with a
helpful message if any are missing.
