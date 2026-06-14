import "server-only";

import {
  checkRateLimit,
  retryAfterMessage,
  type RateLimitResult,
  type RateLimitStore,
} from "./rate-limit";

/** Per-user cap on new request submissions (abuse guard). */
const CREATE_REQUEST_CONFIG = {
  max: 10,
  windowMs: 60 * 60 * 1000,
} as const;

const globalForRateLimit = globalThis as unknown as {
  __fkRateLimitStore?: RateLimitStore;
};

function store(): RateLimitStore {
  globalForRateLimit.__fkRateLimitStore ??= new Map();
  return globalForRateLimit.__fkRateLimitStore;
}

/** Returns whether the user may submit another create-request action. */
export function checkCreateRequestRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(
    `create-request:${userId}`,
    store(),
    CREATE_REQUEST_CONFIG,
  );
}

export function createRequestRateLimitMessage(result: RateLimitResult): string {
  return retryAfterMessage(result.retryAfterMs ?? CREATE_REQUEST_CONFIG.windowMs);
}
