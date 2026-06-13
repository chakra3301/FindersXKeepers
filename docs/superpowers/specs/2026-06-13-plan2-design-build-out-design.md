# Plan 2 — design build-out (spec)

**Date:** 2026-06-13
**Status:** approved design; ready for implementation plan
**Predecessor:** Plan 1 (`docs/superpowers/specs/2026-06-13-design-handoff-implementation-design.md`),
merged to `main` at `efff2a0`.
**Brief:** `docs/superpowers/plan2-build-out-brief.md`
**Locked reference design:** `design/handoff/Finders Keepers.dc.html`

## Goal

Build the remaining designed screens, wired to the existing stub seams. Every
screen is real UI; anything not built yet goes through the existing stub
interfaces and is clearly marked — no fake-but-hidden behavior. Customer-side
status changes flow through the real state machine via
`src/lib/requests/operations.ts` (`assertTransition`); nothing flips
`request.status` directly.

## Confirmed decisions

- **Escrow timing — fund at checkout, up to the cap.** Money moves **once**, at
  checkout, sized to the budget cap (a four-line *estimate*). Candidate approval
  is confirm-only: it locks the *real* four-line order (≤ the hold), no second
  money moment. The cheaper-item difference-refund is **Phase 1** — shown
  honestly, not implemented.
- **Brand wordmark — drop the ×.** User-facing strings become "Finders Keepers"
  (browser-tab `metadata.title`, login side-panel) to match the logo. Internal
  docs/CLAUDE.md are not user-facing and stay as-is.
- **`/` is public for everyone — no authed-user redirect.** Signed-in users see
  the landing too, so the sidebar's existing "View public site" → `/` link
  (`src/components/layout/sidebar.tsx:85`) works. The `(app)` group stays gated.
- **Build order (Approach C):** Foundation → Money spine (+ tests) → Read
  surfaces → Wire-up.

## The five non-negotiable constraints (carried through)

1. **Four-line pricing** (item / finder's fee / shipping / tax; total = sum) via
   `src/lib/pricing.ts`. 10% fee w/ ¥1,500 min, **rush folds into the fee** (no
   5th line), tax = 10% of the fee. The prototype's "12% / 7% / separate rush
   line" was rejected — do not reintroduce.
2. **Never hold raw customer funds** — escrow only through `src/lib/escrow`;
   release hangs off a shipment tracking number.
3. **特商法 footer link on every page** (`/legal/tokushoho`), reachable.
   Terms/Privacy stay placeholder non-links (no 404s).
4. **Prohibited-items checkpoint** stays real in the create-request action
   (unchanged by Plan 2).
5. **Escrow + lifecycle always visible**, showing **real** state — never imply
   funds are held when they aren't; never imply a difference-refund that isn't
   built.

---

## Section 1 — Foundation

### 1a. Routing split (`/` becomes public)

- `src/app/page.tsx` becomes the **public landing** (Server Component, no auth),
  living *outside* the `(app)` group so it does not inherit the sidebar/topbar
  shell.
- `src/lib/supabase/middleware.ts`: keep `/` public; **remove** any redirect of
  signed-in users away from `/`. Anonymous and authed users both see the
  landing. `(app)/*` stays fully gated → `/login?next=…` as today.
- The root `src/app/layout.tsx` already mounts `Footer` globally → 特商法 link
  present on the landing for free.

### 1b. Public landing page (`/`)

Server Component composing the locked design's sections: hero + proof card →
3-step "how it works" → dark escrow band with a **real four-line example** built
from `computeQuote`/`formatJpy` (not hardcoded) → "recent finds" strip → final
CTA → footer (global). CTAs route to `/requests/new` or `/login`. "Recent finds"
uses a **small static curated array** in the page module, flagged in a comment as
an illustrative showcase (not a DB query). No new dependencies.

### 1c. Brand wordmark cleanup

Drop the ×: update `metadata.title` (root layout) and the login side-panel copy
to "Finders Keepers". Grep user-facing "Finders × Keepers" strings and normalize.

**Constraints touched:** #3 (footer reachable on landing), #1 + #5 (landing's
escrow band uses honest computed pricing, implies no held funds for anyone).

---

## Section 2 — Money spine

Adds four thin operations to `src/lib/requests/operations.ts` (orchestrations
over primitives that already exist: `createEscrowHold`, `releaseEscrow`,
`recordShipment`, `setRequestStatus`) and three sub-routes of the detail page.
Every status flip goes through `assertTransition`.

