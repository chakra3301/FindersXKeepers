# Stripe setup (for Phase 1, Effort 2 — real escrow)

> Status: **prep done, integration pending.** The env seam (`src/lib/escrow/stripe-env.ts`)
> and `.env.example` placeholders are ready. The real `StripeEscrowProvider` +
> webhook route are **not built yet** — they need the steps below completed
> (Stripe account access) plus the Connect-vs-plain decision.

## One decision that shapes the build
- **Plain Stripe** (we're merchant of record; the customer payment reimburses us +
  our fee; sellers paid out-of-band) → only standard test keys needed. *Likely
  recommendation.*
- **Stripe Connect** (pay sellers/finders via connected accounts) → also enable
  Connect in test mode.

Standard test keys are needed either way; the decision is finalized in the
Effort 2 brainstorm.

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
