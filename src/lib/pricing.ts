import type { RushTier } from "@/lib/db/types";

/**
 * Pricing is ALWAYS four separate lines — item cost / finder's fee / shipping /
 * tax — stored and displayed individually, never collapsed into one opaque
 * number. The item cost is a pass-through; the finder's fee is our separately
 * disclosed service fee (agency model, not resale).
 */

export interface PriceLines {
  itemCostJpy: number;
  finderFeeJpy: number;
  shippingJpy: number;
  taxJpy: number;
}

export const FINDER_FEE_RATE = 0.1; // 10% of item cost
export const FINDER_FEE_MIN_JPY = 1500;
export const CONSUMPTION_TAX_RATE = 0.1; // 10% — applied to our taxable service fee

// Rush multiplies our service effort, so it surcharges the finder's fee only.
export const RUSH_FEE_MULTIPLIER: Record<RushTier, number> = {
  standard: 1,
  priority: 1.5,
  express: 2,
};

export const RUSH_LABEL: Record<RushTier, string> = {
  standard: "Standard",
  priority: "Priority",
  express: "Express",
};

/** Format an integer amount of yen, e.g. 12345 → "¥12,345". */
export function formatJpy(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function computeFinderFee(
  itemCostJpy: number,
  rushTier: RushTier = "standard",
): number {
  const base = Math.max(
    Math.round(itemCostJpy * FINDER_FEE_RATE),
    FINDER_FEE_MIN_JPY,
  );
  return Math.round(base * RUSH_FEE_MULTIPLIER[rushTier]);
}

/**
 * Build a full four-line quote from an item cost + shipping estimate.
 * Finder's fee and tax are derived; the result keeps all four lines distinct.
 */
export function computeQuote(input: {
  itemCostJpy: number;
  shippingJpy: number;
  rushTier?: RushTier;
}): PriceLines {
  const finderFeeJpy = computeFinderFee(
    input.itemCostJpy,
    input.rushTier ?? "standard",
  );
  // Consumption tax is charged on our service fee (the taxable supply).
  const taxJpy = Math.round(finderFeeJpy * CONSUMPTION_TAX_RATE);
  return {
    itemCostJpy: input.itemCostJpy,
    finderFeeJpy,
    shippingJpy: input.shippingJpy,
    taxJpy,
  };
}

export function totalJpy(lines: PriceLines): number {
  return (
    lines.itemCostJpy + lines.finderFeeJpy + lines.shippingJpy + lines.taxJpy
  );
}

export const PRICE_LINE_LABELS: { key: keyof PriceLines; label: string; note: string }[] = [
  { key: "itemCostJpy", label: "Item cost", note: "Pass-through" },
  { key: "finderFeeJpy", label: "Finder's fee", note: "Our service fee" },
  { key: "shippingJpy", label: "Shipping", note: "Japan → you" },
  { key: "taxJpy", label: "Tax", note: "Consumption tax" },
];
