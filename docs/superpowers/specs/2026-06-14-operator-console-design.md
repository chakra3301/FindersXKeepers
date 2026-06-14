# Operator console (Phase 3) — design spec

**Date:** 2026-06-14
**Status:** approved design; ready for implementation plan
**Predecessor:** Phase 1 Effort 2 (real Stripe), on `main` at `af0f66d`.

## Goal

Give the team a staff-gated console to drive the fulfillment hops the customer
can't: post candidates (`sourcing → candidate_sent`), mark purchased
(`approved → purchased`), mark received (`purchased → received`). Today those hops
and the candidate/received screens are reachable only via seed; this makes the
full lifecycle real end-to-end. Customer keeps deposit / approve / final-ship.

## Confirmed decisions

- **Staff identity = `is_staff` flag on `profiles`** (migration `0003`). A
  `requireStaff()` gate protects `/operator`. Cross-user reads/writes use the
  **service-role admin client** (no RLS rewrite). The seed marks the demo user
  `is_staff = true` so one login demos both sides.
- **`is_staff` is service-role-only writable.** A customer using the anon client
  must NOT be able to self-promote — lock the profiles UPDATE path (see §1).
- **Scope = core hops + image URLs.** Operator queue + post-candidate
  (price / listing URL / notes / **image URLs**) + mark-purchased + mark-received
  (with optional **proof image URLs**). Image URLs are text input now; real
  Storage upload is **Phase 2**. Interactive messaging is **Phase 4**.

## The five non-negotiable constraints (carried through)

1. **Four-line pricing** — the operator posts a *candidate price*; the four-line
   order is still created by the customer's `approveCandidate`. Unaffected.
2. **Never hold raw funds / release on tracking** — operator hops move NO money
   (purchased/received are status-only); escrow release stays the customer's
   ship action. Unaffected.
3. **特商法 footer** — unaffected (operator routes render under the root layout's
   global footer).
4. **Prohibited-items checkpoint** — unaffected.
5. **Escrow + lifecycle show REAL state** — operator actions go through
   `assertTransition`; nothing fakes status.

---

## Section 1 — Auth & the staff role

- **Migration `supabase/migrations/0003_staff_role.sql`:**
  ```sql
  alter table profiles add column is_staff boolean not null default false;
  ```
  Plus a guard so only the service-role can set it. Verify the existing profiles
  UPDATE policy and, if owners can update their own row, add a trigger that
  rejects `is_staff` changes unless `auth.role() = 'service_role'`:
  ```sql
  create or replace function prevent_self_staff_promotion()
  returns trigger language plpgsql as $$
  begin
    if new.is_staff is distinct from old.is_staff
       and auth.role() <> 'service_role' then
      raise exception 'is_staff can only be changed by the service role';
    end if;
    return new;
  end $$;
  create trigger profiles_no_self_staff
    before update on profiles
    for each row execute function prevent_self_staff_promotion();
  ```
- **`Profile` type** (`src/lib/db/types.ts`) gains `is_staff: boolean`.
- **`requireStaff()`** in `src/lib/auth.ts`: resolve user (→ `/login` if none) +
  profile; redirect to `/dashboard` if `!profile?.is_staff`. Returns
  `{ user, profile }`. Reads the profile via the RLS client (own row → `is_staff`
  is readable).
- **Seed** (`scripts/seed.ts`): after creating the demo user, set its profile
  `is_staff = true` (service-role update).

## Section 2 — New operations (TDD, fake-admin harness)

Thin assert-then-write orchestrations in `src/lib/requests/operations.ts`:

- **`postCandidate(requestId, input, admin)`** where
  `input = { priceJpy: number; listingUrl?: string | null; notes?: string | null; listingImages?: string[] }`:
  load request status → `assertTransition(status, "candidate_sent")` → insert a
  candidate (`status: 'proposed'`, `listing_images: input.listingImages ?? []`)
  → `setRequestStatus(requestId, "candidate_sent", admin)`. Asserts before any
  write (illegal `from` → no orphan candidate).
- **`markPurchased(requestId, admin)`** → `setRequestStatus(approved → purchased)`.
- **`markReceived(requestId, input, admin)`** where
  `input = { receivedImageUrls?: string[] }`: load the latest order; if URLs
  given, update its `received_image_urls`; then
  `setRequestStatus(purchased → received)`. Assert legality before writing.

