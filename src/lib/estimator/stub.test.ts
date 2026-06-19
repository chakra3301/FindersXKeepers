import { describe, expect, it } from "vitest";
import { StubEstimator } from "./stub";
import { SHIPPING_ESTIMATE_JPY } from "@/lib/pricing";

describe("StubEstimator", () => {
  const est = new StubEstimator();

  it("returns the flat documented shipping constant", async () => {
    const e = await est.estimateShipping();
    expect(e.shippingJpy).toBe(SHIPPING_ESTIMATE_JPY);
    expect(e.source).toBe("stub");
  });

  it("sizes item value to the budget cap when set, never above it", async () => {
    const e = await est.estimateItemValue({
      title: "Vintage watch",
      minCondition: "good",
      budgetCapJpy: 80_000,
    });
    expect(e.itemValueJpy).toBe(80_000);
    expect(e.lowJpy).toBeLessThanOrEqual(e.itemValueJpy);
    expect(e.highJpy).toBeGreaterThanOrEqual(e.itemValueJpy);
    expect(e.source).toBe("stub");
  });

  it("falls back to a conservative value with no cap", async () => {
    const e = await est.estimateItemValue({
      title: "Mystery item",
      minCondition: "any",
    });
    expect(e.itemValueJpy).toBeGreaterThan(0);
    expect(e.confidence).toBeLessThan(0.5);
  });
});
