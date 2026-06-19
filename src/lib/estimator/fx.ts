/**
 * Live FX → JPY, so the estimator converts USD/EUR/GBP comps correctly instead
 * of relying on the model's stale, training-baked exchange rate (the #1 source
 * of pricing error). Cached in-process for 12h; falls back to recent constants
 * if the (free, keyless) rate API is unreachable. Never blocks an estimate.
 */
const FX_URL = "https://open.er-api.com/v6/latest/USD";
const TTL_MS = 12 * 60 * 60 * 1000;

/** Rough recent rates — only used if the live fetch fails on a cold cache. */
const FALLBACK: FxToJpy = { JPY: 1, USD: 150, EUR: 163, GBP: 190 };

export interface FxToJpy {
  JPY: number;
  USD: number;
  EUR: number;
  GBP: number;
}

let cache: { at: number; fx: FxToJpy } | null = null;

export async function getFxToJpy(): Promise<FxToJpy> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.fx;
  try {
    const res = await fetch(FX_URL, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
    const json = (await res.json()) as { rates?: Record<string, number> };
    const r = json.rates ?? {};
    const usdJpy = Number(r.JPY);
    if (!Number.isFinite(usdJpy) || usdJpy <= 0) throw new Error("no JPY rate");
    const fx: FxToJpy = {
      JPY: 1,
      USD: usdJpy,
      EUR: r.EUR ? usdJpy / Number(r.EUR) : FALLBACK.EUR,
      GBP: r.GBP ? usdJpy / Number(r.GBP) : FALLBACK.GBP,
    };
    cache = { at: Date.now(), fx };
    return fx;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[estimator:fx] live rate unavailable, using fallback: ${msg}`);
    return cache?.fx ?? FALLBACK;
  }
}

/** Convert an amount in `currency` to whole yen, or null for unknown currency. */
export function toJpy(
  amount: number,
  currency: string,
  fx: FxToJpy,
): number | null {
  const rate = fx[currency.toUpperCase() as keyof FxToJpy];
  return rate ? Math.round(amount * rate) : null;
}

/** One-line FX summary for the model prompt. */
export function fxLine(fx: FxToJpy): string {
  return `USD→JPY ${Math.round(fx.USD)}, EUR→JPY ${Math.round(fx.EUR)}, GBP→JPY ${Math.round(fx.GBP)}`;
}
