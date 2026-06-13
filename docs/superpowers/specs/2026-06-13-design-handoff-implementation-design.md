# Design Handoff Implementation — Design Spec

**Date:** 2026-06-13
**Branch:** `design/handoff-implementation`
**Source design:** `design/handoff/Finders Keepers.dc.html` (Claude Design HTML prototype, committed into the repo as locked reference)

## Goal

Adopt the finalized visual system from the design handoff and bring the product
up to it: (1) replace the placeholder "warm washi paper / Fraunces" tokens with
the real system, (2) re-skin the existing Phase 0 surfaces to be pixel-faithful,
then (3) build out the remaining designed screens, each wired to the seams that
already exist (state machine, stubbed escrow, DB tables, seed data) and stubbing
only what genuinely isn't built yet.

This supersedes the "design tokens are intentionally swappable" note in
`CLAUDE.md` — the real design has landed.

## Non-negotiables carried through (the five constraints)

1. **Four-line pricing** — item cost / finder's fee / shipping / tax, stored and
   shown individually; `orders.total_jpy` is the generated sum. **See the
   Pricing Reconciliation below** — the prototype's 5th "Rush tier" line and its
   12% / 7% figures are NOT adopted; `src/lib/pricing.ts` is the source of truth.
2. **We never hold raw customer funds** — escrow flows through the processor seam
   (`src/lib/escrow`); release hangs off a shipment tracking number.
3. **Legal routes from day one** — `/legal/tokushoho` linked from the footer on
   every page. The new landing + app footer both link it.
4. **Prohibited-items checkpoint** stays real inside the create-request action.
5. **Escrow status + lifecycle always visible** — the design makes this central
   (trust banner, escrow mini in sidebar, escrow status card on detail).

## Pricing Reconciliation (flagged — constraint-touch point)

The prototype's `pricing()` differs from the implemented, constraint-compliant
agency model. **The code wins.** Concretely:

| Aspect | Prototype (design HTML) | `src/lib/pricing.ts` (source of truth) |
|---|---|---|
| Lines | 5 (adds "Rush tier") | **4** (item / finder / shipping / tax) |
| Finder's fee | 12% of item, no min | **10%** of item, **¥1,500 min** |
| Rush | separate 5th line (+¥3k/+¥8k) | **surcharges the finder's fee** (×1 / ×1.5 / ×2) |
| Shipping | flat ¥4,200 | an **input** (per-request estimate) |
| Tax | 7% of (item+finder+shipping) | **10% consumption tax on the finder's fee** (the taxable service supply; item is pass-through) |

**Decision:** UI uses `computeQuote`/`totalJpy` and the real figures. Rush is
reflected inside the finder's fee line (e.g. sublabel "incl. priority"), keeping
exactly four lines. Marketing copy that hard-codes "12%" is rewritten to match
the real model (or made non-numeric, e.g. "a transparent finder's fee").

## Stage / status mapping (design ↔ state machine)

The prototype's `FLOW` uses `match`; the real status is `candidate_sent`.
The UI label layer maps design names to real `RequestStatus`:

| `RequestStatus` | UI label | Pill tint |
|---|---|---|
| `open` | Open | slate |
| `sourcing` | Sourcing | blue |
| `candidate_sent` | Match found | amber |
| `approved` | Approved | blue |
| `purchased` | Purchased | blue |
| `received` | Received · review | amber |
| `shipped` | Shipped | blue |
| `released` | Released | green |
| `refunded` | Refunded | slate |
| `cancelled` | Cancelled | slate |

The prototype's `notFound` maps to a deadline-expiry outcome (`refunded` /
`cancelled`). Lifecycle rail renders the 8 happy-path statuses in order; the
current status is "current", earlier ones "done", later ones "todo".

## Approach (chosen)

**Extend the shadcn token layer with the full semantic palette.** Convert the
handoff hexes to oklch CSS variables in `globals.css`, mapped onto shadcn's
semantic slots, and add the colors shadcn doesn't ship but the design depends on:
`--success` (escrow green) and `--warning` (action amber), each with foreground/
muted-bg/border variants, plus the slate neutral text scale. Build all components
against tokens. (Rejected: inline hex like the prototype — violates the token
convention and CLAUDE.md; map-only-into-stock-shadcn — forces escrow-green/
action-amber to be one-off inline values, the very colors used most.)

## Design system

**Fonts:** drop Fraunces entirely. `Geist` (UI) + `Geist Mono` (ledger figures,
set codes, tracking numbers). Money/numeric uses `font-variant-numeric:
tabular-nums` (`.tnum`). The design uses weights 500 / 540 / 560 / 600 — Geist is
a variable font, so use those exact `font-weight` values (arbitrary values where
Tailwind lacks a step).

