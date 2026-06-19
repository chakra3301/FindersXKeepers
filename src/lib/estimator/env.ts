import { z } from "zod";
import { cleanEnvValue } from "@/lib/env-clean";

/**
 * DeepSeek estimator config. Read + validated only when
 * ESTIMATOR_PROVIDER=deepseek; ignored for the stub. Mirrors the validation
 * style of src/lib/escrow/stripe-env.ts and src/lib/email/env.ts.
 */
const schema = z.object({
  DEEPSEEK_API_KEY: z.string().min(1, "DEEPSEEK_API_KEY is required"),
  DEEPSEEK_BASE_URL: z
    .string()
    .url()
    .default("https://api.deepseek.com/v1"),
  DEEPSEEK_MODEL: z.string().min(1).default("deepseek-chat"),
  // Optional stronger model for LOW-CONFIDENCE item-value escalation
  // (e.g. deepseek/deepseek-r1 on OpenRouter, deepseek-reasoner direct).
  DEEPSEEK_REASONER_MODEL: z.string().min(1).optional(),
  // Optional: enables live web grounding via Exa. Absent → skill-only prompting.
  EXA_API_KEY: z.string().min(1).optional(),
});

export interface DeepseekEnv {
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Stronger model used only to re-price low-confidence items; optional. */
  reasonerModel?: string;
  /** Exa key for live web grounding; undefined disables grounding. */
  exaApiKey?: string;
}

export function readDeepseekEnv(): DeepseekEnv {
  // Tolerate pasted "KEY=value" lines / trailing spaces from dashboards.
  const raw = {
    DEEPSEEK_API_KEY: cleanEnvValue("DEEPSEEK_API_KEY", process.env.DEEPSEEK_API_KEY),
    DEEPSEEK_BASE_URL: cleanEnvValue("DEEPSEEK_BASE_URL", process.env.DEEPSEEK_BASE_URL),
    DEEPSEEK_MODEL: cleanEnvValue("DEEPSEEK_MODEL", process.env.DEEPSEEK_MODEL),
    DEEPSEEK_REASONER_MODEL: cleanEnvValue(
      "DEEPSEEK_REASONER_MODEL",
      process.env.DEEPSEEK_REASONER_MODEL,
    ),
    EXA_API_KEY: cleanEnvValue("EXA_API_KEY", process.env.EXA_API_KEY),
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(
      `Invalid DeepSeek estimator env (ESTIMATOR_PROVIDER=deepseek): ${issues}`,
    );
  }
  return {
    apiKey: parsed.data.DEEPSEEK_API_KEY,
    baseUrl: parsed.data.DEEPSEEK_BASE_URL,
    model: parsed.data.DEEPSEEK_MODEL,
    reasonerModel: parsed.data.DEEPSEEK_REASONER_MODEL,
    exaApiKey: parsed.data.EXA_API_KEY,
  };
}
