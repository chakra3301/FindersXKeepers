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
        <Link
          href="/account"
          className="text-primary underline-offset-2 hover:underline"
        >
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
            selected === a.id
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border hover:border-foreground/20"
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
            {a.is_default ? (
              <span className="ml-2 text-[11px] text-success">Default</span>
            ) : null}
            <span className="block text-muted-foreground">
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.postal_code},{" "}
              {a.country}
            </span>
          </span>
        </label>
      ))}
      <label className="flex cursor-pointer items-center gap-2.5 px-1 text-[12.5px] text-muted-foreground">
        <input
          type="radio"
          name={`${name}-radio`}
          checked={selected === ""}
          onChange={() => setSelected("")}
        />
        Decide shipping address later
      </label>
    </fieldset>
  );
}
