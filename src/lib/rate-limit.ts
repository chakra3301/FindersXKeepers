export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

/** Timestamp lists keyed by an arbitrary rate-limit key (e.g. user id). */
export type RateLimitStore = Map<string, number[]>;

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until the oldest hit in the window expires. */
  retryAfterMs?: number;
}

/**
 * Sliding-window rate limit. Mutates `store` when allowed. Pure aside from the
 * store — unit-test with a fresh Map per test.
 */
export function checkRateLimit(
  key: string,
  store: RateLimitStore,
  config: RateLimitConfig,
  now = Date.now(),
): RateLimitResult {
  const windowStart = now - config.windowMs;
  const recent = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (recent.length >= config.max) {
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfterMs: Math.max(0, oldest + config.windowMs - now),
    };
  }

  recent.push(now);
  store.set(key, recent);
  return { allowed: true };
}

export function retryAfterMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  return `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
