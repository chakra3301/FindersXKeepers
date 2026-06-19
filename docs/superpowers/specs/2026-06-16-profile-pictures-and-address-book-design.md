# Profile pictures & saved shipping addresses — design

**Date:** 2026-06-16
**Status:** Approved for planning

## Goal

Let signed-in buyers personalize their account and check out faster by:

1. Uploading a **profile picture** that shows on the account page and in the app nav.
2. Keeping a **book of saved shipping addresses** (multiple, with one default) in
   settings, reused when funding a hunt at checkout.

Motivation: faster, lower-friction checkout and a more finished account area.
This is buyer-facing only; no operator/staff surface changes.

## Decisions (locked during brainstorming)

- **Addresses:** multiple per user, one marked default. New `addresses` table.
- **Reach:** build the address book in settings **and** wire address selection
  into the escrow checkout flow.
- **Avatar placement:** account page **and** the app top-bar user menu.
- **Checkout gate:** selecting an address at checkout is **optional** — deposit
  is never blocked on it; the address is collected/confirmed later if missing.
- **Avatar handling:** **simple client-side upload** (validate type + size,
  store as-is). **No crop UI** — avoids a new dependency (CLAUDE.md stack gate).
- **Address persistence on a request:** **snapshot** the chosen address as JSON
  onto the request at deposit time, *not* a foreign key. If the buyer later
  edits or deletes the saved address, the destination already committed for that
  hunt stays frozen — important for the lifecycle/trust guarantees.

## Non-goals

- No cropping/resizing pipeline for avatars.
- No changes to the presentational notification or payment-method sections.
- The existing shipping-country + display-currency form stays as-is (it drives
  customs/currency *estimates*, a separate concern from a postal address).
- No operator-side rendering of buyer avatars or addresses.
- No edit of an address already snapshotted onto a request.

## Data model — migration `supabase/migrations/0005_profile_avatars_addresses.sql`

Follows the conventions in `0001_init.sql` (owner-only RLS, `type` aliases in
`src/lib/db/types.ts`, not `interface`).

### `avatars` storage bucket (public)
- Public bucket so the nav can render `<img>` with no signed-URL plumbing;
  avatars are not sensitive.
- Storage RLS: a user may `insert`/`update`/`delete` only objects whose path is
  under their own `{auth.uid()}/…` prefix; `select` is public.

### `profiles.avatar_url text` (nullable)
- Stores the public URL of the current avatar (or `null`).

### `addresses` table
| column          | type        | notes                                         |
|-----------------|-------------|-----------------------------------------------|
| `id`            | uuid pk     | `default gen_random_uuid()`                   |
| `user_id`       | uuid        | `references auth.users(id) on delete cascade` |
| `recipient_name`| text not null |                                             |
| `line1`         | text not null |                                             |
| `line2`         | text        | nullable                                      |
| `city`          | text not null |                                             |
| `region`        | text        | state/prefecture/province, nullable           |
| `postal_code`   | text not null |                                             |
| `country`       | text not null | 2-letter code from `SHIPPING_COUNTRIES`     |
| `phone`         | text        | nullable                                      |
| `is_default`    | boolean not null default false |                            |
| `created_at`    | timestamptz not null default now() |                        |

- **RLS:** owner-only `select/insert/update/delete` mirroring the `profiles_*`
  policies (`auth.uid() = user_id`).
- **One default per user:** partial unique index
  `create unique index addresses_one_default_per_user on addresses (user_id) where is_default;`

### `requests.shipping_address jsonb` (nullable)
- Snapshot written at deposit when the buyer picked an address. Shape mirrors the
  `addresses` row fields (no `id`/`user_id`/`is_default`/timestamps).

## Code structure

### `src/lib/addresses/` (new — mirrors `src/lib/profile/`)
- `types.ts` — `Address` row type + `AddressSnapshot` (the jsonb shape).
- `validation.ts` — zod `addressSchema` (country constrained to
  `SHIPPING_COUNTRIES`, required fields trimmed/non-empty).
- `queries.ts` — `listAddresses(userId, supabase)` ordered default-first.
- `operations.ts` — owner-scoped `createAddress`, `updateAddress`,
  `deleteAddress`, `setDefaultAddress` (setting one default clears the others in
  a single transaction-like sequence). Each verifies ownership via RLS + `user_id`.

### Account route — `src/app/(app)/account/`
- `actions.ts` — add server actions: `saveAvatarAction` (persists `avatar_url`
  after client upload; also a `removeAvatarAction`), and address CRUD actions
  (`createAddressAction`, `updateAddressAction`, `deleteAddressAction`,
  `setDefaultAddressAction`). Each calls `requireUser()`, validates, delegates to
  the lib, then `revalidatePath("/account")`.
