import { toJpy, type FxToJpy } from "./fx";

/**
 * Pull money figures out of comp text so we can hand the model a STRUCTURED
 * min/median/max (normalized to JPY) instead of raw page prose — far less room
 * to misread a price or currency.
 */
export interface ParsedPrice {
  currency: "USD" | "EUR" | "GBP" | "JPY";
  amount: number;
}

export function extractPrices(text: string): ParsedPrice[] {
  const out: ParsedPrice[] = [];
  const push = (currency: ParsedPrice["currency"], raw: string) => {
    const n = Number(raw.replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) out.push({ currency, amount: n });
  };
  for (const m of text.matchAll(/\$\s?([\d,]+(?:\.\d+)?)/g)) push("USD", m[1]);
  for (const m of text.matchAll(/€\s?([\d,]+(?:\.\d+)?)/g)) push("EUR", m[1]);
  for (const m of text.matchAll(/£\s?([\d,]+(?:\.\d+)?)/g)) push("GBP", m[1]);
  for (const m of text.matchAll(/[¥￥]\s?([\d,]+)/g)) push("JPY", m[1]);
  for (const m of text.matchAll(/([\d,]+)\s*円/g)) push("JPY", m[1]);
  for (const m of text.matchAll(/([\d,]+)\s*yen\b/gi)) push("JPY", m[1]);
  for (const m of text.matchAll(/\b(USD|EUR|GBP|JPY)\s?([\d,]+(?:\.\d+)?)/gi)) {
    push(m[1].toUpperCase() as ParsedPrice["currency"], m[2]);
  }
  return out;
}

const fmt = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

/**
 * Normalize parsed prices to JPY and summarize. Returns undefined when there
 * aren't enough usable figures to be meaningful (< 2). The median anchors the
 * estimate and is robust to the odd "$25 off" noise the page text carries.
 */
export function summarizePrices(
  prices: ParsedPrice[],
  fx?: FxToJpy,
): string | undefined {
  const jpy: number[] = [];
  for (const p of prices) {
    if (fx) {
      const v = toJpy(p.amount, p.currency, fx);
      if (v) jpy.push(v);
    } else if (p.currency === "JPY") {
      jpy.push(p.amount);
    }
  }
  if (jpy.length < 2) return undefined;
  jpy.sort((a, b) => a - b);
  const min = jpy[0];
  const max = jpy[jpy.length - 1];
  const mid =
    jpy.length % 2
      ? jpy[(jpy.length - 1) / 2]
      : Math.round((jpy[jpy.length / 2 - 1] + jpy[jpy.length / 2]) / 2);
  return (
    `OBSERVED PRICES from the comps, normalized to JPY: ` +
    `min ${fmt(min)} · median ${fmt(mid)} · max ${fmt(max)} (n=${jpy.length}). ` +
    `Anchor on the median, adjusting for the requested grade/condition.`
  );
}
