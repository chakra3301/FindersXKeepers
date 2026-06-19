# Profile pictures & saved address book — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let buyers upload a profile picture (shown on the account page and in the nav) and keep a book of saved shipping addresses, reused — optionally — at escrow checkout where the chosen address is snapshotted onto the request.

**Architecture:** Mirror the existing `src/lib/profile/` slice. A new `0005` migration adds a public `avatars` bucket, `profiles.avatar_url`, an owner-scoped `addresses` table (one default per user), and a `requests.shipping_address` jsonb snapshot. New `src/lib/addresses/` holds validation/queries/operations. Account-page server actions delegate to these. The avatar is uploaded client-side via the browser Supabase client to the public bucket, then its URL is persisted by a server action. Checkout loads the address book, pre-selects the default, and the deposit action writes the snapshot.

**Tech Stack:** Next.js 16 App Router, TypeScript (strict), Supabase (Postgres + Storage), zod, vitest, Tailwind v4 + base-ui shadcn components.

**Reference patterns:** `src/lib/profile/{validation,update,countries}.ts`, `src/lib/profile/validation.test.ts`, `src/components/account/account-settings-form.tsx`, `src/app/(app)/account/actions.ts`, `supabase/migrations/0004_storage_proofs.sql`.

---

## File structure

**Create:**
- `supabase/migrations/0005_profile_avatars_addresses.sql` — bucket, columns, table, RLS.
- `src/lib/addresses/types.ts` — `Address`, `AddressSnapshot`, `addressToSnapshot()`.
- `src/lib/addresses/validation.ts` — `addressSchema`, `AddressInput`.
- `src/lib/addresses/validation.test.ts` — schema unit tests.
- `src/lib/addresses/queries.ts` — `listAddresses()`.
- `src/lib/addresses/operations.ts` — owner-scoped CRUD + set-default.
- `src/components/account/avatar-uploader.tsx` — client avatar upload UI.
- `src/components/account/address-book.tsx` — client address list/form UI.
- `src/components/addresses/address-select.tsx` — reusable saved-address picker.

**Modify:**
- `src/lib/db/types.ts` — `Profile.avatar_url`, `Request.shipping_address`, `Address` table, snapshot type.
- `src/app/(app)/account/actions.ts` — avatar + address server actions.
- `src/app/(app)/account/page.tsx` — Profile + Shipping-addresses sections.
- `src/components/layout/topbar.tsx` — accept/forward `avatarUrl`.
- `src/components/layout/user-menu.tsx` — render `AvatarImage`.
- `src/app/(app)/layout.tsx` — pass `profile?.avatar_url` to `Topbar`.
- `src/app/(app)/requests/[id]/checkout/page.tsx` — load addresses, pass to form.
- `src/app/(app)/requests/[id]/checkout/checkout-form.tsx` — embed address picker + hidden field.
- `src/app/(app)/requests/[id]/checkout/actions.ts` — resolve + snapshot address.
- `src/lib/requests/operations.ts` — `depositForRequest` accepts/writes snapshot.

---

## Task 1: Migration — bucket, columns, addresses table, RLS

**Files:**
- Create: `supabase/migrations/0005_profile_avatars_addresses.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0005: Profile avatars + saved shipping address book.
-- Avatar bucket is PUBLIC (avatars are not sensitive; the nav renders <img>
-- with no signed-URL plumbing). Addresses are owner-only. A request stores a
-- frozen JSON snapshot of the chosen address so later edits/deletes of the
-- saved address never change a destination already committed to.

-- Public avatars bucket. Object paths: {user_id}/avatar-{timestamp}.{ext}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Owners may write/delete only under their own {auth.uid()}/ prefix.
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatar URL on the profile.
alter table profiles add column if not exists avatar_url text;

-- Saved shipping addresses (owner-only).
create table if not exists addresses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  recipient_name text not null,
  line1          text not null,
  line2          text,
  city           text not null,
  region         text,
  postal_code    text not null,
  country        text not null,
  phone          text,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now()
);

-- At most one default address per user.
create unique index if not exists addresses_one_default_per_user
  on addresses (user_id) where is_default;

create index if not exists addresses_user_id_idx on addresses (user_id);

alter table addresses enable row level security;

create policy "addresses_select_own" on addresses
  for select using (auth.uid() = user_id);
create policy "addresses_insert_own" on addresses
  for insert with check (auth.uid() = user_id);
create policy "addresses_update_own" on addresses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "addresses_delete_own" on addresses
  for delete using (auth.uid() = user_id);

-- Frozen destination snapshot on the request (set at deposit, optional).
alter table requests add column if not exists shipping_address jsonb;
```

