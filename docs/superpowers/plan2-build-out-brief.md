# Next-phase brief — Plan 2: design build-out

**Use this to start a fresh chat.** Paste: *"Read docs/superpowers/plan2-build-out-brief.md and let's start Plan 2."*

## Where we are (as of 2026-06-13)

- **Plan 1 is merged to `main`** (`efff2a0`): the finalized design handoff was adopted
  and the existing Phase-0 surfaces were re-skinned. The app is now on the real
  system — **Geist-only** type (no serif), clean near-white ground, **blue-700
  `#1D4ED8`** primary, **emerald `#047857`** escrow/trust, **amber `#B45309`**
  action-needed, exposed as `--success`/`--warning` token families in
  `src/app/globals.css`. Vitest added; `pricing.ts` + `src/lib/requests/display.ts`
  are tested (16 tests).
- **Built today:** app shell/sidebar (escrow-mini), dashboard (trust banner +
  action strip + horizontal cards), request detail (lifecycle rail, four-line
  pricing, **real** escrow state, proof placeholders, hunter updates, tracking),
  6-step create wizard. Login/footer/logo reskinned.
- **Reference design (locked):** `design/handoff/Finders Keepers.dc.html`.
- **Plan 1 spec/plan:** `docs/superpowers/specs/2026-06-13-design-handoff-implementation-design.md`,
  `docs/superpowers/plans/2026-06-13-design-foundation-and-phase0-reskin.md`.
- **Run it:** dev server (`npm run dev`); demo login `demo@finderskeepers.test` /
  `concierge123`; `npm run seed` if the dashboard is empty.

## Plan 2 scope — build the remaining designed screens, wired to existing seams

Each is real UI; what isn't built yet goes through the existing stub interfaces
and is clearly marked (no fake-but-hidden behavior). Drive customer-side approval
through the real state machine via `src/lib/requests/operations.ts`
(`assertTransition`) — never flip status directly.

1. **Public landing** (`/`): currently `/` redirects to `/dashboard`. Make `/`
   the public landing (hero + proof card, 3 steps, dark escrow band w/ four-line
   example, recent finds, final CTA, footer). Keep `/dashboard` for logged-in
   users; update `src/proxy.ts` / `lib/supabase/middleware.ts` so `/` is public
   while the `(app)` group stays auth-gated. CTAs → create/login.
2. **Checkout / escrow deposit** (e.g. `(app)/requests/[id]/checkout`): four-line
   summary via `computeQuote`/`totalJpy`, JPY + local display, rush selector,
   terms acceptance → calls the **`escrow.hold()` stub** seam (`src/lib/escrow`).
   Recommended: request is created first (so the prohibited check + budget
   persist), then deposit. The create wizard's final button currently says
   "Post request" → `/dashboard`; in Plan 2 it should route into this checkout.
3. **Candidate approval** (`…/candidate`): listing photos + source/seller +
   "checked against your cap" meter; Approve&buy → `candidate_sent → approved`,
   Keep hunting → `candidate_sent → sourcing`; over-cap variant. Candidates come
   from **seed data** (operator console that posts them is Phase 3).
4. **Item-received approval** (`…/received`): in-hand proof + condition checklist;
   Approve&ship drives `received → shipped` **only** via the shipment/tracking
   path (`operations.recordShipment`), which triggers the escrow-release stub.
5. **Messages** (`(app)/messages`): thread list + conversation; reads the
   `messages` table; **send is stubbed** (interactive messaging = Phase 4).
6. **Order history** (`(app)/history`): closed/refunded hunts from real
   `orders`/`requests`; "Reorder" prefills the create flow.
7. **Account & settings** (`(app)/account`): shipping address, currency/language,
   payment method (presentational until Phase 6), notification toggles; reads the
   real `profiles` row.
8. **Sidebar nav:** add Messages / Order history / Account rows once those routes
   exist (they were intentionally omitted in Plan 1 to avoid 404s).

**Out of scope for Plan 2** (later master-plan phases): real Stripe Connect +
webhooks + auto-refund (Ph1), real message send + emails/notifications (Ph4),
Storage image upload (Ph2), operator/admin console (Ph3), marketing sub-pages
(Ph5), account writes (Ph6), full Terms/Privacy + i18n (Ph7), hardening/CI/deploy
(Ph8). The **Explorations** board in the design is a tool artifact — not a screen.

## Non-negotiables to carry through (the five constraints)

1. **Four-line pricing** (item / finder's fee / shipping / tax; total = sum).
   Use `src/lib/pricing.ts` — 10% fee w/ ¥1,500 min, **rush folds into the fee**
   (no 5th line), tax = 10% of the fee. The prototype's "12% / 7% / separate rush
   line" was **rejected** — don't reintroduce it.
2. **Never hold raw customer funds** — escrow only through the `src/lib/escrow`
   seam; release hangs off a shipment tracking number.
3. **特商法 footer link on every page** (`/legal/tokushoho`) — and it must stay
   *reachable* (the app `<main>` no longer caps scroll). Terms/Privacy are
   placeholder spans until Phase 7 — keep them non-links (no 404s).
4. **Prohibited-items checkpoint** stays real in the create-request action.
5. **Escrow + lifecycle always visible.** Show **real** escrow state, never imply
   funds are held when they aren't (see the dashboard funded-filter and the
   detail page's `escrowStateFromPayments` usage — mirror that pattern).

## Conventions / gotchas

- **base-ui, not Radix:** link-styled buttons use `buttonVariants()` on a
  `<Link>`, never `asChild`. Custom font weights `font-[540]`/`font-[560]` are
  valid (Geist variable).
- Helpers to reuse: `src/lib/requests/display.ts` (`railProgress`,
  `escrowCaption`, `deadlineChip`, `conditionLabel`), `src/components/ui/
  placeholder-thumb.tsx`, `StatusBadge`/`EscrowBadge`, `LifecycleRail`,
  `PriceBreakdown`.
- **No dead links** to routes that don't exist yet; `log`/note any coverage caps.
- Tone/status colors flow through `src/lib/requests/status.ts` tone maps.
- Tests for money/state logic (Vitest is set up: `npm test`).

## Open decision to confirm with the user

- **Brand wordmark:** the logo now reads **"Finders Keepers"** (per the design),
  but the browser-tab `metadata.title` and the login side-panel still say
  **"Finders × Keepers"**. Decide: drop the **×** everywhere, or keep it as the
  formal brand. (Not yet changed.)

## How to start

Per the working protocol: **plan-first.** Brainstorm Plan 2 scope/sequence with
the user → write the implementation plan (`writing-plans`) → execute task-by-task
(`subagent-driven-development`) with spec + quality review per task, exactly like
Plan 1.
