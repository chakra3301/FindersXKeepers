import type Stripe from "stripe";
import type { AdminClient } from "@/lib/supabase/admin";
import { setRequestStatus } from "@/lib/requests/operations";

/**
 * Stripe webhook handling. The webhook is the money-confirmed moment for the
 * async hold: `checkout.session.completed` flips the pending payment to `held`
 * and moves the request open → sourcing. It is authenticated by signature (not
 * by a user session) and is idempotent by construction — re-delivery is a no-op
 * because every write is guarded on current state.
 */

function idOf(
  ref: string | { id: string } | null | undefined,
): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

/** Business logic for a verified Stripe event. Safe to call more than once. */
export async function processStripeEvent(
  event: Stripe.Event,
  admin: AdminClient,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const requestId = session.metadata?.requestId;
      const piId = idOf(session.payment_intent);
      if (!requestId || !piId) return;

      // Confirm the hold: pending → held (idempotent: only touches `pending`).
      // Match by request — the row may still carry the Checkout Session id until
      // the customer completes payment.
      const { data: payment } = await admin
        .from("payments")
        .select("id, status")
        .eq("request_id", requestId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (payment) {
        await admin
          .from("payments")
          .update({ status: "held", stripe_payment_intent_id: piId })
          .eq("id", payment.id);
      }

      // Advance open → sourcing, guarded so re-delivery (already sourcing+) no-ops.
      const { data: req } = await admin
        .from("requests")
        .select("status")
        .eq("id", requestId)
        .maybeSingle();
      if (req?.status === "open") {
        await setRequestStatus(requestId, "sourcing", admin);
      }
      return;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      // Only a still-pending hold can fail; leaves held/released/refunded alone.
      await admin
        .from("payments")
        .update({ status: "failed" })
        .eq("stripe_payment_intent_id", pi.id)
        .eq("status", "pending");
      return;
    }

    case "charge.refunded": {
      // Defensive reconciliation of what releaseEscrow/refundEscrow already wrote.
      const charge = event.data.object as Stripe.Charge;
      const piId = idOf(charge.payment_intent);
      if (!piId) return;
      const amount = charge.amount ?? 0;
      const refunded = charge.amount_refunded ?? 0;
      await admin
        .from("payments")
        .update({
          status: refunded >= amount ? "refunded" : "released",
          captured_jpy: amount - refunded,
          refunded_jpy: refunded,
        })
        .eq("stripe_payment_intent_id", piId);
      return;
    }

    default:
      // Other events are intentionally ignored.
      return;
  }
}

export interface WebhookResult {
  status: number;
  body: string;
}

/**
 * Verify a webhook request's signature and process it. Returns 400 on a bad
 * signature, 200 once handled. Kept transport-agnostic so it's unit-testable
 * without a running server.
 */
export async function handleWebhookRequest(opts: {
  rawBody: string;
  signature: string | null;
  stripe: Stripe;
  webhookSecret: string;
  admin: AdminClient;
}): Promise<WebhookResult> {
  let event: Stripe.Event;
  try {
    event = opts.stripe.webhooks.constructEvent(
      opts.rawBody,
      opts.signature ?? "",
      opts.webhookSecret,
    );
  } catch {
    return { status: 400, body: "Webhook signature verification failed." };
  }

  await processStripeEvent(event, opts.admin);
  return { status: 200, body: JSON.stringify({ received: true }) };
}
