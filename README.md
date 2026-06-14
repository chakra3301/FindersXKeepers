# Finders × Keepers

A concierge sourcing service for buyers **outside Japan**. Post what you want
from Japan, set a budget and minimum condition, and pay into escrow — we source
it, send proof, ship on approval, and get paid only once it's in transit.

This repo is a **runnable vertical slice**: sign in → dashboard → post a request
→ watch its lifecycle + escrow status → open its detail view. Stripe escrow is
stubbed behind a clean seam; everything else is real.

> Visual design is an interpretation of the "fintech-calm" direction (warm washi
> paper + 藍 indigo); it's token-driven and meant to be refined against the real
> design file.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind v4 + shadcn/ui ·
Supabase (Postgres / Auth / Storage) · Stripe escrow (stub or live test mode).

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project & configure env

Create a free project at [supabase.com](https://supabase.com), then copy
`.env.example` to `.env.local` and fill in the three values from
**Project Settings → API**:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never commit
```

> **Tip:** In **Authentication → Providers → Email**, turn **off** "Confirm
> email" so new sign-ups (and the demo user) can log in immediately.

### 3. Apply database migrations

Open the **SQL Editor** in your Supabase dashboard and run each migration in
order (paste file contents, run):

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
2. [`supabase/migrations/0002_escrow_settlement.sql`](supabase/migrations/0002_escrow_settlement.sql)
3. [`supabase/migrations/0003_staff_role.sql`](supabase/migrations/0003_staff_role.sql)
4. [`supabase/migrations/0004_storage_proofs.sql`](supabase/migrations/0004_storage_proofs.sql)

Or, with the Supabase CLI linked: `supabase db push`.

### 4. Seed demo data

```bash
npm run seed
```

This creates a demo user and requests in **every lifecycle state** (waiting,
action-needed, in transit, completed, refunded, cancelled). Uses the escrow
**stub** regardless of `ESCROW_PROVIDER` in `.env.local`. Sign in with:

```
email:    demo@finderskeepers.test
password: concierge123
```

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login`; sign in as the
demo user to land on a populated dashboard. (Create a brand-new account to see
the empty state.)

## What to click through

- **Dashboard** — requests grouped by lifecycle bucket, each with a status badge
  and escrow badge; summary stats up top.
- **New request** (`/requests/new`) — the spec form. Try a prohibited item
  (e.g. a title containing "ivory" or "firearm") to see the blocklist gate.
- **Request detail** — lifecycle timeline, four-line price breakdown, escrow
  status, sourced candidate, shipment tracking, and the message thread.
- **Footer → 特定商取引法に基づく表記** — the legal disclosure page, present on
  every page (plus Terms and Privacy).
- **Operator console** (`/operator`) — staff-only fulfillment queue (demo user
  is seeded as staff).
- **Messages** — two-way threads per hunt.

## Deploy (Vercel)

1. Import the repo in [Vercel](https://vercel.com) (Next.js preset).
2. Set environment variables from `.env.example` for **Production** and
   **Preview**:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` → your Vercel URL (e.g. `https://your-app.vercel.app`)
   - `ESCROW_PROVIDER=stub` until Stripe is configured; then `stripe` +
     `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (see
     [`docs/stripe-setup.md`](docs/stripe-setup.md))
3. Apply all migrations to your **production** Supabase project (see step 3 above).
4. Register the Stripe webhook endpoint
   `https://YOUR-DOMAIN/api/stripe/webhook` when using live Stripe.
5. Run `npm run seed` against production once (or create staff users manually).

CI runs on every push/PR via [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run seed` | Reset + seed the demo user and requests |
| `npm run test` | Vitest unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Architecture notes

See [`CLAUDE.md`](CLAUDE.md) for the full guide — the lifecycle state machine,
the escrow seam (swap stub → Stripe in one file), the four-line pricing rule,
and the other non-negotiable trust/legal constraints.
