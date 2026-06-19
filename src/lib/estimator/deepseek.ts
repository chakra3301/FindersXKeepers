import { StubEstimator } from "./stub";
import type { DeepseekEnv } from "./env";
import { itemValueSkill, shippingSkill } from "./pricing-skill";
import { gatherWebContext } from "./web-grounding";
import type {
  Estimator,
  ItemValueEstimate,
  ItemValueEstimateInput,
  ShippingEstimate,
  ShippingEstimateInput,
} from "./types";

/** Sane guardrails so a hallucinated figure can never blow up the escrow hold. */
const SHIPPING_MIN_JPY = 500;
const SHIPPING_MAX_JPY = 60_000;
const ITEM_VALUE_MAX_JPY = 5_000_000;

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/**
 * DeepSeek-backed estimator. Uses the OpenAI-compatible chat-completions API
 * (no SDK — a single `fetch`), forces JSON output at temperature 0 for
 * determinism, then clamps the result into safe bounds.
 *
 * Estimates must NEVER block a customer at checkout, so every call is wrapped:
 * on any network/parse/validation failure we fall back to the deterministic
 * stub and tag the result `source: "fallback"`.
 */
export class DeepseekEstimator implements Estimator {
  readonly name = "deepseek";
  private readonly fallback = new StubEstimator();

  constructor(private readonly env: DeepseekEnv) {}

  async estimateShipping(
    input: ShippingEstimateInput,
  ): Promise<ShippingEstimate> {
    const skill = shippingSkill(input);
    try {
      const comps = await gatherWebContext(
        `international parcel shipping cost from Japan to ${input.destinationCountry ?? "USA"} small parcel courier`,
        skill.domains,
        this.env.exaApiKey,
      );
      const user = withComps(skill.user, comps);
      const data = await this.ask(skill.system, user);
      const shippingJpy = clamp(
        Math.round(Number(data.shippingJpy)),
        SHIPPING_MIN_JPY,
        SHIPPING_MAX_JPY,
      );
      if (!Number.isFinite(shippingJpy) || shippingJpy <= 0) {
        throw new Error("non-positive shippingJpy");
      }
      return {
        shippingJpy,
        source: "deepseek",
        category: skill.category,
        carrier: asText(data.carrier),
        sources: asStringArray(data.sources),
        rationale: asText(data.rationale),
      };
    } catch (e) {
      console.warn(`[estimator:deepseek] shipping fell back: ${asText(e)}`);
      const stub = await this.fallback.estimateShipping();
      return { ...stub, source: "fallback" };
    }
  }

  async estimateItemValue(
    input: ItemValueEstimateInput,
  ): Promise<ItemValueEstimate> {
    const cap = input.budgetCapJpy ?? 0;
    const skill = itemValueSkill(input);
    try {
      const comps = await gatherWebContext(
        `${input.title} ${input.description ?? ""} sold price`.trim(),
        skill.domains,
        this.env.exaApiKey,
      );
      const user = withComps(skill.user, comps);
      const data = await this.ask(skill.system, user);
      let itemValueJpy = clamp(
        Math.round(Number(data.itemValueJpy)),
        1,
        ITEM_VALUE_MAX_JPY,
      );
      let lowJpy = clamp(Math.round(Number(data.lowJpy)), 1, itemValueJpy);
      let highJpy = clamp(
        Math.round(Number(data.highJpy)),
        itemValueJpy,
        ITEM_VALUE_MAX_JPY,
      );
      // The estimate can never authorise more than the customer's cap.
      if (cap > 0) {
        itemValueJpy = Math.min(itemValueJpy, cap);
        lowJpy = Math.min(lowJpy, itemValueJpy);
        highJpy = Math.min(highJpy, cap);
      }
      if (!Number.isFinite(itemValueJpy) || itemValueJpy <= 0) {
        throw new Error("non-positive itemValueJpy");
      }
      const confidence = clamp(Number(data.confidence) || 0.4, 0, 1);
      return {
        itemValueJpy,
        lowJpy,
        highJpy,
        confidence,
        source: "deepseek",
        category: skill.category,
        sources: asStringArray(data.sources) ?? skill.sources,
        rationale: asText(data.rationale),
      };
    } catch (e) {
      console.warn(`[estimator:deepseek] item value fell back: ${asText(e)}`);
      const stub = await this.fallback.estimateItemValue(input);
      return { ...stub, source: "fallback" };
    }
  }

  /**
   * One JSON round-trip to the chat-completions endpoint. Works against any
   * OpenAI-compatible gateway (DeepSeek direct, opencode Zen, OpenRouter, …):
   * tries strict JSON mode first, retries plain if the gateway rejects the
   * `response_format` param, and extracts JSON tolerantly from the reply.
   */
  private async ask(
    system: string,
    user: string,
  ): Promise<Record<string, unknown>> {
    let content: string;
    try {
      content = await this.complete(system, user, true);
    } catch (e) {
      // Some gateways 400/422 on response_format — retry without JSON mode.
      if (/\b4\d\d\b/.test(asText(e) ?? "")) {
        content = await this.complete(system, user, false);
      } else {
        throw e;
      }
    }
    return extractJson(content);
  }

  private async complete(
    system: string,
    user: string,
    jsonMode: boolean,
  ): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.env.model,
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    const res = await fetch(`${this.env.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.env.apiKey}`,
      },
      body: JSON.stringify(body),
      // Never let a slow model wedge checkout.
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty completion");
    return content;
  }
}

/** Tolerant JSON extraction: handles ```json fences and surrounding prose. */
function extractJson(text: string): Record<string, unknown> {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t) as Record<string, unknown>;
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(t.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error("no JSON object in completion");
  }
}

function asText(v: unknown): string | undefined {
  if (v == null) return undefined;
  return v instanceof Error ? v.message : String(v);
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === "string");
  return out.length ? out : undefined;
}

/** Append live web comps to the skill prompt when grounding is available. */
function withComps(user: string, comps: string | undefined): string {
  if (!comps) return user;
  return `${user}

LIVE WEB COMPS (recent listings from trusted sources — weigh these heavily over memory):
${comps}`;
}
