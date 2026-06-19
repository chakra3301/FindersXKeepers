import type { MinCondition } from "@/lib/db/types";

/**
 * The estimator seam.
 *
 * Pre-sourcing we cannot know the real Japan→customer shipping cost or the real
 * market price of the item, so before an order is locked we ESTIMATE both. The
 * estimate sizes the displayed quote and the escrow hold; the real figures are
 * reconciled when an order is locked (see operations.ts).
 *
 * Today it's backed by a deterministic stub; flipping ESTIMATOR_PROVIDER=deepseek
 * routes the same calls through a DeepSeek model (see ./index.ts). The estimator
 * NEVER collapses the four pricing lines — it only feeds the `shipping` line and
 * the item-cost input to `computeQuote`. The four-line invariant is owned by
 * src/lib/pricing.ts and is unaffected by which provider answers.
 *
 * `source` is recorded for diagnostics so the team can see whether a figure came
 * from the model or the deterministic fallback.
 */
export type EstimateSource = "stub" | "deepseek" | "fallback";

export interface ShippingEstimateInput {
  /** What we're shipping — drives size/weight/fragility guesses. */
  title: string;
  description?: string | null;
  /** Higher conditions tend to imply more protective packaging. */
  minCondition: MinCondition;
  /** ISO-ish destination country from the shipping address, when known. */
  destinationCountry?: string | null;
}
// Note: rush tier is deliberately NOT an input — in this pricing model rush
// surcharges the finder's fee only, never shipping, so the shipping estimate is
// stable across tier toggles and the checkout display stays equal to the hold.

export interface ShippingEstimate {
  /** Estimated Japan→customer shipping in whole yen. Always > 0. */
  shippingJpy: number;
  source: EstimateSource;
  /** Optional one-line human rationale (model output), for the team console. */
  rationale?: string;
}

export interface ItemValueEstimateInput {
  title: string;
  description?: string | null;
  minCondition: MinCondition;
  mustHaves?: string[];
  niceToHaves?: string[];
  /** Customer's authorisation ceiling, when set. The estimate never exceeds it. */
  budgetCapJpy?: number | null;
}

export interface ItemValueEstimate {
  /** Best-guess market price in whole yen — used to size the escrow hold. */
  itemValueJpy: number;
  /** Plausible range; `lowJpy <= itemValueJpy <= highJpy`. */
  lowJpy: number;
  highJpy: number;
  /** 0..1 model confidence; the stub reports a fixed low confidence. */
  confidence: number;
  source: EstimateSource;
  rationale?: string;
}

export interface Estimator {
  /** Name of the backing provider, for logging/diagnostics. */
  readonly name: string;

  /** Estimate Japan→customer shipping for an unsourced request. */
  estimateShipping(input: ShippingEstimateInput): Promise<ShippingEstimate>;

  /**
   * Estimate the item's JPY market price to size the escrow hold when no budget
   * cap is set (and to sanity-check one that is). Never exceeds `budgetCapJpy`.
   */
  estimateItemValue(
    input: ItemValueEstimateInput,
  ): Promise<ItemValueEstimate>;
}
