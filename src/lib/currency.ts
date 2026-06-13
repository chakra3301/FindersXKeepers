/**
 * INDICATIVE local-currency display only. Rates are a static snapshot, NOT a
 * live FX feed — every output is marked "≈ … (indicative)" so we never imply a
 * settled local-currency amount. Real FX + locale-aware checkout is a later
 * phase. Source of truth for what the customer pays remains JPY.
 */
const RATES_PER_JPY: Record<string, { symbol: string; rate: number }> = {
  USD: { symbol: "$", rate: 0.0064 },
  EUR: { symbol: "€", rate: 0.0059 },
  GBP: { symbol: "£", rate: 0.0050 },
  AUD: { symbol: "A$", rate: 0.0098 },
  CAD: { symbol: "C$", rate: 0.0088 },
  SGD: { symbol: "S$", rate: 0.0086 },
};

export const SUPPORTED_CURRENCIES = Object.keys(RATES_PER_JPY);

export function formatLocalApprox(
  amountJpy: number | null | undefined,
  currencyPref: string | null | undefined,
): string | null {
  if (amountJpy == null) return null;
  const code = (currencyPref ?? "").toUpperCase();
  if (code === "JPY" || !RATES_PER_JPY[code]) return null;
  const { symbol, rate } = RATES_PER_JPY[code];
  const local = Math.round(amountJpy * rate);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(local);
  return `≈ ${symbol}${formatted} ${code} (indicative)`;
}
