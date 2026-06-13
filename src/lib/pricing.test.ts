import { describe, expect, it } from "vitest";
import {
  computeFinderFee,
  computeQuote,
  totalJpy,
  FINDER_FEE_MIN_JPY,
} from "./pricing";

describe("computeFinderFee", () => {
  it("is 10% of item cost above the floor", () => {
    expect(computeFinderFee(100_000)).toBe(10_000);
  });
  it("applies the minimum on small items", () => {
    expect(computeFinderFee(1_000)).toBe(FINDER_FEE_MIN_JPY);
  });
  it("surcharges the fee by the rush multiplier", () => {
    expect(computeFinderFee(100_000, "priority")).toBe(15_000); // ×1.5
    expect(computeFinderFee(100_000, "express")).toBe(20_000); // ×2
  });
});

describe("computeQuote + totalJpy", () => {
  it("keeps four distinct lines and taxes the service fee only", () => {
    const q = computeQuote({ itemCostJpy: 100_000, shippingJpy: 4_200 });
    expect(q).toEqual({
      itemCostJpy: 100_000,
      finderFeeJpy: 10_000,
      shippingJpy: 4_200,
      taxJpy: 1_000, // 10% of the finder's fee
    });
    expect(totalJpy(q)).toBe(115_200);
  });
});
