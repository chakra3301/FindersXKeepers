import type {
  Estimator,
  ItemValueEstimate,
  ItemValueEstimateInput,
  ShippingEstimate,
  ShippingEstimateInput,
} from "./types";
import { StubEstimator } from "./stub";
import { DeepseekEstimator } from "./deepseek";
import { readDeepseekEnv } from "./env";

export type {
  Estimator,
  ShippingEstimate,
  ShippingEstimateInput,
  ItemValueEstimate,
  ItemValueEstimateInput,
  EstimateSource,
} from "./types";

/**
 * Estimator provider factory — the ONE place to swap stub → DeepSeek.
 *
 * Mirrors the escrow (src/lib/escrow/index.ts) and email seams. Everyone depends
 * on the `estimator` singleton below; flipping ESTIMATOR_PROVIDER=deepseek routes
 * shipping + item-value estimates through the model with no other code change.
 */
function createEstimator(): Estimator {
  const provider = process.env.ESTIMATOR_PROVIDER ?? "stub";
  switch (provider) {
    case "stub":
      return new StubEstimator();
    case "deepseek":
      return new MemoizingEstimator(new DeepseekEstimator(readDeepseekEnv()));
    default:
      throw new Error(`Unknown ESTIMATOR_PROVIDER: ${provider}`);
  }
}

/**
 * Wraps an estimator so identical inputs return the SAME figure for a short
 * window. This upholds the pricing invariant: the estimate shown at checkout and
 * the one used to size the escrow hold must be built from the same input — even
 * when a (slightly non-deterministic, latent) model answers. The stub is already
 * deterministic, so it isn't wrapped.
 */
class MemoizingEstimator implements Estimator {
  readonly name: string;
  private readonly ttlMs = 10 * 60 * 1000;
  private readonly cache = new Map<string, { at: number; value: unknown }>();

  constructor(private readonly inner: Estimator) {
    this.name = inner.name;
  }

  estimateShipping(input: ShippingEstimateInput): Promise<ShippingEstimate> {
    return this.memo(`ship:${JSON.stringify(input)}`, () =>
      this.inner.estimateShipping(input),
    );
  }

  estimateItemValue(
    input: ItemValueEstimateInput,
  ): Promise<ItemValueEstimate> {
    return this.memo(`item:${JSON.stringify(input)}`, () =>
      this.inner.estimateItemValue(input),
    );
  }

  private async memo<T>(key: string, run: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.value as T;
    const value = await run();
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }
}

const ESTIMATOR_CACHE_VERSION = 1;

const globalForEstimator = globalThis as unknown as {
  __fkEstimator?: Estimator;
  __fkEstimatorVersion?: number;
};

function getEstimator(): Estimator {
  if (
    globalForEstimator.__fkEstimator &&
    globalForEstimator.__fkEstimatorVersion === ESTIMATOR_CACHE_VERSION
  ) {
    return globalForEstimator.__fkEstimator;
  }
  const provider = createEstimator();
  globalForEstimator.__fkEstimator = provider;
  globalForEstimator.__fkEstimatorVersion = ESTIMATOR_CACHE_VERSION;
  return provider;
}

export const estimator: Estimator = getEstimator();