**Palette (light; ship light by default, keep `.dark` cohesive):**

- Ground `#FCFCFD` (app) / `#FFFFFF` (landing, cards); ink `#0F1115`.
- Muted text scale: `#475569`, `#6B7280`, `#9AA3AF`.
- Primary indigo `#1D4ED8`; tints `#EEF3FF` / `#F4F6FB` / `#F6F8FF`; focus ring
  `rgba(29,78,216,.1)`.
- Success green `#047857`; bg `#E8F6EF` / `#F7FBF8`; border `#DDEEE3` / `#E6EFE9`.
- Warning amber: text `#B45309`, dot `#D97706`; bg `#FDF4E7` / `#FFFBF3`; border
  `#F2DEB4`.
- Destructive red `#DC2626` / `#B42318`; bg `#FEF1F1`.
- Borders/dividers: `#EAECEF`, `#EEF0F3`, `#E5E7EB`, `#F4F5F7`, `#F1F2F4`.
- Slate neutral chip: bg `#F1F5F9`, fg `#475569`, dot `#94A3B8`.
- Dark band (escrow band on landing): bg `#0F1115`, card `#16191F`, border
  `#262B33`, accent `#9DB4E8`, text `#C5CAD3`.

**Radii:** buttons 9–12px, cards 14–20px, pills/chips full (`20–30px`).
**Shadows:** card `0 1px 2px rgba(15,17,21,.04)`; hover `0 8px 24px
rgba(15,17,21,.07)`; hero `0 18px 50px rgba(15,17,21,.08)`.
**Animations:** `fkpulse` (action dots), `fkfade` (entrance). Respect
`prefers-reduced-motion`.

**Placeholder imagery:** the prototype renders thumbnails as a diagonal hatch
(`repeating-linear-gradient(135deg,#F5F6F8…#EEF0F3)`) with a mono caption. Until
real images exist, reproduce this as a reusable `<PlaceholderThumb>` so proof/
listing/reference images degrade gracefully.

## Work-stream 1 — Foundation

- `src/app/globals.css`: replace the token block with the palette above
  (semantic vars in oklch + `--success`/`--warning` families); add `fkpulse`/
  `fkfade` keyframes and the hatch utility.
- `src/app/layout.tsx`: remove `Fraunces`; keep Geist + Geist Mono; drop
  `--font-heading`/Fraunces theme wiring.
- `CLAUDE.md`: rewrite the design-tokens section to describe the real system
  (Geist-only, clean white + blue-700, green/amber semantics).
- Commit the handoff bundle into `design/handoff/` as locked reference.

## Work-stream 2 — Re-skin Phase 0 (in place; keep file structure & seams)

App shell & sidebar (`components/layout/sidebar.tsx`, `(app)/layout.tsx`):
256px sidebar — logo, primary "New request" button, nav (Dashboard, My hunts w/
action count, Messages, Order history, Account), "Explorations" nav item
dropped, escrow-mini card (total held across N active hunts), "View public site"
link to landing.

Dashboard (`(app)/dashboard/page.tsx`, `components/dashboard/*`): header; **escrow
trust banner** (green, total held across N hunts); **action-needed strip** (amber,
pulsing dot, cards for requests needing the user); **all-hunts** list of
horizontal request cards. Empty state preserved. `request-card.tsx` rewritten to
the "Horizontal" anatomy (thumb 62×84 · name + pill · set·grade mono · 8-segment
progress bar · stage caption + "updated Xago" · money block right with escrow
caption / ¥ / local / deadline chip). `stats.tsx`, `empty-state.tsx`,
`status-badge.tsx`, `escrow-badge.tsx` reskinned to tokens.

Request detail (`(app)/requests/[id]/page.tsx`, `components/requests/*`): header
(thumb, name, pill, set·grade, progress bar, escrow figure); action banner when
attention needed; two-column grid — LEFT: **vertical lifecycle rail**
(`lifecycle-rail.tsx`, dot+line timeline with timestamps), proof-photos grid,
hunter updates feed + "Message your hunter"; RIGHT: **four-line pricing card**
(`price-breakdown.tsx`), escrow-status card, tracking card (when `shipped`),
review CTA (→ candidate) / over-cap CTA.

Create flow (`(app)/requests/new/page.tsx`, `request-form.tsx`): 6-step wizard —
(0) item + reference link + reference photo, (1) condition ladder, (2)
must-haves / nice-to-haves chips, (3) budget cap with live finder-fee preview
(real `computeFinderFee`), (4) rush tier, (5) review → "Continue to escrow
deposit". Segmented step indicator. Server action keeps the prohibited-items
checkpoint. Wizard state client-side; submit creates the request via the
existing action and routes to checkout.

