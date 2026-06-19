import { Resend } from "resend";
import type { EmailProvider } from "./types";
import { StubEmailProvider } from "./stub";
import { ResendEmailProvider } from "./resend";
import { readResendEnv } from "./env";

export type { EmailProvider, EmailMessage } from "./types";

/**
 * Email provider factory — the ONE place to swap stub → Resend.
 *
 * Mirrors the escrow seam (src/lib/escrow/index.ts). Everyone depends on the
 * `email` singleton below; flipping EMAIL_PROVIDER=resend switches the whole app
 * with no other code change.
 */
function createEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER ?? "stub";
  switch (provider) {
    case "stub":
      return new StubEmailProvider();
    case "resend": {
      const { apiKey, from } = readResendEnv();
      return new ResendEmailProvider(new Resend(apiKey), from);
    }
    default:
      throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
  }
}

const globalForEmail = globalThis as unknown as {
  __fkEmail?: EmailProvider;
};

function getEmailProvider(): EmailProvider {
  if (globalForEmail.__fkEmail) return globalForEmail.__fkEmail;
  const provider = createEmailProvider();
  globalForEmail.__fkEmail = provider;
  return provider;
}

export const email: EmailProvider = getEmailProvider();
