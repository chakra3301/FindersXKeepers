"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  updateProfileAction,
  updateProfileInitialState,
} from "@/app/(app)/account/actions";
import { SHIPPING_COUNTRIES } from "@/lib/profile/countries";
import { DISPLAY_CURRENCIES } from "@/lib/profile/validation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const CURRENCY_LABELS: Record<(typeof DISPLAY_CURRENCIES)[number], string> = {
  JPY: "JPY (¥)",
  USD: "USD ($)",
  EUR: "EUR (€)",
  GBP: "GBP (£)",
  AUD: "AUD (A$)",
  CAD: "CAD (C$)",
  SGD: "SGD (S$)",
};

export function AccountSettingsForm({
  shippingCountry,
  currencyPref,
}: {
  shippingCountry: string | null;
  currencyPref: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    updateProfileInitialState,
  );
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === "success" && state.message ? (
        <p className="rounded-lg border border-success-border bg-success-muted px-3 py-2 text-[13px] text-success">
          {state.message}
        </p>
      ) : null}
      {state.status === "error" && state.message ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="shippingCountry">Shipping country</Label>
        <select
          id="shippingCountry"
          name="shippingCountry"
          defaultValue={shippingCountry ?? ""}
          disabled={isPending}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
          aria-invalid={!!err.shippingCountry}
        >
          <option value="">Not set</option>
          {SHIPPING_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        {err.shippingCountry ? (
          <p className="text-xs text-destructive">{err.shippingCountry}</p>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            Sets shipping options and customs estimates across the app.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="currencyPref">Display currency</Label>
        <select
          id="currencyPref"
          name="currencyPref"
          defaultValue={currencyPref}
          disabled={isPending}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
          aria-invalid={!!err.currencyPref}
        >
          {DISPLAY_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_LABELS[code]}
            </option>
          ))}
        </select>
        {err.currencyPref ? (
          <p className="text-xs text-destructive">{err.currencyPref}</p>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            Local-currency amounts are indicative; you always pay in JPY.
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="mt-1 h-10 w-fit gap-2">
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Save settings
      </Button>
    </form>
  );
}