### New operations

1. **`depositForRequest(requestId, rushTier)`** — if `rushTier` differs from the
   request's stored `rush_tier`, persist it first (the checkout rush selector is
   the source of truth) so the stored request and the estimate agree; build an
   **estimate** quote (`computeQuote` with `itemCostJpy = budget_cap_jpy`, the
   resolved rush, `shippingJpy = SHIPPING_ESTIMATE_JPY` — a clearly-named
   constant); call existing `createEscrowHold` for `totalJpy(estimate)`; then
   `setRequestStatus(open → sourcing)`. The single money-moment.
2. **`approveCandidate(requestId, candidateId)`** — create the **real** four-line
   order (`computeQuote` with `itemCostJpy = candidate.price_jpy`); mark the
   candidate `approved`; transition `candidate_sent → approved`. No new money
   moves. Order total ≤ hold whenever `price ≤ cap`.
3. **`keepHunting(requestId, candidateId)`** — mark the candidate `rejected`;
   transition `candidate_sent → sourcing`.
4. **`shipApprovedOrder(requestId)`** — load the order; call existing
   `recordShipment` with a **clearly-labeled demo tracking number**, which fires
   the real `releaseEscrow` + `received → shipped`. Real carrier handoff is
   Phase 3; the tracking value is honestly marked simulated. Release still hangs
   off a tracking number, never a manual flag.

### Tests for the four operations (first-class task)

Harness: a lightweight in-memory **fake of the admin client** + the **real**
in-memory escrow stub, so the orchestrations run end-to-end without a live DB.
Coverage:
- Each operation takes **only its legal edge** — illegal `from` states throw via
  `assertTransition`.
- `approveCandidate`: order is four lines and total **≤ the hold** when
  `price ≤ cap`.
- `shipApprovedOrder`: escrow release fires **only** with a non-null tracking
  number.

### 2a. Checkout / escrow deposit — `(app)/requests/[id]/checkout`

Reached from the wizard's final button (rerouted from `/dashboard` →
`/requests/[id]/checkout`) **and** from the detail page for an unfunded `open`
request. Shows the four-line **estimate** (item line labeled "up to your cap",
shipping labeled "estimated"), JPY + local-currency display
(`profiles.currency_pref`), a rush selector, and terms acceptance. Submit →
server action → `depositForRequest`.

**Copy guard (#5):** wording says the unused portion of the cap is **"returned to
you,"** never "released" (released = to us). No wording implies an automatic
difference-refund — that's Phase 1.

### 2b. Candidate approval — `(app)/requests/[id]/candidate`

Reachable when status is `candidate_sent`. Candidates come from **seed** (the
operator console that posts them is Phase 3). Shows listing photos
(`PlaceholderThumb` — Storage upload is Phase 2), source/seller (`listing_url`,
`notes`), and a **"checked against your cap" meter** = `candidate.price_jpy` vs
`budget_cap_jpy`.
- **Approve & buy** → `approveCandidate` (`candidate_sent → approved`).
- **Keep hunting** → `keepHunting` (`candidate_sent → sourcing`).
- **Over-cap variant** (`price > cap`): Approve disabled; explains
  re-authorization is needed (out of scope); only "Keep hunting" available.

### 2c. Item-received approval — `(app)/requests/[id]/received`

Reachable when status is `received`. Shows in-hand proof (`PlaceholderThumb`) +
a condition checklist (customer confirms the item matches). **Approve & ship** →
`shipApprovedOrder` → real escrow release → `shipped`.

### Lifecycle reachability (explicit)

`approved → purchased → received` are **operator/fulfillment hops (Phase 3, not
built)**. After a customer approves a candidate, the request honestly parks at
`approved` ("we're purchasing now"; no implied further customer action). The
candidate and received screens are reachable **only via seed** — confirmed: seed
#3 sits at `candidate_sent`, seed #6 at `received`.

**Two flagged stubs (approved):** `SHIPPING_ESTIMATE_JPY` (can't know real
shipping pre-sourcing; shown as an estimate, hold sized to cover it) and the
**simulated demo tracking number** in `shipApprovedOrder` (the only way "Approve
& ship" can fire the real release without an operator/carrier integration).

**Constraints touched:** #1 (four-line throughout), #2 (escrow only via the seam,
release on tracking), #5 (real escrow/lifecycle, over-cap + unfunded states
honest), #3 (footer global).

