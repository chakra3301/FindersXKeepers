import { describe, expect, it, vi } from "vitest";
import { DailyCapEstimator } from "./daily-cap";
import type { Estimator } from "./types";

function fakeInner() {
  return {
    name: "deepseek",
    estimateShipping: vi.fn(async () => ({ shippingJpy: 3000, source: "deepseek" as const })),
    estimateItemValue: vi.fn(async () => ({
      itemValueJpy: 50000, lowJpy: 40000, highJpy: 60000, confidence: 0.8, source: "deepseek" as const,
    })),
  } satisfies Estimator & {
    estimateShipping: ReturnType<typeof vi.fn>;
    estimateItemValue: ReturnType<typeof vi.fn>;
  };
}

const item = { title: "x", minCondition: "good" as const };
const ship = { title: "x", minCondition: "good" as const };

describe("DailyCapEstimator", () => {
  it("passes through under the cap, then serves the stub", async () => {
    const inner = fakeInner();
    const capped = new DailyCapEstimator(inner, 2);

    const a = await capped.estimateItemValue(item);
    const b = await capped.estimateShipping(ship);
    expect(a.source).toBe("deepseek");
    expect(b.source).toBe("deepseek");

    // 3rd op exceeds the cap of 2 → stub, tagged fallback, inner not called.
    const c = await capped.estimateItemValue(item);
    expect(c.source).toBe("fallback");
    expect(inner.estimateItemValue).toHaveBeenCalledTimes(1);
  });

  it("defaults an invalid cap instead of blocking everything", async () => {
    const inner = fakeInner();
    const capped = new DailyCapEstimator(inner, 0);
    const r = await capped.estimateShipping(ship);
    expect(r.source).toBe("deepseek"); // 0 → default (1000), so it passes through
  });
});
