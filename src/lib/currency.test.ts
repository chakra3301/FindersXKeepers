import { describe, expect, it } from "vitest";
import { formatLocalApprox, SUPPORTED_CURRENCIES } from "./currency";

describe("formatLocalApprox", () => {
  it("returns null for JPY (no second line needed)", () => {
    expect(formatLocalApprox(10_000, "JPY")).toBeNull();
  });
  it("returns null for an unknown currency code", () => {
    expect(formatLocalApprox(10_000, "ZZZ")).toBeNull();
  });
  it("formats a known currency with the ≈ / indicative markers", () => {
    const out = formatLocalApprox(10_000, "USD");
    expect(out).toContain("≈");
    expect(out).toContain("$");
    expect(out).toContain("indicative");
    // Pin the exact output: 10_000 × 0.0064 = 64
    expect(out).toBe("≈ $64 USD (indicative)");
  });
  it("formats with a thousands separator", () => {
    // 5_000_000 × 0.0064 = 32000
    expect(formatLocalApprox(5_000_000, "USD")).toBe("≈ $32,000 USD (indicative)");
  });
  it("exposes the supported set", () => {
    expect(SUPPORTED_CURRENCIES).toContain("USD");
  });
});
