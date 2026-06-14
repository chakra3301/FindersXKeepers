import { describe, expect, it } from "vitest";
import {
  checkRateLimit,
  retryAfterMessage,
  type RateLimitStore,
} from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows up to max hits inside the window", () => {
    const store: RateLimitStore = new Map();
    const config = { max: 3, windowMs: 60_000 };
    const t0 = 1_000_000;

    expect(checkRateLimit("u1", store, config, t0).allowed).toBe(true);
    expect(checkRateLimit("u1", store, config, t0 + 1).allowed).toBe(true);
    expect(checkRateLimit("u1", store, config, t0 + 2).allowed).toBe(true);
    expect(checkRateLimit("u1", store, config, t0 + 3).allowed).toBe(false);
  });

  it("resets after the window slides past old hits", () => {
    const store: RateLimitStore = new Map();
    const config = { max: 1, windowMs: 10_000 };

    expect(checkRateLimit("u1", store, config, 0).allowed).toBe(true);
    expect(checkRateLimit("u1", store, config, 5_000).allowed).toBe(false);
    expect(checkRateLimit("u1", store, config, 10_001).allowed).toBe(true);
  });

  it("scopes keys independently", () => {
    const store: RateLimitStore = new Map();
    const config = { max: 1, windowMs: 10_000 };

    expect(checkRateLimit("a", store, config, 0).allowed).toBe(true);
    expect(checkRateLimit("b", store, config, 0).allowed).toBe(true);
    expect(checkRateLimit("a", store, config, 1).allowed).toBe(false);
  });
});

describe("retryAfterMessage", () => {
  it("rounds up to whole minutes", () => {
    expect(retryAfterMessage(90_000)).toMatch(/2 minutes/);
    expect(retryAfterMessage(30_000)).toMatch(/1 minute\./);
  });
});
