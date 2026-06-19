import { SHIPPING_ESTIMATE_JPY } from "@/lib/pricing";
import type {
  Estimator,
  ItemValueEstimate,
  ItemValueEstimateInput,
  ShippingEstimate,
} from "./types";

/**
 * Deterministic estimator — the default, and the fallback the DeepSeek provider
 * drops back to on any error. Returns the flat documented constant for shipping
 * (so the displayed estimate and the escrow hold are always built from the same
 * input, exactly as before the model landed) and the budget cap for item value.
 * No API key, no network — dev, seed and tests run on this unchanged.
 */
export class StubEstimator implements Estimator {
  readonly name = "stub";

  async estimateShipping(): Promise<ShippingEstimate> {
    return { shippingJpy: SHIPPING_ESTIMATE_JPY, source: "stub" };
  }

  async estimateItemValue(
    input: ItemValueEstimateInput,
  ): Promise<ItemValueEstimate> {
    const cap = input.budgetCapJpy ?? 0;
    const itemValueJpy = cap > 0 ? cap : SHIPPING_ESTIMATE_JPY;
    return {
      itemValueJpy,
      lowJpy: itemValueJpy,
      highJpy: itemValueJpy,
      confidence: cap > 0 ? 0.5 : 0.1,
      source: "stub",
    };
  }
}
