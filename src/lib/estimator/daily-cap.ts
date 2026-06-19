import { StubEstimator } from "./stub";
import type {
  Estimator,
  ItemValueEstimate,
  ItemValueEstimateInput,
  ShippingEstimate,
  ShippingEstimateInput,
} from "./types";

const DEFAULT_DAILY_CAP = 1000;

function currentUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Circuit breaker: after `cap` paid estimate operations in a UTC day, serve the
 * deterministic stub instead of calling the model + Exa — a safety valve against
 * a traffic spike or a loop running up OpenRouter/Exa spend.
 *
 * Sits INSIDE the memoizer (memoized cache hits cost nothing and never reach
 * here), so only real model-backed calls count. The counter is per-process and
 * best-effort: it resets on cold start and isn't shared across serverless
 * instances. For a hard global cap, back it with a shared store (Supabase/Redis).
 */
export class DailyCapEstimator implements Estimator {
  readonly name: string;
  private readonly stub = new StubEstimator();
  private readonly cap: number;
  private day = currentUtcDay();
  private count = 0;

  constructor(private readonly inner: Estimator, cap = DEFAULT_DAILY_CAP) {
    this.name = inner.name;
    this.cap = cap > 0 ? cap : DEFAULT_DAILY_CAP;
  }

  async estimateShipping(
    input: ShippingEstimateInput,
  ): Promise<ShippingEstimate> {
    if (!this.allow()) {
      return { ...(await this.stub.estimateShipping()), source: "fallback" };
    }
    return this.inner.estimateShipping(input);
  }

  async estimateItemValue(
    input: ItemValueEstimateInput,
  ): Promise<ItemValueEstimate> {
    if (!this.allow()) {
      return { ...(await this.stub.estimateItemValue(input)), source: "fallback" };
    }
    return this.inner.estimateItemValue(input);
  }

  /** Count one operation against today's budget; false once the cap is spent. */
  private allow(): boolean {
    const today = currentUtcDay();
    if (today !== this.day) {
      this.day = today;
      this.count = 0;
    }
    if (this.count >= this.cap) {
      if (this.count === this.cap) {
        console.warn(
          `[estimator] daily cap ${this.cap} reached — serving stub estimates until UTC day rolls over.`,
        );
        this.count++; // log this warning exactly once per day
      }
      return false;
    }
    this.count++;
    return true;
  }
}

/** Read ESTIMATOR_DAILY_CAP (>0) or fall back to the default. */
export function readDailyCap(): number {
  const raw = Number(process.env.ESTIMATOR_DAILY_CAP);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_DAILY_CAP;
}
