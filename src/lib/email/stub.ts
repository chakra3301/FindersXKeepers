import type { EmailMessage, EmailProvider } from "./types";

/**
 * Dev/seed email provider. Sends nothing — logs a one-line summary so the
 * transactional flow is observable without an API key or real mail. This is the
 * default; production sets EMAIL_PROVIDER=resend.
 */
export class StubEmailProvider implements EmailProvider {
  readonly name = "stub";

  async send(message: EmailMessage): Promise<void> {
    console.info(
      `[email:stub] → ${message.to} · ${message.subject} (not sent; EMAIL_PROVIDER=stub)`,
    );
  }
}
