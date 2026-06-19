/**
 * Live web grounding via Exa.
 *
 * Pulls recent comps from a category's TRUSTED domains (TCGplayer, Grailed,
 * StockX, Chrono24, DHL/FedEx, …) so the DeepSeek estimator reasons over real,
 * current listings instead of training-set memory.
 *
 * Best-effort by design: any failure (no key, network, bad JSON) returns
 * `undefined` and the estimator simply proceeds with its category skill prompt.
 * Grounding must never block or slow checkout past its own short timeout.
 */
const EXA_SEARCH_URL = "https://api.exa.ai/search";
const GROUNDING_TIMEOUT_MS = 10_000;

export interface Comp {
  title: string;
  url: string;
  text: string;
}

export interface ExaSearchParams {
  query: string;
  apiKey: string;
  includeDomains?: string[];
  numResults?: number;
  signal?: AbortSignal;
}

interface ExaResult {
  title?: string;
  url?: string;
  text?: string;
  highlights?: string[];
}

/** One Exa search restricted to trusted domains, returning trimmed snippets. */
export async function exaSearch(params: ExaSearchParams): Promise<Comp[]> {
  const res = await fetch(EXA_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
    },
    body: JSON.stringify({
      query: params.query,
      numResults: params.numResults ?? 6,
      type: "auto",
      includeDomains: params.includeDomains,
      contents: { text: { maxCharacters: 600 } },
    }),
    signal: params.signal,
  });
  if (!res.ok) {
    throw new Error(`Exa HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { results?: ExaResult[] };
  return (json.results ?? []).map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    text: (r.text ?? r.highlights?.join(" ") ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 600),
  }));
}

/** Render comps as a compact context block for the model prompt. */
export function formatComps(comps: Comp[]): string {
  return comps
    .filter((c) => c.text)
    .slice(0, 5)
    .map((c, i) => `(${i + 1}) ${c.title} — ${c.url}\n${c.text}`)
    .join("\n\n");
}

/**
 * Gather a grounding block for a query + trusted domains. Returns undefined when
 * grounding is unavailable or finds nothing usable — callers fall back to the
 * skill prompt alone.
 */
export async function gatherWebContext(
  query: string,
  domains: string[],
  apiKey: string | undefined,
): Promise<string | undefined> {
  if (!apiKey) return undefined;
  try {
    const comps = await exaSearch({
      query,
      apiKey,
      includeDomains: domains,
      numResults: 6,
      signal: AbortSignal.timeout(GROUNDING_TIMEOUT_MS),
    });
    const block = formatComps(comps);
    return block || undefined;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[estimator:exa] grounding skipped: ${msg}`);
    return undefined;
  }
}
