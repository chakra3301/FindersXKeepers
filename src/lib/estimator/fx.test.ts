import { describe, expect, it } from "vitest";
import { fxLine, toJpy, type FxToJpy } from "./fx";

const fx: FxToJpy = { JPY: 1, USD: 150, EUR: 160, GBP: 190 };

describe("toJpy", () => {
  it("converts known currencies", () => {
    expect(toJpy(10, "USD", fx)).toBe(1500);
    expect(toJpy(10, "eur", fx)).toBe(1600);
    expect(toJpy(1000, "JPY", fx)).toBe(1000);
  });
  it("returns null for unknown currency", () => {
    expect(toJpy(10, "AUD", fx)).toBeNull();
  });
});

describe("fxLine", () => {
  it("renders a one-line FX summary", () => {
    expect(fxLine(fx)).toBe("USD→JPY 150, EUR→JPY 160, GBP→JPY 190");
  });
});
