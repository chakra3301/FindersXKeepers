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
  });
  it("exposes the supported set", () => {
    expect(SUPPORTED_CURRENCIES).toContain("USD");
  });
});
