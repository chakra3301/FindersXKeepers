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
- Over-cap server guard, order-history refund display, Stripe env prep.

**Pending operator/manual steps (no code):** apply `supabase/migrations/0002`
(and `0003` once Ph3 lands) in the Supabase SQL editor; the Stripe **live
test-mode smoke test** (needs `sk_test_…`/`whsec_…` — see `docs/stripe-setup.md`);
a first live `npm run dev` click-through against seeded data.

---

## Remaining phases (recommended order)

### 1. Phase 3 — Operator console  ▶ NEXT, spec ready
**Spec:** `docs/superpowers/specs/2026-06-14-operator-console-design.md` (approved).
Skip brainstorming → run **writing-plans** then **subagent-driven-development**.
Staff-gated `/operator`; `is_staff` on profiles (migration `0003`); post-candidate
+ mark-purchased + mark-received ops; cross-user queue via service-role; image
URLs now (real upload = Ph2). Makes the full lifecycle reachable without seed.

### 2. Phase 2 — Storage proof-image upload
**Goal:** real image uploads replacing `PlaceholderThumb` + the Ph3 URL inputs.
**Recommended decisions:**
- Supabase **Storage** with a private bucket (e.g. `proofs`); RLS so a customer
  reads images for their own requests, staff read/write all, via signed URLs.
- Upload paths: operator candidate form (listing images) + mark-received (proof)
  + customer reference image on request creation.
- Store object paths in existing columns (`candidates.listing_images`,
  `orders.received_image_urls`, `requests.reference_image_url`); render via signed
  URLs.
- Keep a thin seam (`src/lib/storage/`) like the escrow seam so it's swappable
  and testable; unit-test the path/URL logic, verify upload live.
**Scope out:** image processing/resizing, CDN tuning.

### 3. Phase 4 — Interactive messaging
**Goal:** make the messages composer actually send (currently disabled).
**Recommended decisions:**
- `sendMessage(requestId, body)` server action: customer inserts `sender:'customer'`
  (RLS owner-insert already allows it); operator/staff inserts `sender:'team'`
  behind `requireStaff()`. Validate non-empty/length.
- Wire the composer in `messages-view.tsx` (remove the disabled note) + a reply
  box in `/operator/[id]`. `revalidatePath` / router refresh; no optimistic
  complexity needed first.
**Scope out:** email/push notifications, realtime subscriptions, attachments
(those are a later pass).

### 4. Phase 6 — Account writes
**Goal:** make the account screen save (currently read-only).
**Recommended decisions:**
- `updateProfile({ shippingCountry, currencyPref })` server action (RLS owner
  update — but ensure it CANNOT touch `is_staff`, consistent with the Ph3 guard).
- Wire the disabled controls in `account/page.tsx` (make it a client form with a
  server action); validate currency against `SUPPORTED_CURRENCIES`.
**Scope out:** email/password change, payment-method management (Stripe billing
portal is a later add).

### 5. Phase 5 — Marketing sub-pages + Phase 7 — Terms/Privacy
**Goal:** fill the placeholder footer links and any landing CTAs.
**Recommended decisions:**
- Real **Terms** + **Privacy** pages under `/legal/*`; make the footer
  `Terms`/`Privacy` spans into real links (they're non-links today to avoid
  404s — once the pages exist, link them). 特商法 already exists.
- Optional marketing pages (how-it-works/pricing/FAQ) only if desired — the
  landing already covers the core pitch. Keep YAGNI.
- i18n (JP/EN) is a larger effort; **defer** unless explicitly wanted — if done,
  scope to copy/dictionary + a locale switch, its own spec.

### 6. Phase 8 — Hardening, CI, deploy  ▶ LAST
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

- **Apply migrations** `0002` (escrow settlement) and `0003` (staff role, after
  Ph3) in the Supabase SQL editor; re-`npm run seed`.
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
