import { formatJpy } from "@/lib/pricing";

/**
 * Transactional email templates. Each returns a subject + HTML + plain-text
 * body; all styling is inline (email clients strip <style>). Tone matches the
 * app: dark charcoal, single gold accent, no marketing fluff.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const INK = "#18181b";
const MUTED = "#6b7280";
const GOLD = "#c8a02a";
const BORDER = "#e5e7eb";

/** Wrap body HTML in the shared shell (header + footer + 特商法 link). */
function layout(opts: { heading: string; bodyHtml: string; ctaUrl: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f4;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:520px;background:#ffffff;border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">
      <tr><td style="background:${INK};padding:18px 28px;">
        <span style="color:#ffffff;font-weight:600;letter-spacing:-0.01em;font-size:15px;">Finders <span style="color:${GOLD};">×</span> Keepers</span>
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 14px;font-size:20px;font-weight:650;letter-spacing:-0.01em;">${opts.heading}</h1>
        ${opts.bodyHtml}
        <div style="margin-top:24px;">
          <a href="${opts.ctaUrl}" style="display:inline-block;background:${GOLD};color:${INK};font-weight:600;text-decoration:none;font-size:14px;padding:11px 20px;border-radius:9px;">View request</a>
        </div>
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid ${BORDER};font-size:12px;color:${MUTED};">
        Finders × Keepers · concierge sourcing from Japan<br/>
        You receive transactional updates about your requests. Manage what's optional in
        <a href="${opts.ctaUrl.replace(/\/requests\/.*$/, "/account")}" style="color:${MUTED};">account settings</a>.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:${INK};">${text}</p>`;
}

function amountRow(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;font-size:14px;color:${MUTED};">${label}</td><td style="padding:6px 0;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;">${value}</td></tr>`;
}

export function paymentConfirmedEmail(opts: {
  requestTitle: string;
  amountJpy: number;
  requestUrl: string;
}): RenderedEmail {
  const subject = `Escrow deposit confirmed — ${opts.requestTitle}`;
  const bodyHtml =
    p(
      `Your deposit is held safely in escrow and we've started sourcing <strong>${opts.requestTitle}</strong>. We hold nothing ourselves — funds sit with the payment processor and only release once your item is in transit.`,
    ) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-top:1px solid ${BORDER};">${amountRow(
      "Held in escrow",
      formatJpy(opts.amountJpy),
    )}</table>`;
  const text = `Escrow deposit confirmed for "${opts.requestTitle}".

Your deposit of ${formatJpy(opts.amountJpy)} is held safely in escrow and we've started sourcing. Funds only release once your item is in transit.

View request: ${opts.requestUrl}`;
  return { subject, html: layout({ heading: "Deposit confirmed", bodyHtml, ctaUrl: opts.requestUrl }), text };
}

export function itemShippedEmail(opts: {
  requestTitle: string;
  carrier: string;
  trackingNumber: string;
  requestUrl: string;
}): RenderedEmail {
  const subject = `On its way — ${opts.requestTitle}`;
  const bodyHtml =
    p(
      `Good news — <strong>${opts.requestTitle}</strong> has shipped. Your escrow has now released, since the item is in transit.`,
    ) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-top:1px solid ${BORDER};">${amountRow(
      "Carrier",
      opts.carrier,
    )}${amountRow("Tracking", opts.trackingNumber)}</table>`;
  const text = `"${opts.requestTitle}" has shipped.

Carrier: ${opts.carrier}
Tracking: ${opts.trackingNumber}

Your escrow has released since the item is in transit.

View request: ${opts.requestUrl}`;
  return { subject, html: layout({ heading: "Your item has shipped", bodyHtml, ctaUrl: opts.requestUrl }), text };
}

export function refundIssuedEmail(opts: {
  requestTitle: string;
  refundedJpy: number;
  requestUrl: string;
}): RenderedEmail {
  const subject = `Refund issued — ${opts.requestTitle}`;
  const bodyHtml =
    p(
      `We've refunded the escrow held for <strong>${opts.requestTitle}</strong>. It typically takes a few business days to appear, depending on your bank.`,
    ) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-top:1px solid ${BORDER};">${amountRow(
      "Refunded",
      formatJpy(opts.refundedJpy),
    )}</table>`;
  const text = `Refund issued for "${opts.requestTitle}".

Refunded: ${formatJpy(opts.refundedJpy)}. It typically takes a few business days to appear, depending on your bank.

View request: ${opts.requestUrl}`;
  return { subject, html: layout({ heading: "Refund issued", bodyHtml, ctaUrl: opts.requestUrl }), text };
}