- [ ] **Step 2: Verify it applies**

Apply `supabase/migrations/0005_profile_avatars_addresses.sql` in the Supabase SQL editor (per README). Expected: no errors; `addresses` table, `avatars` bucket, `profiles.avatar_url`, and `requests.shipping_address` exist.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0005_profile_avatars_addresses.sql
git commit -m "feat(db): avatars bucket + addresses table + request address snapshot (0005)"
```

---

## Task 2: TypeScript DB types

**Files:**
- Modify: `src/lib/db/types.ts`

- [ ] **Step 1: Add `avatar_url` to `Profile`**

In the `Profile` type, add the field (keep ordering near `currency_pref`):

```ts
export type Profile = {
  id: string;
  shipping_country: string | null;
  currency_pref: string;
  avatar_url: string | null;
  is_staff: boolean;
  created_at: string;
}
```

- [ ] **Step 2: Add `shipping_address` to `Request`**

Add to the `Request` type (after `deadline_at`):

```ts
  deadline_at: string | null;
  shipping_address: AddressSnapshot | null;
  created_at: string;
  updated_at: string;
```

- [ ] **Step 3: Add the `Address` and `AddressSnapshot` types**

Add after the `Profile` type:

```ts
export type Address = {
  id: string;
  user_id: string;
  recipient_name: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
  created_at: string;
}

/** Frozen address copy stored on a request at deposit time. */
export type AddressSnapshot = {
  recipient_name: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal_code: string;
  country: string;
  phone: string | null;
}
```

- [ ] **Step 4: Register the `addresses` table in `Database`**

In `Database.public.Tables`, after the `profiles` entry add:

```ts
      addresses: Table<
        Address,
        Omit<Address, "id" | "created_at"> & { id?: string }
      >;
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/types.ts
git commit -m "feat(types): avatar_url, addresses table, request address snapshot"
```

---

## Task 3: Address validation schema (TDD)

**Files:**
- Create: `src/lib/addresses/validation.ts`
- Test: `src/lib/addresses/validation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { addressSchema } from "./validation";

const valid = {
  recipientName: "Aiko Tanaka",
  line1: "1-2-3 Shibuya",
  line2: "",
  city: "Tokyo",
  region: "",
  postalCode: "150-0002",
  country: "us",
  phone: "",
};

