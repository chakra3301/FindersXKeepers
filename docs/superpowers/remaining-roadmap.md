# Finders Keepers — remaining roadmap & fresh-session handoff

**Date:** 2026-06-14
**Purpose:** Everything left to reach a finished, deployable app, in recommended
build order, with key decisions pre-made. Hand this to a fresh session and run
the phases one at a time. **Default to the recommended option at every decision
unless it conflicts with the five constraints.**

---

## How to run each phase in a fresh session

1. **One driver per branch/working tree.** Do NOT run two sessions on the same
   checkout at once — that caused file races during Effort 2. If you must
   parallelize, give each session its own `git worktree`.
2. **Branch first** off `main` (e.g. `git checkout -b phase3/operator-console`).
3. **Workflow per phase:**
   - If a spec already exists (Ph3 does): skip brainstorming → go straight to
     **`superpowers:writing-plans`** → **`superpowers:subagent-driven-development`**.
   - If no spec yet: **`superpowers:brainstorming`** (go with the recommended
     options below) → spec → writing-plans → subagent-driven-development.
   - Each screen/UI task: use the **frontend-design** skill against
     `design/handoff/Finders Keepers.dc.html` + the tokens in
     `src/app/globals.css`.
   - Money/ops/logic: TDD with the shared fake-admin harness
     (`src/lib/test-support/fake-admin.ts`) + the real stub.
4. **Verify before "done"** (`superpowers:verification-before-completion`):
   `npm test && npm run typecheck && npm run lint && npm run build` all green.
5. **Finish** with `superpowers:finishing-a-development-branch` → merge to `main`.
6. **Commit trailer:** end messages with
   `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
7. **Update the memory file** (`MEMORY.md` / `finders-keepers-build.md`) after
   each phase.

**Stack reminders:** Next 16 (`src/proxy.ts`, not middleware.ts) · Tailwind v4
(`@theme`, no config) · shadcn base-nova = `@base-ui/react` (no `asChild`; use
`buttonVariants()` on a `<Link>`) · db row types are `type` aliases, never
`interface` · all status flips go through `assertTransition` in
`operations.ts` · escrow only via `src/lib/escrow` (release on a tracking
number) · four-line pricing never collapsed · 特商法 footer on every page.

---

## Current state (done, on `main`)

- **Plan 1** — design handoff adopted (`efff2a0`).
- **Plan 2** — all designed screens (landing, checkout, candidate, received,
  messages, history, account) + money spine ops (`be89fbc`).
- **Phase 1 Effort 1** — cap-difference refund: escrow settles at the real order
  total on ship, returns the unused cap; `payments.captured_jpy/refunded_jpy`
  (migration `0002`) (`d2b2bf0`).
- **Phase 1 Effort 2** — real `StripeEscrowProvider` + webhook (plain Stripe,
  capture-now/refund-difference, Checkout redirect, idempotent webhook); stub
  stays default (`af0f66d`). **58 Vitest tests, all green without Stripe keys.**
- **Phase 3 — Operator console** — staff-gated `/operator`; migration `0003`
  (`cc29b94`).
- **Phase 2 — Storage proof-image upload** — private `proofs` bucket, upload
  seam, signed URLs at render (`b9ab09e`).
- **Phase 4 — Interactive messaging** — customer + operator composers
  (`dca3bba`).
- **Phase 6 — Account writes** — save shipping country + display currency
  (`941a0d1`).
- **Phase 5 + 7 — Terms &amp; Privacy** — `/legal/terms`, `/legal/privacy`,
  footer links (this commit).
- Over-cap server guard, order-history refund display, Stripe env prep.
- **77 Vitest tests**, all green without Stripe keys.

**Pending operator/manual steps (no code):** Stripe **live test-mode smoke test**
(needs `sk_test_…`/`whsec_…` — see `docs/stripe-setup.md`); full lifecycle
click-through with real uploads + messaging.

---

## Remaining phases (recommended order)

### 1. Phase 8 — Hardening, CI, deploy  ▶ NEXT
**Goal:** productionize.
**Recommended decisions:**
- **CI:** GitHub Actions running `npm ci && npm run typecheck && npm run lint &&
  npm test && npm run build` on PRs.
- **Deploy:** Vercel project; set env (Supabase + `ESCROW_PROVIDER` +
  `STRIPE_*` + `NEXT_PUBLIC_SITE_URL`); apply all migrations to the prod DB.
- **Stripe prod:** register the production webhook endpoint
  (`/api/stripe/webhook`) + its signing secret; keep test mode for staging.
- **Final pass:** error boundaries, 404/500 pages, rate-limiting the create-
  request action, security review (`/security-review`) of the diff.

---

## Verification / manual steps (interleave as access allows)

- **Apply migrations** `0002` (escrow settlement), `0003` (staff role), and
  `0004` (storage proofs bucket) in the Supabase SQL editor; re-`npm run seed`.
- **Stripe live smoke test** (after you have test keys): set `ESCROW_PROVIDER=stripe`
  + `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` in `.env.local`; `stripe listen
  --forward-to localhost:3000/api/stripe/webhook`; walk create → checkout
  (`4242…`) → webhook flips held + sourcing → approve cheaper candidate → ship →
  confirm the real partial (difference) refund + a full refund on cancel.
  Steps in `docs/stripe-setup.md`.
- **First live click-through:** `npm run dev` against the seeded Supabase; eyeball
  every screen + the full lifecycle (customer + operator) against the prototype.

---

## "Finished app" definition of done

All phases above merged to `main`; migrations applied; Stripe live smoke test
passed in test mode; CI green; deployed to Vercel; a clean end-to-end
walkthrough (post request → fund → operator sources → approve → purchase →
receive → ship → release, with real images + messaging) works against the live
project. The five non-negotiable constraints hold throughout.
