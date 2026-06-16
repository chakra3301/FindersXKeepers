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
  const [state, formAction, isPending] = useActionState(
    action,
    addressInitialState,
  );
  const err = state.fieldErrors ?? {};

  if (state.status === "success") {
    // Close on success; revalidation refreshes the list.
    queueMicrotask(onDone);
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-border p-4"
    >
      {address ? <input type="hidden" name="id" value={address.id} /> : null}
      {state.status === "error" && state.message ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="recipientName">Recipient name</Label>
        <input
          id="recipientName"
          name="recipientName"
          defaultValue={address?.recipient_name ?? ""}
          className={inputCls}
          aria-invalid={!!err.recipientName}
        />
        {err.recipientName ? (
          <p className="text-xs text-destructive">{err.recipientName}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="line1">Address line 1</Label>
        <input
          id="line1"
          name="line1"
          defaultValue={address?.line1 ?? ""}
          className={inputCls}
          aria-invalid={!!err.line1}
        />
        {err.line1 ? (
          <p className="text-xs text-destructive">{err.line1}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="line2">Address line 2 (optional)</Label>
        <input
          id="line2"
          name="line2"
          defaultValue={address?.line2 ?? ""}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="city">City</Label>
          <input
            id="city"
            name="city"
            defaultValue={address?.city ?? ""}
            className={inputCls}
            aria-invalid={!!err.city}
          />
          {err.city ? (
            <p className="text-xs text-destructive">{err.city}</p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="region">State / region (optional)</Label>
          <input
            id="region"
            name="region"
            defaultValue={address?.region ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="postalCode">Postal code</Label>
          <input
            id="postalCode"
            name="postalCode"
            defaultValue={address?.postal_code ?? ""}
            className={inputCls}
            aria-invalid={!!err.postalCode}
          />
          {err.postalCode ? (
            <p className="text-xs text-destructive">{err.postalCode}</p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="country">Country</Label>
          <select
            id="country"
            name="country"
            defaultValue={address?.country ?? ""}
            className={inputCls}
            aria-invalid={!!err.country}
          >
            <option value="">Select…</option>
            {SHIPPING_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          {err.country ? (
            <p className="text-xs text-destructive">{err.country}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="phone">Phone (optional)</Label>
        <input
          id="phone"
          name="phone"
          defaultValue={address?.phone ?? ""}
          className={inputCls}
        />
      </div>

      {!address ? (
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <input type="checkbox" name="makeDefault" /> Make this my default
          address
        </label>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {address ? "Save changes" : "Add address"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AddressCard({ address }: { address: Address }) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return <AddressForm address={address} onDone={() => setEditing(false)} />;
  return (
    <div className="flex items-start justify-between rounded-xl border border-border p-4">
      <div className="text-sm">
        <div className="flex items-center gap-2">
          <span className="font-[560]">{address.recipient_name}</span>
          {address.is_default ? (
            <span className="rounded-full bg-success-muted px-2 py-0.5 text-[11px] font-[560] text-success">
              Default
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-muted-foreground">
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ""}, {address.city}
          {address.region ? `, ${address.region}` : ""} {address.postal_code},{" "}
          {address.country}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!address.is_default ? (
          <form action={setDefaultAddressAction}>
            <input type="hidden" name="id" value={address.id} />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="gap-1 text-muted-foreground"
              title="Make default"
            >
              <Star className="size-4" />
            </Button>
          </form>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          title="Edit"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-4" />
        </Button>
        <form action={deleteAddressAction}>
          <input type="hidden" name="id" value={address.id} />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            title="Delete"
          >
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-fit gap-1.5"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-4" /> Add address
        </Button>
      )}
    </div>
  );
}
