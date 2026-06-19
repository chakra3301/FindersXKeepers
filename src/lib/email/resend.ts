import { Resend } from "resend";
import type { EmailMessage, EmailProvider } from "./types";

/**
 * Resend-backed provider. A send failure is logged and swallowed (never thrown)
 * so a bounced notification can't roll back the payment/shipment that triggered
 * it — delivery is best-effort, the lifecycle write is authoritative.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private readonly client: Resend,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    try {
      const { error } = await this.client.emails.send({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      if (error) {
        console.error(`[email:resend] send failed: ${error.message}`);
      }
    } catch (err) {
      console.error(
        `[email:resend] send threw: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