describe("addressSchema", () => {
  it("accepts a valid address and uppercases the country", () => {
    const result = addressSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe("US");
      expect(result.data.line2).toBeNull();
      expect(result.data.region).toBeNull();
      expect(result.data.phone).toBeNull();
    }
  });

  it("rejects missing required fields", () => {
    expect(addressSchema.safeParse({ ...valid, recipientName: "" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, line1: "  " }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, city: "" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, postalCode: "" }).success).toBe(false);
  });

  it("rejects unsupported countries", () => {
    expect(addressSchema.safeParse({ ...valid, country: "ZZ" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/addresses/validation.test.ts`
Expected: FAIL — cannot find module `./validation`.

- [ ] **Step 3: Write the schema**

```ts
import { z } from "zod";
import { isShippingCountryCode } from "@/lib/profile/countries";

const required = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

export const addressSchema = z.object({
  recipientName: required("Recipient name"),
  line1: required("Address line 1"),
  line2: optional,
  city: required("City"),
  region: optional,
  postalCode: required("Postal code"),
  country: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => isShippingCountryCode(v), {
      message: "Choose a supported shipping country.",
    }),
  phone: optional,
});

export type AddressInput = z.infer<typeof addressSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/addresses/validation.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/addresses/validation.ts src/lib/addresses/validation.test.ts
git commit -m "feat(addresses): zod address schema with tests"
```

---

## Task 4: Address types helper + queries

**Files:**
- Create: `src/lib/addresses/types.ts`
- Create: `src/lib/addresses/queries.ts`

- [ ] **Step 1: Write the snapshot helper test**

Create `src/lib/addresses/types.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addressToSnapshot } from "./types";
import type { Address } from "@/lib/db/types";

const row: Address = {
  id: "a1",
  user_id: "u1",
  recipient_name: "Aiko Tanaka",
  line1: "1-2-3 Shibuya",
  line2: null,
  city: "Tokyo",
  region: null,
  postal_code: "150-0002",
  country: "US",
  phone: null,
  is_default: true,
  created_at: "2026-06-16T00:00:00Z",
};

describe("addressToSnapshot", () => {
  it("drops id/user_id/is_default/created_at", () => {
    const snap = addressToSnapshot(row);
    expect(snap).toEqual({
      recipient_name: "Aiko Tanaka",
      line1: "1-2-3 Shibuya",
      line2: null,
      city: "Tokyo",
      region: null,
      postal_code: "150-0002",
      country: "US",
      phone: null,
    });
    expect("id" in snap).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/addresses/types.test.ts`
Expected: FAIL — cannot find module `./types`.

- [ ] **Step 3: Write `types.ts`**

```ts
import type { Address, AddressSnapshot } from "@/lib/db/types";

export type { Address, AddressSnapshot };

/** Build the frozen request snapshot from a saved address row. */
export function addressToSnapshot(a: Address): AddressSnapshot {
  return {
    recipient_name: a.recipient_name,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    region: a.region,
    postal_code: a.postal_code,
    country: a.country,
    phone: a.phone,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/addresses/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `queries.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Address } from "@/lib/db/types";

type UserClient = SupabaseClient<Database>;

/** The signed-in user's saved addresses, default first then newest. */
export async function listAddresses(
  userId: string,
  supabase: UserClient,
): Promise<Address[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/addresses/types.ts src/lib/addresses/types.test.ts src/lib/addresses/queries.ts
git commit -m "feat(addresses): snapshot helper + list query"
```

---

## Task 5: Address operations (CRUD + default exclusivity)

**Files:**
- Create: `src/lib/addresses/operations.ts`

- [ ] **Step 1: Write `operations.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { AddressInput } from "./validation";

type UserClient = SupabaseClient<Database>;

/** Clear is_default on all of the user's addresses except `keepId` (optional). */
async function clearDefaults(
  userId: string,
  supabase: UserClient,
  keepId?: string,
): Promise<void> {
  let q = supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);
  if (keepId) q = q.neq("id", keepId);
  const { error } = await q;
  if (error) throw error;
}

/** Create an address. If it's the user's first, force it default. */
export async function createAddress(
  userId: string,
  input: AddressInput,
  makeDefault: boolean,
  supabase: UserClient,
): Promise<void> {
  const { count } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const isDefault = makeDefault || (count ?? 0) === 0;
  if (isDefault) await clearDefaults(userId, supabase);
  const { error } = await supabase.from("addresses").insert({
    user_id: userId,
    recipient_name: input.recipientName,
    line1: input.line1,
    line2: input.line2,
    city: input.city,
    region: input.region,
    postal_code: input.postalCode,
    country: input.country,
    phone: input.phone,
    is_default: isDefault,
  });
  if (error) throw error;
}

/** Update an owned address in place (does not change default flag). */
export async function updateAddress(
  userId: string,
  id: string,
  input: AddressInput,
  supabase: UserClient,
): Promise<void> {
  const { error } = await supabase
    .from("addresses")
    .update({
      recipient_name: input.recipientName,
      line1: input.line1,
      line2: input.line2,
      city: input.city,
      region: input.region,
      postal_code: input.postalCode,
      country: input.country,
      phone: input.phone,
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Delete an owned address. */
export async function deleteAddress(
  userId: string,
  id: string,
  supabase: UserClient,
): Promise<void> {
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Mark one owned address default, clearing the rest. */
export async function setDefaultAddress(
  userId: string,
  id: string,
  supabase: UserClient,
): Promise<void> {
  await clearDefaults(userId, supabase, id);
  const { error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/addresses/operations.ts
git commit -m "feat(addresses): owner-scoped CRUD with default exclusivity"
```

---

## Task 6: Account server actions — avatar + addresses

**Files:**
- Modify: `src/app/(app)/account/actions.ts`

- [ ] **Step 1: Append the new actions**

Add to the end of `src/app/(app)/account/actions.ts` (keep existing `updateProfileAction`):

```ts
import {
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/lib/addresses/operations";
import { addressSchema } from "@/lib/addresses/validation";

export interface AddressFormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const addressInitialState: AddressFormState = { status: "idle" };

function parseAddress(formData: FormData) {
  return addressSchema.safeParse({
    recipientName: formData.get("recipientName") ?? "",
    line1: formData.get("line1") ?? "",
    line2: formData.get("line2") ?? "",
    city: formData.get("city") ?? "",
    region: formData.get("region") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    country: formData.get("country") ?? "",
    phone: formData.get("phone") ?? "",
  });
}

function fieldErrorsFrom(parsed: { error: { issues: { path: (string | number)[]; message: string }[] } }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

export async function createAddressAction(
  _prev: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const user = await requireUser();
  const parsed = parseAddress(formData);
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed) };
  }
  const supabase = await createClient();
  try {
    await createAddress(user.id, parsed.data, formData.get("makeDefault") === "on", supabase);
  } catch {
    return { status: "error", message: "Couldn't save this address. Please try again." };
  }
  revalidatePath("/account");
  return { status: "success", message: "Address saved." };
}

export async function updateAddressAction(
  _prev: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing address." };
  const parsed = parseAddress(formData);
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed) };
  }
  const supabase = await createClient();
  try {
    await updateAddress(user.id, id, parsed.data, supabase);
  } catch {
    return { status: "error", message: "Couldn't update this address. Please try again." };
  }
  revalidatePath("/account");
  return { status: "success", message: "Address updated." };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await deleteAddress(user.id, id, supabase);
  revalidatePath("/account");
}

export async function setDefaultAddressAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await setDefaultAddress(user.id, id, supabase);
  revalidatePath("/account");
}

export async function saveAvatarAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const url = String(formData.get("avatarUrl") ?? "").trim();
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ avatar_url: url === "" ? null : url })
    .eq("id", user.id);
  revalidatePath("/account");
  revalidatePath("/dashboard");
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/account/actions.ts"
git commit -m "feat(account): avatar + address server actions"
```

---

## Task 7: Avatar uploader component

**Files:**
- Create: `src/components/account/avatar-uploader.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveAvatarAction } from "@/app/(app)/account/actions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 3 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function AvatarUploader({
  userId,
  avatarUrl,
  initial,
}: {
  userId: string;
  avatarUrl: string | null;
  initial: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const supabase = createClient();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!ACCEPT.includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be 3 MB or smaller.");
      return;
    }
    setBusy(true);
    const path = `${userId}/avatar-${Date.now()}.${EXT[file.type]}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setBusy(false);
      setError("Upload failed. Please try again.");
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const fd = new FormData();
    fd.set("avatarUrl", data.publicUrl);
    startTransition(async () => {
      await saveAvatarAction(fd);
      setBusy(false);
    });
  }

  function onRemove() {
    setError(null);
    const fd = new FormData();
    fd.set("avatarUrl", "");
    startTransition(() => saveAvatarAction(fd));
  }

  const working = busy || pending;

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="size-16">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="Your profile picture" /> : null}
        <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">
          {initial}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={working}
            onClick={() => inputRef.current?.click()}
            className="gap-1.5"
          >
            {working ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {avatarUrl ? "Replace" : "Upload"}
          </Button>
          {avatarUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={working}
              onClick={onRemove}
              className="gap-1.5 text-muted-foreground"
            >
              <Trash2 className="size-4" /> Remove
            </Button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT.join(",")}
            className="hidden"
            onChange={onPick}
          />
        </div>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-[12px] text-muted-foreground">JPG, PNG, or WebP · up to 3 MB.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

> If `Button` has no `variant="outline"`/`"ghost"`, check `src/components/ui/button.tsx` for the available `buttonVariants` and substitute the nearest (e.g. `variant="secondary"`); do not invent a variant.

- [ ] **Step 3: Commit**

```bash
git add src/components/account/avatar-uploader.tsx
git commit -m "feat(account): client avatar uploader"
```

---

## Task 8: Address book component

**Files:**
- Create: `src/components/account/address-book.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Star, Pencil, Trash2 } from "lucide-react";
import {
  createAddressAction,
  updateAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  addressInitialState,
} from "@/app/(app)/account/actions";
import { SHIPPING_COUNTRIES } from "@/lib/profile/countries";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Address } from "@/lib/db/types";

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60";

function AddressForm({
  address,
  onDone,
}: {
  address?: Address;
  onDone: () => void;
}) {
  const action = address ? updateAddressAction : createAddressAction;
  const [state, formAction, isPending] = useActionState(action, addressInitialState);
  const err = state.fieldErrors ?? {};

  if (state.status === "success") {
    // Close on success; revalidation refreshes the list.
    queueMicrotask(onDone);
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-border p-4">
      {address ? <input type="hidden" name="id" value={address.id} /> : null}
      {state.status === "error" && state.message ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="recipientName">Recipient name</Label>
        <input id="recipientName" name="recipientName" defaultValue={address?.recipient_name ?? ""} className={inputCls} aria-invalid={!!err.recipientName} />
        {err.recipientName ? <p className="text-xs text-destructive">{err.recipientName}</p> : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="line1">Address line 1</Label>
        <input id="line1" name="line1" defaultValue={address?.line1 ?? ""} className={inputCls} aria-invalid={!!err.line1} />
        {err.line1 ? <p className="text-xs text-destructive">{err.line1}</p> : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="line2">Address line 2 (optional)</Label>
        <input id="line2" name="line2" defaultValue={address?.line2 ?? ""} className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="city">City</Label>
          <input id="city" name="city" defaultValue={address?.city ?? ""} className={inputCls} aria-invalid={!!err.city} />
          {err.city ? <p className="text-xs text-destructive">{err.city}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="region">State / region (optional)</Label>
          <input id="region" name="region" defaultValue={address?.region ?? ""} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="postalCode">Postal code</Label>
          <input id="postalCode" name="postalCode" defaultValue={address?.postal_code ?? ""} className={inputCls} aria-invalid={!!err.postalCode} />
          {err.postalCode ? <p className="text-xs text-destructive">{err.postalCode}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="country">Country</Label>
          <select id="country" name="country" defaultValue={address?.country ?? ""} className={inputCls} aria-invalid={!!err.country}>
            <option value="">Select…</option>
            {SHIPPING_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          {err.country ? <p className="text-xs text-destructive">{err.country}</p> : null}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="phone">Phone (optional)</Label>
        <input id="phone" name="phone" defaultValue={address?.phone ?? ""} className={inputCls} />
      </div>

      {!address ? (
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <input type="checkbox" name="makeDefault" /> Make this my default address
        </label>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {address ? "Save changes" : "Add address"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function AddressCard({ address }: { address: Address }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <AddressForm address={address} onDone={() => setEditing(false)} />;
  return (
    <div className="flex items-start justify-between rounded-xl border border-border p-4">
      <div className="text-sm">
        <div className="flex items-center gap-2">
          <span className="font-[560]">{address.recipient_name}</span>
          {address.is_default ? (
            <span className="rounded-full bg-success-muted px-2 py-0.5 text-[11px] font-[560] text-success">Default</span>
          ) : null}
        </div>
        <p className="mt-1 text-muted-foreground">
          {address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city}
          {address.region ? `, ${address.region}` : ""} {address.postal_code}, {address.country}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!address.is_default ? (
          <form action={setDefaultAddressAction}>
            <input type="hidden" name="id" value={address.id} />
            <Button type="submit" size="sm" variant="ghost" className="gap-1 text-muted-foreground" title="Make default">
              <Star className="size-4" />
            </Button>
          </form>
        ) : null}
        <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" title="Edit" onClick={() => setEditing(true)}>
          <Pencil className="size-4" />
        </Button>
        <form action={deleteAddressAction}>
          <input type="hidden" name="id" value={address.id} />
          <Button type="submit" size="sm" variant="ghost" className="text-muted-foreground" title="Delete">
            <Trash2 className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AddressBook({ addresses }: { addresses: Address[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {addresses.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
      ) : null}
      {addresses.map((a) => (
        <AddressCard key={a.id} address={a} />
      ))}
      {adding ? (
        <AddressForm onDone={() => setAdding(false)} />
      ) : (
        <Button type="button" size="sm" variant="outline" className="w-fit gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add address
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (If `Button` lacks `outline`/`ghost`, substitute per the note in Task 7.)

- [ ] **Step 3: Commit**

```bash
git add src/components/account/address-book.tsx
git commit -m "feat(account): address book list + add/edit form"
```

---

## Task 9: Wire account page sections

**Files:**
- Modify: `src/app/(app)/account/page.tsx`

- [ ] **Step 1: Add imports + data fetch**

At the top imports add:

```tsx
import { createClient } from "@/lib/supabase/server";
import { listAddresses } from "@/lib/addresses/queries";
import { AvatarUploader } from "@/components/account/avatar-uploader";
import { AddressBook } from "@/components/account/address-book";
```

Replace the data fetch in `AccountPage` so addresses load too:

```tsx
  const [user, profile] = await Promise.all([requireUser(), getProfile()]);
  const supabase = await createClient();
  const addresses = await listAddresses(user.id, supabase);
  const avatarInitial = (user.email ?? "?").charAt(0).toUpperCase();
```

- [ ] **Step 2: Insert the Profile + Shipping addresses sections**

Inside the `<div className="flex flex-col gap-4">`, before the existing `<Section title="Account">`, add:

```tsx
        <Section title="Profile">
          <AvatarUploader
            userId={user.id}
            avatarUrl={profile?.avatar_url ?? null}
            initial={avatarInitial}
          />
        </Section>
```

After the `<Section title="Shipping &amp; currency">` block, add:

```tsx
        <Section title="Shipping addresses">
          <AddressBook addresses={addresses} />
        </Section>
```

- [ ] **Step 3: Typecheck + test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, sign in (`demo@finderskeepers.test` / `concierge123`), visit `/account`. Confirm: upload an avatar → it appears; add an address → it lists with Default badge; edit/delete/make-default work.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/account/page.tsx"
git commit -m "feat(account): profile picture + address book sections"
```

---

## Task 10: Avatar in the nav

**Files:**
- Modify: `src/components/layout/user-menu.tsx`
- Modify: `src/components/layout/topbar.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: `user-menu.tsx` — accept and render `avatarUrl`**

Change the import to include `AvatarImage`:

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
```

Update the signature and trigger:

```tsx
export function UserMenu({ email, avatarUrl }: { email: string; avatarUrl: string | null }) {
  const initial = email.charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none ring-ring/50 focus-visible:ring-2">
        <Avatar className="size-9 border border-border">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="Your profile picture" /> : null}
          <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
```

(Leave the rest of the menu unchanged.)

- [ ] **Step 2: `topbar.tsx` — forward `avatarUrl`**

```tsx
export function Topbar({ email, avatarUrl }: { email: string; avatarUrl: string | null }) {
```

and

```tsx
          <UserMenu email={email} avatarUrl={avatarUrl} />
```

- [ ] **Step 3: `layout.tsx` — pass the profile avatar**

Change the `Topbar` usage:

```tsx
        <Topbar email={user.email ?? "you"} avatarUrl={profile?.avatar_url ?? null} />
```

- [ ] **Step 4: Typecheck + manual**

Run: `npx tsc --noEmit`
Expected: PASS. Then with `npm run dev`, after setting an avatar on `/account`, confirm the top-right menu shows the image (fallback initial when none).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/user-menu.tsx src/components/layout/topbar.tsx "src/app/(app)/layout.tsx"
git commit -m "feat(nav): show profile picture in the user menu"
```

---

## Task 11: Reusable address picker

**Files:**
- Create: `src/components/addresses/address-select.tsx`

- [ ] **Step 1: Write the picker**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import type { Address } from "@/lib/db/types";

/**
 * Saved-address picker. Emits the chosen id in a hidden input named by `name`
 * so it can ride inside any parent form. Empty value = "no address".
 */
export function AddressSelect({
  addresses,
  defaultId,
  name = "addressId",
}: {
  addresses: Address[];
  defaultId: string | null;
  name?: string;
}) {
  const [selected, setSelected] = useState<string>(defaultId ?? "");

  if (addresses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-3 text-[13px] text-muted-foreground">
        No saved address.{" "}
        <Link href="/account" className="text-primary underline-offset-2 hover:underline">
          Add one in Account settings
        </Link>{" "}
        — you can also add it before we ship.
      </div>
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <input type="hidden" name={name} value={selected} />
      {addresses.map((a) => (
        <label
          key={a.id}
          className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] transition-colors ${
            selected === a.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-foreground/20"
          }`}
        >
          <input
            type="radio"
            name={`${name}-radio`}
            className="mt-0.5"
            checked={selected === a.id}
            onChange={() => setSelected(a.id)}
          />
          <span>
            <span className="font-[560]">{a.recipient_name}</span>
            {a.is_default ? <span className="ml-2 text-[11px] text-success">Default</span> : null}
            <span className="block text-muted-foreground">
              {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.postal_code}, {a.country}
            </span>
          </span>
        </label>
      ))}
      <label className="flex cursor-pointer items-center gap-2.5 px-1 text-[12.5px] text-muted-foreground">
        <input type="radio" name={`${name}-radio`} checked={selected === ""} onChange={() => setSelected("")} />
        Decide shipping address later
      </label>
    </fieldset>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/addresses/address-select.tsx
git commit -m "feat(addresses): reusable saved-address picker"
```

---

## Task 12: Snapshot address through deposit

**Files:**
- Modify: `src/lib/requests/operations.ts`
- Modify: `src/app/(app)/requests/[id]/checkout/actions.ts`

- [ ] **Step 1: `depositForRequest` — accept and write the snapshot**

In `src/lib/requests/operations.ts`, add the import near the top:

```ts
import type { AddressSnapshot } from "@/lib/db/types";
```

Change the signature to take an optional snapshot:

```ts
export async function depositForRequest(
  requestId: string,
  rushTier: RushTier,
  shippingAddress: AddressSnapshot | null = null,
  admin: AdminClient = createAdminClient(),
): Promise<{ checkoutUrl?: string }> {
```

Immediately after the existing `if (rushTier !== req.rush_tier) { … }` block (around line 43), add:

```ts
  if (shippingAddress) {
    const { error: addrErr } = await admin
      .from("requests")
      .update({ shipping_address: shippingAddress })
      .eq("id", requestId);
    if (addrErr) throw addrErr;
  }
```

- [ ] **Step 2: `submitDeposit` — resolve the owned address + snapshot**

In `src/app/(app)/requests/[id]/checkout/actions.ts`, add imports:

```ts
import { addressToSnapshot } from "@/lib/addresses/types";
import type { AddressSnapshot } from "@/lib/db/types";
```

After the `owned` ownership check and before reading `rushTier`, resolve the address:

```ts
  const addressId = String(formData.get("addressId") ?? "");
  let shippingAddress: AddressSnapshot | null = null;
  if (addressId) {
    const { data: addr } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", addressId)
      .maybeSingle();
    if (addr) shippingAddress = addressToSnapshot(addr);
  }
```

Then pass it into the deposit call:

```ts
    ({ checkoutUrl } = await depositForRequest(requestId, rushTier, shippingAddress));
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/requests/operations.ts "src/app/(app)/requests/[id]/checkout/actions.ts"
git commit -m "feat(checkout): snapshot chosen address onto the request at deposit"
```

---

## Task 13: Address picker in the checkout form

**Files:**
- Modify: `src/app/(app)/requests/[id]/checkout/page.tsx`
- Modify: `src/app/(app)/requests/[id]/checkout/checkout-form.tsx`

- [ ] **Step 1: Load addresses in the checkout page**

In `src/app/(app)/requests/[id]/checkout/page.tsx`, add imports:

```tsx
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { listAddresses } from "@/lib/addresses/queries";
```

After `if (!detail) notFound();`, load addresses:

```tsx
  const user = await requireUser();
  const supabase = await createClient();
  const addresses = await listAddresses(user.id, supabase);
  const defaultAddressId = addresses.find((a) => a.is_default)?.id ?? null;
```

Pass them into the form:

```tsx
        <CheckoutForm
          requestId={id}
          budgetCapJpy={request.budget_cap_jpy}
          initialRush={request.rush_tier}
          currencyPref={profile?.currency_pref ?? "JPY"}
          chargesNow={escrow.name === "stripe"}
          resuming={escrowState === "pending"}
          cancelled={checkoutParam === "cancelled"}
          addresses={addresses}
          defaultAddressId={defaultAddressId}
        />
```

- [ ] **Step 2: Render the picker in the form**

In `src/app/(app)/requests/[id]/checkout/checkout-form.tsx`, add the import:

```tsx
import { AddressSelect } from "@/components/addresses/address-select";
import type { Address } from "@/lib/db/types";
```

Extend the props (add to the destructured params and the type):

```tsx
  addresses,
  defaultAddressId,
}: {
  requestId: string;
  budgetCapJpy: number | null;
  initialRush: RushTier;
  currencyPref: string;
  chargesNow?: boolean;
  resuming?: boolean;
  cancelled?: boolean;
  addresses: Address[];
  defaultAddressId: string | null;
}) {
```

Render the picker just above the authorise `<label>` (after the trust framing block):

```tsx
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 text-[11px] font-[600] uppercase tracking-[0.04em] text-muted-foreground">
          Ship to
        </legend>
        <AddressSelect addresses={addresses} defaultId={defaultAddressId} />
        <p className="text-[11.5px] text-muted-foreground">
          Optional now — you can confirm where it ships any time before it leaves Japan.
        </p>
      </fieldset>
```

- [ ] **Step 3: Typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 4: Manual verification**

With `npm run dev`: on a fundable request, open checkout. Confirm the default address is pre-selected, you can switch / choose "Decide later," deposit still works either way, and a chosen address lands in `requests.shipping_address` (check via Supabase table editor).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/requests/[id]/checkout/page.tsx" "src/app/(app)/requests/[id]/checkout/checkout-form.tsx"
git commit -m "feat(checkout): saved-address picker on the deposit form"
```

---

## Task 14: Later-collection affordance on request detail

**Files:**
- Modify: `src/app/(app)/requests/[id]/page.tsx`

- [ ] **Step 1: Inspect the page to find a placement**

Run: `grep -n "shipping_address\|escrowState\|status" "src/app/(app)/requests/[id]/page.tsx" | head`
Read the surrounding JSX to choose where a small notice fits (near the status/escrow header).

- [ ] **Step 2: Add a server action to set the address from a saved one**

Create `src/app/(app)/requests/[id]/address-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { depositForRequest } from "@/lib/requests/operations";
import { addressToSnapshot } from "@/lib/addresses/types";

/**
 * Attach a saved address to an already-funded request (the "collect later"
 * path). Reuses depositForRequest's snapshot write; rushTier is read back so
 * it is unchanged.
 */
export async function attachRequestAddress(
  requestId: string,
  formData: FormData,
): Promise<void> {
  await requireUser();
  const addressId = String(formData.get("addressId") ?? "");
  if (!addressId) return;
  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("requests")
    .select("id, rush_tier")
    .eq("id", requestId)
    .maybeSingle();
  if (!owned) return;
  const { data: addr } = await supabase
    .from("addresses")
    .select("*")
    .eq("id", addressId)
    .maybeSingle();
  if (!addr) return;
  await depositForRequest(requestId, owned.rush_tier, addressToSnapshot(addr));
  revalidatePath(`/requests/${requestId}`);
}
```

> Note: `depositForRequest` rejects requests whose status is not `open`. For a funded request (status past `open`) this write path must instead update directly. To avoid that constraint, replace the `depositForRequest(...)` line above with a direct admin-free owner update:
>
> ```ts
> const { error } = await supabase
>   .from("requests")
>   .update({ shipping_address: addressToSnapshot(addr) })
>   .eq("id", requestId);
> if (error) throw error;
> ```
>
> Use the direct-update form (it works regardless of status, and RLS scopes it to the owner). Drop the unused `depositForRequest` import.

- [ ] **Step 3: Render the notice on the detail page**

In `src/app/(app)/requests/[id]/page.tsx`, load the user's addresses (mirror Task 13 Step 1 imports: `requireUser`, `createClient`, `listAddresses`), then, where the page already has the request `detail`, add near the status header — only when funded and no address yet:

```tsx
{request.shipping_address === null && addresses.length > 0 ? (
  <form
    action={attachRequestAddress.bind(null, request.id)}
    className="surface flex flex-col gap-2 p-4"
  >
    <p className="text-[13px] font-[560]">Where should we ship this?</p>
    <AddressSelect addresses={addresses} defaultId={defaultAddressId} />
    <button
      type="submit"
      className="mt-1 w-fit rounded-lg bg-primary px-3 py-1.5 text-[13px] font-[560] text-primary-foreground"
    >
      Save shipping address
    </button>
  </form>
) : null}
```

Add the imports at the top of the page: `import { AddressSelect } from "@/components/addresses/address-select";` and `import { attachRequestAddress } from "./address-actions";`, plus the address-loading block:

```tsx
  const user = await requireUser();
  const supabase = await createClient();
  const addresses = await listAddresses(user.id, supabase);
  const defaultAddressId = addresses.find((a) => a.is_default)?.id ?? null;
```

(If `requireUser`/`createClient` are already imported or the page already has a supabase client, reuse them rather than duplicating.)

- [ ] **Step 4: Typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Manual verification**

On a funded request with no `shipping_address`, confirm the "Where should we ship this?" form appears, saving attaches the snapshot, and the form disappears afterward.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/requests/[id]/page.tsx" "src/app/(app)/requests/[id]/address-actions.ts"
git commit -m "feat(requests): collect shipping address after funding"
```

---

## Task 15: Full verification + seed sanity

**Files:**
- Read-only check; optionally Modify: `scripts/seed.ts`

- [ ] **Step 1: Whole suite + build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: all PASS. Fix any type/lint failures surfaced by the build.

- [ ] **Step 2: Confirm seed still runs (schema drift check)**

Run: `npm run seed`
Expected: completes without error (the new nullable columns don't break existing inserts). If seed inserts `profiles`/`requests` rows explicitly listing columns, no change is needed since the new columns are nullable/defaulted.

- [ ] **Step 3: Final manual smoke**

`npm run dev` → `/account`: avatar upload + address CRUD + default. Nav shows avatar. Checkout pre-selects default, snapshots on deposit. Funded request without an address shows the collect-later form.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: verification fixes for profile pictures + address book"
```

---

## Self-review notes

- **Spec coverage:** avatars bucket + `avatar_url` (T1–T2, T7, T9–T10); `addresses` table + one-default index + RLS (T1); `src/lib/addresses/*` validation/queries/operations mirroring `profile/` (T3–T5); account Profile + Shipping-addresses sections (T6, T8–T9); nav avatar (T10); checkout optional picker + request snapshot (T11–T13); later-collection affordance (T14); no checkout gate (T13 deposit never disabled by address). Snapshot-not-FK persistence (T1, T12). Country reuses `SHIPPING_COUNTRIES` (T3, T8). No crop / no new dependency (T7).
- **Deviation from spec:** "Add a new address" at checkout links to Account settings rather than an inline create form (T11), keeping the checkout form single-purpose; inline create still lives in the account address book (T8). This satisfies the "affordance to add" intent with less surface area.
- **Type consistency:** `addressToSnapshot` returns the exact `AddressSnapshot` shape defined in T2; `depositForRequest`'s new `shippingAddress` param (T12) matches; `AddressSelect` emits `addressId`, read identically in `submitDeposit` (T12) and `attachRequestAddress` (T14).
- **Button variants:** T7/T8 assume `variant="outline"`/`"ghost"` exist on the shadcn `Button`; the note instructs substitution if not, to avoid inventing a variant.
