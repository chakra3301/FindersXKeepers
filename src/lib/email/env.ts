/**
 * Validated access to the email-provider environment, read lazily so the stub
 * (and the rest of the app) never require Resend keys to be present.
 */
export interface ResendEnv {
  apiKey: string;
  from: string;
}

export function readResendEnv(): ResendEnv {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) {
    throw new Error(
      "Missing RESEND_API_KEY. Required when EMAIL_PROVIDER=resend; see .env.example.",
    );
  }
  if (!from) {
    throw new Error(
      'Missing EMAIL_FROM (e.g. "Finders Keepers <hello@yourdomain.com>"). ' +
        "Required when EMAIL_PROVIDER=resend.",
    );
  }
  return { apiKey, from };
}

export { siteUrl } from "@/lib/site-url";
