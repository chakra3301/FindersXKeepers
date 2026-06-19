import { describe, expect, it } from "vitest";
import { extractPrices, summarizePrices } from "./price-parse";
import type { FxToJpy } from "./fx";

const fx: FxToJpy = { JPY: 1, USD: 150, EUR: 160, GBP: 190 };

describe("extractPrices", () => {
  it("pulls multi-currency figures from comp text", () => {
    const prices = extractPrices("As low as $888.00 · PSA 10 $1,403.50 · €694 · 80,000円 · 50000 yen");
    expect(prices).toContainEqual({ currency: "USD", amount: 888 });
    expect(prices).toContainEqual({ currency: "USD", amount: 1403.5 });
    expect(prices).toContainEqual({ currency: "EUR", amount: 694 });
    expect(prices).toContainEqual({ currency: "JPY", amount: 80000 });
    expect(prices).toContainEqual({ currency: "JPY", amount: 50000 });
  });
});

describe("summarizePrices", () => {
  it("normalizes to JPY and reports min/median/max", () => {
    const s = summarizePrices(
      [
        { currency: "USD", amount: 100 }, // ¥15,000
        { currency: "USD", amount: 200 }, // ¥30,000
        { currency: "JPY", amount: 60000 },
      ],
      fx,
    );
    expect(s).toContain("min ¥15,000");
    expect(s).toContain("median ¥30,000");
    expect(s).toContain("max ¥60,000");
    expect(s).toContain("n=3");
  });

  it("returns undefined with too few usable prices", () => {
    expect(summarizePrices([{ currency: "USD", amount: 100 }], fx)).toBeUndefined();
  });
});