## Work-stream 3 — Build out remaining screens (wired to existing seams)

Each is real UI; unbuilt backend goes through existing stub interfaces, clearly
marked. No fake-but-hidden behavior.

- **Landing** (`/`, public): full marketing page (nav, hero + proof card, 3
  steps, dark escrow band w/ four-line example, recent finds, final CTA, footer
  w/ 特商法 link). Routing change below. Fee copy per Pricing Reconciliation.
- **Checkout / escrow deposit** (new route, e.g. `(app)/requests/[id]/checkout`):
  four-line summary (real `computeQuote`), JPY + local display, rush selector
  (re-quotes), terms acceptance, "Place request · ¥X held" → calls
  `escrow.hold()` **stub** seam; on success transitions `open → sourcing` is NOT
  auto-done here (sourcing is an operator step) — deposit records a payment via
  the stub and keeps status `open`. "Secured by Stripe" chip. (Real Stripe
  Connect, manual capture, webhooks = Phase 1, behind the same seam.)
- **Candidate approval** (`…/candidate`): listing photos + source/seller/
  condition + hunter note; "Checked against your cap" meter (real `found` vs
  `budget_cap_jpy`); Approve & buy → `operations` transition `candidate_sent →
  approved`; Keep hunting → `candidate_sent → sourcing`. Over-cap variant. Candidate
  rows come from **seed data** (operator console that posts candidates is Phase 3).
- **Item-received approval** (`…/received`): in-hand proof photos, condition
  checklist; Approve & ship → drives `received → shipped` only via the shipment/
  tracking path (`operations.recordShipment`), which triggers the escrow release
  stub; "Raise a concern" stub. Proof images = `<PlaceholderThumb>` until Storage.
- **Messages** (`(app)/messages`): thread list (per hunt) + conversation; reads
  the `messages` table; composer **send is stubbed** (interactive messaging =
  Phase 4). Hunter identity is presentational.
- **Order history** (`(app)/history`): table of closed/refunded hunts from real
  `orders`/`requests` reads; status chips; "Reorder" = duplicate-request shortcut
  (prefills create flow).
- **Account & settings** (`(app)/account`): shipping address, currency/language,
  payment method (presentational until Phase 6), notification toggles. Reads the
  real `profiles` row; writes that already have a home are wired, the rest are
  visual.

## Routing change — landing

`src/app/page.tsx` stops redirecting to `/dashboard`. `/` renders the **public
landing**. Authenticated users still get there (the app's "View public site"
link). `src/proxy.ts` / `lib/supabase/middleware.ts` gating updated so `/` is
public while the `(app)` group stays auth-gated (unauth → `/login`). Landing CTAs
("Make a request", "Sign in") route to create/login.

## Out of scope (this effort)

- The **Explorations** board — a design-tool artifact (A/B/C option compare), not
  a product screen. Not built.
- **Operator/admin console** (Phase 3) — not in the design. Candidate/proof data
  comes from seed/admin for now so the customer-side approval loop is drivable.
- **Real** Stripe Connect + webhooks (Phase 1), interactive message send +
  notifications (Phase 4), Storage image upload (Phase 2), full account writes
  (Phase 6). All stay behind their existing seams/stubs.
- Marketing sub-pages (How it works / Pricing / Trust & safety) beyond the
  landing itself — nav links can anchor/placeholder.

## Testing

- Money & transitions get tests (cross-cutting rule). `pricing.ts` already has
  the math; add tests for any new label/quote helpers and for the
  candidate-approve / received-ship handlers asserting they go through
  `assertTransition` (no scattered status flips).
- Visual surfaces: rely on existing typecheck/lint; no snapshot tooling added.

## Open decisions (confirm at spec review)

1. **Pricing reconciliation** (above): confirm we follow `pricing.ts` (four
   lines, 10%/¥1,500 min, rush-in-fee, tax-on-fee) and rewrite the prototype's
   "12% / 7% / 5th line" copy to match. *(Recommended.)*
2. **Checkout route shape**: deposit lives at `(app)/requests/[id]/checkout`
   after the request is created (vs. a pre-creation checkout). Recommended:
   create request first (so the prohibited check + budget are persisted), then
   deposit.
3. **Sidebar nav**: "Dashboard" and "My hunts" in the prototype both open the
   dashboard. Consolidate to one "Dashboard" entry (drop the duplicate) unless a
   distinct "My hunts" view is wanted.
