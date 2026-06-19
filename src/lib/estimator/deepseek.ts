import { StubEstimator } from "./stub";
import type { DeepseekEnv } from "./env";
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
    try {
      const data = await this.ask(
        "You estimate parcel shipping cost from Japan to an overseas buyer.",
        [
          `Item: ${input.title}`,
          input.description ? `Details: ${input.description}` : null,
          `Minimum condition: ${input.minCondition}`,
          `Destination country: ${input.destinationCountry ?? "unknown"}`,
          "",
          "Estimate the all-in international shipping cost in Japanese yen,",
          "including protective packaging and tracked courier.",
          'Respond as JSON: {"shippingJpy": number, "rationale": string}.',
        ],
      );
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
    try {
      const data = await this.ask(
        "You estimate the second-hand market price of an item in Japan.",
        [
          `Item: ${input.title}`,
          input.description ? `Details: ${input.description}` : null,
          `Minimum condition: ${input.minCondition}`,
          input.mustHaves?.length
            ? `Must have: ${input.mustHaves.join(", ")}`
            : null,
          input.niceToHaves?.length
            ? `Nice to have: ${input.niceToHaves.join(", ")}`
            : null,
          "",
          "Estimate the typical Japanese second-hand price in yen and a",
          "plausible low/high range.",
          'Respond as JSON: {"itemValueJpy": number, "lowJpy": number,',
          '"highJpy": number, "confidence": number, "rationale": string}.',
        ],
      );
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
        rationale: asText(data.rationale),
      };
    } catch (e) {
      console.warn(`[estimator:deepseek] item value fell back: ${asText(e)}`);
      const stub = await this.fallback.estimateItemValue(input);
      return { ...stub, source: "fallback" };
    }
  }

  /** One JSON round-trip to the chat-completions endpoint. */
  private async ask(
    system: string,
    userLines: (string | null)[],
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.env.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.env.apiKey}`,
      },
      body: JSON.stringify({
        model: this.env.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: userLines.filter(Boolean).join("\n"),
          },
        ],
      }),
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
    return JSON.parse(content) as Record<string, unknown>;
  }
}

function asText(v: unknown): string | undefined {
  if (v == null) return undefined;
  return v instanceof Error ? v.message : String(v);
}
