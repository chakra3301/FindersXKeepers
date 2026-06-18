/**
 * The email seam — mirrors the escrow seam (src/lib/escrow).
 *
 * Nothing outside this folder imports a concrete provider; callers depend on the
 * `email` singleton in ./index.ts. Flipping EMAIL_PROVIDER=resend switches the
 * whole app onto Resend with no other code change. The default stub logs to the
 * console so dev/seed work with no API key and no real mail.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  /** Rendered HTML body. */
  html: string;
  /** Plain-text fallback. */
  text: string;
}

export interface EmailProvider {
  /** Name of the backing provider, for logging/diagnostics. */
  readonly name: string;

  /**
   * Deliver one message. Implementations must resolve (never throw) on a send
   * failure — a bounced notification must not break the payment/shipment flow
   * that triggered it. Failures are logged and swallowed.
   */
  send(message: EmailMessage): Promise<void>;
}