**Tests:** each takes only its legal edge; illegal `from` throws via
`assertTransition` with no writes; `postCandidate` inserts a `proposed` candidate
and moves to `candidate_sent`; `markReceived` writes the proof URLs onto the
order. Use the shared harness at `src/lib/test-support/fake-admin.ts`.

## Section 3 — Cross-user queue, routes, gating

- **`getOperatorQueue()`** — new `src/lib/requests/operator-queries.ts` using the
  **service-role admin client** (the single deliberate cross-user read). Returns
  all non-terminal requests (exclude `released`/`refunded`/`cancelled`) with
  title, status, `budget_cap_jpy`, customer id, and the latest candidate/order,
  bucketed by the action needed: `needs_candidate` (sourcing),
  `needs_purchase` (approved), `needs_receive` (purchased), plus `in_progress`
  (open / candidate_sent / received / shipped) for visibility. **Only called from
  staff-gated pages.** Mirrors the existing in-memory-join query style.
- **Routes** under `src/app/operator/` with its own `layout.tsx` that calls
  `requireStaff()` (so every operator page is gated; non-staff → `/dashboard`):
  - `/operator` — the queue, grouped by bucket; each row links to the detail.
  - `/operator/[id]` — operator request detail showing the status-appropriate
    action: a **post-candidate form** (sourcing), a **Mark purchased** button
    (approved), a **Mark received** form with optional proof-URL inputs
    (purchased), or a read-only status note otherwise.
- **Server actions** (`src/app/operator/[id]/actions.ts`):
  `postCandidateAction`, `markPurchasedAction`, `markReceivedAction` — each
  `await requireStaff()` first, then call the operation (admin), `revalidatePath`,
  and `redirect`. `redirect()` stays outside any try/catch.
- **Nav:** the customer sidebar (`src/components/layout/sidebar.tsx`) shows an
  "Operator console" → `/operator` link **only when `is_staff`** (the `(app)`
  layout already loads the profile; thread `isStaff` to the sidebar).

## Section 4 — Honesty, testing, scope

- **Honesty:** image URLs are real (render via `<img>` with a `PlaceholderThumb`
  fallback); real Storage upload is openly **Phase 2**. The console is plainly a
  team surface; customer-facing screens are unchanged.
- **Testing:** the 3 operations are TDD'd with the fake-admin harness;
  `getOperatorQueue` + the screens + `requireStaff` redirect are verified by
  `npm run build` + a dev walkthrough (cross-user read + auth redirect need a
  live DB/session). `npm test` green (existing 58 + the new operation tests);
  typecheck / lint / build clean.
- **Out of scope:** real image upload (Ph2), interactive customer↔team messaging
  (Ph4), multi-staff management / audit log, account writes (Ph6).

## New / changed files (for the plan)

- New: `supabase/migrations/0003_staff_role.sql`, `src/lib/requests/operator-queries.ts`,
  `src/app/operator/layout.tsx`, `src/app/operator/page.tsx`,
  `src/app/operator/[id]/page.tsx`, `src/app/operator/[id]/actions.ts`,
  operator UI components (queue rows, candidate form, mark-received form).
- Modified: `src/lib/db/types.ts` (`Profile.is_staff`), `src/lib/auth.ts`
  (`requireStaff`), `src/lib/requests/operations.ts` (3 ops) + its test,
  `scripts/seed.ts` (demo user staff), `src/app/(app)/layout.tsx` +
  `src/components/layout/sidebar.tsx` (conditional nav link).

## Done criteria

- Migration `0003` applies; `is_staff` not self-settable by customers.
- `requireStaff()` gates `/operator`; non-staff redirect to `/dashboard`.
- The 3 operations land their legal edges (assert-then-write) and are unit-tested.
- The operator can drive a seeded `open` request through the full lifecycle
  (deposit as customer → operator posts candidate → customer approves → operator
  marks purchased → marks received → customer ships) without seed hacks.
- `npm test` / typecheck / lint / build green.

## Operator step

Apply `supabase/migrations/0003_staff_role.sql` (and `0002` if not yet applied)
in the Supabase SQL editor before a live run; re-seed to mark the demo user staff.