- `page.tsx` — add two sections above the existing ones:
  - **Profile** — avatar with upload/replace/remove.
  - **Shipping addresses** — list with a Default badge, add/edit/delete,
    "Make default."

### Components — `src/components/account/`
- `avatar-uploader.tsx` (client) — file input, validates type
  (`image/png|jpeg|webp`) and size (≤ ~3 MB), uploads to the `avatars` bucket via
  the **browser** Supabase client (`src/lib/supabase/client.ts`) at
  `{user_id}/avatar-<timestamp>.<ext>`, then calls `saveAvatarAction` with the
  resulting public URL. Shows current avatar + fallback initial; remove button.
- `address-book.tsx` (client) — renders the list and an add/edit form
  (modal or inline), wired to the address server actions via `useActionState`,
  matching the existing `account-settings-form.tsx` styling.

### Nav avatar
- `src/app/(app)/layout.tsx` already fetches `profile`; pass
  `profile?.avatar_url` into `Topbar` → `UserMenu`.
- `UserMenu` renders `AvatarImage src={avatarUrl}` with the existing
  `AvatarFallback` initial as the fallback.

### Checkout wiring — `src/app/(app)/requests/[id]/checkout/`
- `page.tsx` — also load `listAddresses(...)`; pass `addresses` + the default's
  id into `CheckoutForm`.
- `checkout-form.tsx` — add an **optional** address selector above the authorise
  box: a list/select of saved addresses (default pre-selected) plus an
  "Add a new address" affordance, and a "Ship later / decide later" no-op state.
  Emits the chosen address id in a hidden field. Deposit is **never** disabled by
  this.
- `actions.ts` (`submitDeposit`) — if an address id is present and owned by the
  user, build the snapshot and pass it through.
- `src/lib/requests/operations.ts` (`depositForRequest`) — accept an optional
  `shippingAddress` snapshot and write it to `requests.shipping_address` as part
  of the deposit.

### Later collection (lightweight)
- On the request detail page, when a request is funded but
  `shipping_address` is null, show a small "Add shipping address" affordance that
  opens the same address selector and writes the snapshot. (Detail-page wiring
  kept minimal; no new state-machine transition — `shipping_address` is plain
  request data, not a status.)

## Data flow

**Avatar:** account page → `avatar-uploader` validates → browser Supabase client
uploads to `avatars/{uid}/…` → public URL → `saveAvatarAction` writes
`profiles.avatar_url` → `revalidatePath("/account")`; nav reflects it on next
layout fetch.

**Address book:** account page → `address-book` form → address server action →
`operations.ts` → `addresses` table (RLS-scoped) → `revalidatePath("/account")`.

**Checkout:** checkout page loads addresses → `CheckoutForm` pre-selects default
→ buyer optionally confirms/changes → hidden address id → `submitDeposit`
resolves + validates ownership → snapshot → `depositForRequest` writes
`requests.shipping_address`.

## Error handling

- All writes go through owner-scoped server actions; RLS is the backstop.
- Address form: field-level zod errors surfaced like `account-settings-form.tsx`.
- Avatar upload: client surfaces type/size rejection before upload; upload or
  save failure shows an inline error and leaves the prior avatar intact.
- Deleting the default address: allowed; the book simply has no default until one
  is set (checkout then pre-selects nothing). No orphaned request data because
  requests hold snapshots, not FKs.
- Checkout with a since-deleted/again-edited address: snapshot already frozen on
  the request; unaffected.

## Testing

- `src/lib/addresses/validation.test.ts` — required fields, country constraint,
  trimming, optional fields (mirrors `profile/validation.test.ts`).
- `operations.ts` default-exclusivity logic — setting a new default clears the
  prior one; deleting default leaves none.
- Manual: upload/replace/remove avatar and confirm it appears in nav; add/edit/
  delete/default addresses; checkout pre-selects default and snapshots onto the
  request; deposit still works with no address selected.

## Open files of reference

- `src/lib/profile/{validation,update,countries}.ts` — pattern to mirror.
- `src/components/account/account-settings-form.tsx` — form styling/state pattern.
- `src/components/layout/{topbar,user-menu}.tsx` — nav avatar.
- `src/app/(app)/requests/[id]/checkout/{page,checkout-form,actions}.tsx` and
  `src/lib/requests/operations.ts` — checkout wiring.
- `supabase/migrations/0001_init.sql` — schema + RLS conventions.