---

## Section 3 — Read surfaces

Read-mostly, independent of the money flow. Server Components read via
`queries.ts` (RLS-scoped; no `admin` client). Writes that aren't built yet render
live data but disable mutation with a visible Phase note — no fake send/save.

### 3a. Messages — `(app)/messages`

Two-pane: thread list (one row per request with messages) + conversation view.
Reads the real `messages` table. New queries: `getMessageThreads()` (group the
user's messages by `request_id`, newest first, with request title + last-message
preview) and `getThreadMessages(requestId)`. Composer is **rendered but
disabled** with an inline note that interactive send is Phase 4. `sender`
(`customer`/`team`) drives bubble alignment. Deep-linkable:
`/messages?request=<id>`.

### 3b. Order history — `(app)/history`

Closed/settled hunts — requests in `released`, `refunded`, `cancelled` with their
real `orders`. New query `getOrderHistory()`. Each row shows the four-line
`PriceBreakdown`, final `StatusBadge`/`EscrowBadge`, and a **"Reorder"** action
routing to `/requests/new` with original fields prefilled via query params the
wizard reads on mount (title/condition/budget/rush). No new write path — reorder
is navigation + prefill only.

### 3c. Account & settings — `(app)/account`

Reads the real `profiles` row (`shipping_country`, `currency_pref`). Sections:
shipping address, currency/language, payment method (**presentational** until
Phase 6), notification toggles (**presentational**). Controls render real current
values but are **read-only / disabled with a "saving is Phase 6" note** — account
*writes* are out of Plan 2 scope; nothing here mutates the DB.

**Scope confirmation:** all three writes stay stubbed in Plan 2 — message send
(Phase 4), account saves (Phase 6). The only exception is "Reorder"
(navigation + prefill).

---

## Section 4 — Wire-up & cross-cutting

### 4a. Sidebar nav

Add **Messages / Order history / Account** rows to
`src/components/layout/sidebar.tsx`, done **after** Section 3 so there are no dead
links. Active-route highlighting follows the existing dashboard-link pattern.

### 4b. Dashboard action-strip wiring

Action-needed CTAs route by status: `candidate_sent` →
`/requests/[id]/candidate`, `received` → `/requests/[id]/received`, `open` +
unfunded → `/requests/[id]/checkout`. Last step so every target exists. The
detail page also gets a **"Deposit into escrow"** CTA when
`status === "open" && escrowState === "none"`.

### 4c. Cross-cutting / done-criteria

- All status flips through `assertTransition`; no direct `status` writes.
- Server Components read via `queries.ts`; only operations use the `admin`
  client; no `admin` import in client components.
- New queries: `getMessageThreads` / `getThreadMessages`, `getOrderHistory`
  (RLS-scoped).
- `npm test` green (existing 16 + the four new operation tests).
- `npm run build` clean.
- `npm run dev` walk-through of every new route against the locked prototype.
- No dead links anywhere; any coverage caps (e.g. curated "recent finds") noted
  in comments.

## Reuse (Plan 1 helpers/components)

`src/lib/requests/display.ts` (`railProgress`, `escrowCaption`, `deadlineChip`,
`conditionLabel`), `src/lib/requests/status.ts` (tone maps,
`escrowStateFromPayments`), `src/components/ui/placeholder-thumb.tsx`,
`StatusBadge`, `EscrowBadge`, `LifecycleRail`, `PriceBreakdown`, layout
(sidebar/topbar/footer).

## Out of scope (later master-plan phases)

Real Stripe Connect + webhooks + auto-refund incl. the cap-vs-final
difference-refund (Ph1), Storage image upload (Ph2), operator/admin console that
posts candidates and drives `approved→purchased→received` (Ph3), real message
send + emails/notifications (Ph4), marketing sub-pages (Ph5), account writes
(Ph6), full Terms/Privacy + i18n (Ph7), hardening/CI/deploy (Ph8). The
**Explorations** board in the design is a tool artifact, not a screen.

## Sizing note

This is larger than Plan 1 (~7 screens + 4 ops + queries + routing). It holds as
one Plan 2; if it reads heavy at planning time, the clean cut is Section 3 (read
surfaces), which is independent of the money spine.
