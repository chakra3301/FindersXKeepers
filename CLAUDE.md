# Finders × Keepers — project guide

Concierge sourcing service for buyers **outside Japan**. A user posts a request
for an item they want from Japan, sets a budget and minimum condition, and pays
into escrow. We source it, send proof, ship on approval, and get paid only once
the item is in transit. "Bounty board for Japanese goods" — not a proxy where
the user does the searching.

## Stack (locked)

- **Next.js 16 (App Router) + TypeScript (strict)**
- **Tailwind v4 + shadcn/ui** (base-nova preset → components use `@base-ui/react`,
  not Radix; `Button`/menu items use base-ui's `render` prop, **not** `asChild`).
  For link-styled buttons use `buttonVariants()` on a `<Link>`.
- **Supabase** — Postgres, Auth (email + Sign in with Apple), Storage
- **Stripe Connect** escrow — **stubbed**, behind a one-file seam (`src/lib/escrow`)
- Deploy target: Vercel

Ask before adding a major dependency or deviating from this stack.

## Run

See `README.md`. Short version: fill `.env.local` from `.env.example`, apply
`supabase/migrations/0001_init.sql` in the Supabase SQL editor, `npm run seed`,
`npm run dev`. Demo login: `demo@finderskeepers.test` / `concierge123`.

## The five non-negotiable constraints (legal + trust — never simplify away)

1. **Pricing is always four separate lines** — item cost / finder's fee /
   shipping / tax — stored and displayed individually (`orders.total_jpy` is a
   generated column = the sum). Never collapse into one opaque number. Item cost
   is pass-through; the finder's fee is our separately disclosed service fee
   (agency model, not resale). See `src/lib/pricing.ts`,
   `components/requests/price-breakdown.tsx`.
2. **We never hold raw customer funds.** All escrow flows through the processor.
   The `EscrowProvider` interface (`src/lib/escrow/types.ts`) has no "our
   balance" concept — processor holds funds, releases on our trigger.
3. **Legal routes exist from day one.** `/legal/tokushoho` (特商法 disclosure),
   linked from the footer on **every** page (`components/layout/footer.tsx` in
   the root layout).
4. **Prohibited-items hook is a real checkpoint**, not a TODO:
   `screenRequest()` (`src/lib/prohibited/blocklist.ts`) runs inside the
   create-request server action and blocks matches.
5. **Escrow + lifecycle are always visible** on the dashboard and detail views
   (status badge + escrow badge everywhere).

## Lifecycle state machine — single source of truth

`src/lib/requests/state-machine.ts` owns every legal `request.status`
transition. **Nothing else flips status** — all mutations go through
`assertTransition` (via `src/lib/requests/operations.ts`). The
escrow-release/payout trigger hangs off a **shipment having a tracking number**
(`operations.recordShipment`), never a manual flag.

Statuses: `open → sourcing → candidate_sent → approved → purchased → received →
shipped → released`, plus `refunded`, `cancelled`.

## Data model

Tables: `profiles, requests, candidates, orders, shipments, messages,
payments`. Full schema + RLS + triggers in `supabase/migrations/0001_init.sql`;
TypeScript mirror in `src/lib/db/types.ts` (row types are **`type` aliases, not
`interface`** — interfaces don't satisfy supabase-js's `Record<string,unknown>`
table constraint and silently resolve queries to `never`).

RLS: a user only touches rows tied to their `user_id`; the service-role client
(`src/lib/supabase/admin.ts`, server-only) bypasses RLS for team/seed actions.

## Conventions

- `src/lib/supabase/{client,server,admin,middleware}.ts` — never import `admin`
  from a client component.
- Auth gating + session refresh live in `src/proxy.ts` (Next 16's renamed
  middleware) → `lib/supabase/middleware.ts`.
- Server Components fetch via `src/lib/requests/queries.ts`; mutations are
  server actions that delegate to `operations.ts`.
- Secrets only via env (`src/lib/supabase/env.ts` validates them). Never commit
  `.env.local`.
- **Design tokens** ("fintech-calm", warm washi paper + 藍 indigo) live in
  `src/app/globals.css` and are intentionally swappable when the real design
  file lands. Display serif = Fraunces; UI = Geist; ledger figures = Geist Mono
  with the `.tnum` utility.

## Not built yet (roadmap)

Real Stripe Connect · proof-image upload · interactive messaging · checkout with
JPY + local-currency display · marketing pages · account/settings · order
history. Apple sign-in is wired but unverified (needs Supabase OAuth config).
