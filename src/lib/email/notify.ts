import type { AdminClient } from "@/lib/supabase/admin";
import { email } from "./index";
import { siteUrl } from "./env";
import {
  paymentConfirmedEmail,
  itemShippedEmail,
  refundIssuedEmail,
} from "./templates";

/**
 * Notification layer: gather request + recipient + preferences, render a
 * template, and send. Called from lifecycle operations and the Stripe webhook.
 *
 * Every function is internally fail-safe — a missing recipient, an absent row,
 * or a thrown lookup is logged and swallowed so a notification can never roll
 * back the payment/shipment that triggered it.
 */

interface RequestRecipient {
  title: string;
  email: string;
  requestUrl: string;
}

async function loadRecipient(
  requestId: string,
  admin: AdminClient,
): Promise<{ recipient: RequestRecipient; userId: string } | null> {
  const { data: req } = await admin
    .from("requests")
    .select("title, user_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return null;

  const { data: userData } = await admin.auth.admin.getUserById(req.user_id);
  const to = userData.user?.email;
  if (!to) return null;

  return {
    userId: req.user_id,
    recipient: {
      title: req.title,
      email: to,
      requestUrl: `${siteUrl()}/requests/${requestId}`,
    },
  };
}

/** Escrow deposit confirmed (open → sourcing). Financial — always sent. */
export async function notifyPaymentConfirmed(
  requestId: string,
  admin: AdminClient,
): Promise<void> {
  try {
    const loaded = await loadRecipient(requestId, admin);
    if (!loaded) return;

    const { data: payment } = await admin
      .from("payments")
      .select("amount_jpy")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!payment) return;

    await email.send({
      to: loaded.recipient.email,
      ...paymentConfirmedEmail({
        requestTitle: loaded.recipient.title,
        amountJpy: payment.amount_jpy,
        requestUrl: loaded.recipient.requestUrl,
      }),
    });
  } catch (err) {
    console.error(`[notify] paymentConfirmed failed: ${errMsg(err)}`);
  }
}

/** Item shipped (received → shipped). Gated by the notify_shipped preference. */
export async function notifyItemShipped(
  requestId: string,
  admin: AdminClient,
): Promise<void> {
  try {
    const loaded = await loadRecipient(requestId, admin);
    if (!loaded) return;

    const { data: profile } = await admin
      .from("profiles")
      .select("notify_shipped")
      .eq("id", loaded.userId)
      .maybeSingle();
    if (profile && profile.notify_shipped === false) return;

    const { data: order } = await admin
      .from("orders")
      .select("id")
      .eq("request_id", requestId)
      .maybeSingle();
    if (!order) return;

    const { data: shipment } = await admin
      .from("shipments")
      .select("carrier, tracking_number")
      .eq("order_id", order.id)
      .not("tracking_number", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const trackingNumber = shipment?.tracking_number;
    if (!trackingNumber) return;

    await email.send({
      to: loaded.recipient.email,
      ...itemShippedEmail({
        requestTitle: loaded.recipient.title,
        carrier: shipment.carrier ?? "Your carrier",
        trackingNumber,
        requestUrl: loaded.recipient.requestUrl,
      }),
    });
  } catch (err) {
    console.error(`[notify] itemShipped failed: ${errMsg(err)}`);
  }
}

/** Refund issued. Financial — always sent. */
export async function notifyRefundIssued(
  requestId: string,
  admin: AdminClient,
): Promise<void> {
  try {
    const loaded = await loadRecipient(requestId, admin);
    if (!loaded) return;

    const { data: payment } = await admin
      .from("payments")
      .select("amount_jpy, refunded_jpy")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!payment) return;

    await email.send({
      to: loaded.recipient.email,
      ...refundIssuedEmail({
        requestTitle: loaded.recipient.title,
        refundedJpy: payment.refunded_jpy ?? payment.amount_jpy,
        requestUrl: loaded.recipient.requestUrl,
      }),
    });
  } catch (err) {
    console.error(`[notify] refundIssued failed: ${errMsg(err)}`);
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
