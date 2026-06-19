import { describe, expect, it } from "vitest";
import { cleanEnvValue } from "./env-clean";

describe("cleanEnvValue", () => {
  it("strips an accidentally pasted KEY= prefix", () => {
    expect(cleanEnvValue("ESTIMATOR_PROVIDER", "ESTIMATOR_PROVIDER=deepseek")).toBe("deepseek");
    expect(cleanEnvValue("DEEPSEEK_BASE_URL", "DEEPSEEK_BASE_URL=https://x/v1")).toBe("https://x/v1");
  });
  it("trims whitespace and wrapping quotes", () => {
    expect(cleanEnvValue("X", "  https://x/v1   ")).toBe("https://x/v1");
    expect(cleanEnvValue("X", '"sk-abc"')).toBe("sk-abc");
  });
  it("returns undefined for empty / missing", () => {
    expect(cleanEnvValue("X", "")).toBeUndefined();
    expect(cleanEnvValue("X", "   ")).toBeUndefined();
    expect(cleanEnvValue("X", undefined)).toBeUndefined();
  });
  it("passes a clean value through unchanged", () => {
    expect(cleanEnvValue("X", "deepseek")).toBe("deepseek");
  });
});
