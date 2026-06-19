import { z } from "zod";

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
});

export interface DeepseekEnv {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function readDeepseekEnv(): DeepseekEnv {
  const parsed = schema.safeParse(process.env);
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
  };
}
