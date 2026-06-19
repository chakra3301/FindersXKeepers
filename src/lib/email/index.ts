import { Resend } from "resend";
import type { EmailProvider } from "./types";
import { StubEmailProvider } from "./stub";
import { ResendEmailProvider } from "./resend";
import { readResendEnv } from "./env";
import { cleanEnvValue } from "@/lib/env-clean";

export type { EmailProvider, EmailMessage } from "./types";

/**
 * Email provider factory — the ONE place to swap stub → Resend.
 *
 * Mirrors the escrow seam (src/lib/escrow/index.ts). Everyone depends on the
 * `email` singleton below; flipping EMAIL_PROVIDER=resend switches the whole app
 * with no other code change.
 */
function createEmailProvider(): EmailProvider {
  const provider =
    cleanEnvValue("EMAIL_PROVIDER", process.env.EMAIL_PROVIDER) ?? "stub";
  if (provider === "resend") {
    try {
      const { apiKey, from } = readResendEnv();
      return new ResendEmailProvider(new Resend(apiKey), from);
    } catch (e) {
      // Missing Resend keys must not break the build/app — log + fall back to stub.
      console.error(
        `[email] resend config invalid, using stub: ${e instanceof Error ? e.message : e}`,
      );
      return new StubEmailProvider();
    }
  }
  if (provider !== "stub") {
    console.error(`[email] Unknown EMAIL_PROVIDER "${provider}", using stub`);
  }
  return new StubEmailProvider();
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
