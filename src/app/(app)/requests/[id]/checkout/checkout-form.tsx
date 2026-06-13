"use client";
import { useActionState, useState } from "react";
import { Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import { submitDeposit, type CheckoutState } from "./actions";
import { RUSH_TIERS } from "@/lib/validation/request";
import {
  RUSH_LABEL,
  computeQuote,
  totalJpy,
  formatJpy,
  SHIPPING_ESTIMATE_JPY,
} from "@/lib/pricing";
import { formatLocalApprox } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RushTier } from "@/lib/db/types";

/** Indicative hunt window per tier — display copy only (mirrors the prototype). */
const RUSH_WINDOW: Record<RushTier, string> = {
  standard: "30-day hunt",
  priority: "14-day hunt",
  express: "7-day hunt",
};

export function CheckoutForm({
  requestId,
  budgetCapJpy,
  initialRush,
  currencyPref,
}: {
  requestId: string;
  budgetCapJpy: number | null;
  initialRush: RushTier;
  currencyPref: string;
}) {
  const initial: CheckoutState = { status: "idle" };
  const action = submitDeposit.bind(null, requestId);
  const [state, formAction, isPending] = useActionState(action, initial);
  const [rush, setRush] = useState<RushTier>(initialRush);
  const [accepted, setAccepted] = useState(false);

  const cap = budgetCapJpy ?? 0;
  const quote = computeQuote({
    itemCostJpy: cap,
    shippingJpy: SHIPPING_ESTIMATE_JPY,
    rushTier: rush,
  });
  const total = totalJpy(quote);
  const local = formatLocalApprox(total, currencyPref);

  const lines = [
    { label: "Item cost", note: "Up to your cap", value: quote.itemCostJpy },
    { label: "Finder's fee", note: "Our service fee", value: quote.finderFeeJpy },
    { label: "Shipping", note: "Estimated", value: quote.shippingJpy },
    { label: "Tax", note: "Consumption tax", value: quote.taxJpy },
  ];

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="rushTier" value={rush} />

      {state.status === "error" && state.message && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      )}

      {/* Estimate — four separate lines, never collapsed. */}
      <dl className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,17,21,.04)]">
        {lines.map((l) => (
          <div
            key={l.label}
            className="flex items-baseline justify-between border-b border-[#F4F5F7] py-2.5"
          >
            <dt className="flex flex-col">
              <span className="text-[13.5px]">{l.label}</span>
              <span className="text-[11px] text-muted-foreground">{l.note}</span>
            </dt>
            <dd className="tnum text-[13.5px] font-[540]">{formatJpy(l.value)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between pt-3">
          <span className="text-sm font-[600]">Held in escrow today</span>
          <span className="tnum text-[19px] font-[600]">{formatJpy(total)}</span>
        </div>
        {local && (
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {local} · settles in JPY
          </p>
        )}
      </dl>

      {/* Hunt speed — surcharges our finder's fee, re-prices the estimate live. */}
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 text-[11px] font-[600] uppercase tracking-[0.04em] text-muted-foreground">
          Hunt speed
        </legend>
        <div className="grid grid-cols-3 gap-2.5">
          {RUSH_TIERS.map((t) => {
            const tierTotal = totalJpy(
              computeQuote({
                itemCostJpy: cap,
                shippingJpy: SHIPPING_ESTIMATE_JPY,
                rushTier: t,
              }),
            );
            const delta = tierTotal - totalJpy(
              computeQuote({
                itemCostJpy: cap,
                shippingJpy: SHIPPING_ESTIMATE_JPY,
                rushTier: "standard",
              }),
            );
            return (
              <button
                key={t}
                type="button"
                onClick={() => setRush(t)}
                aria-pressed={rush === t}
                className={cn(
                  "flex flex-col rounded-xl border px-3.5 py-3 text-left transition-colors",
                  rush === t
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-foreground/20",
                )}
              >
                <span className="text-[13.5px] font-[560]">{RUSH_LABEL[t]}</span>
                <span className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {RUSH_WINDOW[t]}
                </span>
                <span className="tnum mt-2 text-[12px] font-[540] text-primary">
                  {delta > 0 ? `+${formatJpy(delta)}` : "Included"}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Trust framing — held, not charged. */}
      <div className="rounded-2xl border border-success-border bg-success-muted px-5 py-4">
        <div className="flex items-center gap-2 text-[12.5px] font-[560] text-success">
          <ShieldCheck size={16} />
          Held, not charged
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-success">
          This is an <strong className="font-[600]">estimate</strong> sized to
          your budget cap. We hold it in escrow now — it isn&apos;t a charge.
          When we lock a real match, the final four-line total is confirmed; if
          it costs less than your cap, the difference is{" "}
          <strong className="font-[600]">returned to you</strong>. Funds release
          to us only once your item ships, and if we can&apos;t find it by your
          deadline you&apos;re refunded in full.
        </p>
      </div>

      <label className="flex items-start gap-2.5 text-[13px]">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-[19px] flex-none items-center justify-center rounded-md border transition-colors",
            accepted ? "border-primary bg-primary" : "border-border bg-background",
          )}
        >
          {accepted && <Check size={12} className="text-primary-foreground" strokeWidth={3} />}
        </span>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="sr-only"
        />
        <span className="text-muted-foreground">
          I authorise Finders Keepers to hold{" "}
          <span className="tnum font-[560] text-foreground">{formatJpy(total)}</span>{" "}
          in escrow and agree to the Terms and escrow policy.
        </span>
      </label>

      <Button
        type="submit"
        size="lg"
        disabled={!accepted || isPending || cap <= 0}
        className="h-12 w-full gap-2 text-[15px]"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        Deposit {formatJpy(total)} into escrow
      </Button>

      {cap <= 0 ? (
        <p className="text-xs text-destructive">
          Set a budget cap on this request before depositing.
        </p>
      ) : (
        <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-muted-foreground">
          <Lock size={12} /> Secured by Stripe
        </p>
      )}
    </form>
  );
}
