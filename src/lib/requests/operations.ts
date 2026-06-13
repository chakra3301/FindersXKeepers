import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { escrow } from "@/lib/escrow";
import { assertTransition } from "./state-machine";
import type { PriceLines } from "@/lib/pricing";
import { totalJpy } from "@/lib/pricing";
import type { RequestStatus } from "@/lib/db/types";

/**
 * Team/system operations on a request. These run with the service-role client
 * and are the ONLY place request status changes — always through the state
 * machine (`assertTransition`). Customer-facing server actions delegate here.
 */

/** Move a request to a new status, enforcing the legal transition. */
export async function setRequestStatus(
  requestId: string,
  to: RequestStatus,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: req, error } = await admin
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .single();
  if (error || !req) throw new Error(`Request ${requestId} not found.`);

  assertTransition(req.status, to);

  const { error: updateError } = await admin
    .from("requests")
    .update({ status: to })
    .eq("id", requestId);
  if (updateError) throw updateError;
}

/** Create an escrow hold for a request and record the payment row. */
export async function createEscrowHold(
  requestId: string,
  lines: PriceLines,
  admin: AdminClient = createAdminClient(),
) {
  const amountJpy = totalJpy(lines);
  const intent = await escrow.createHold({ requestId, amountJpy });
  const { data, error } = await admin
    .from("payments")
    .insert({
      request_id: requestId,
      stripe_payment_intent_id: intent.paymentIntentId,
      amount_jpy: amountJpy,
      status: intent.status,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Release the held escrow for a request (our trigger). */
export async function releaseEscrow(
  requestId: string,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("request_id", requestId)
    .eq("status", "held")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!payment?.stripe_payment_intent_id) return; // nothing held to release

  const intent = await escrow.release(payment.stripe_payment_intent_id);
  await admin
    .from("payments")
    .update({ status: intent.status })
    .eq("id", payment.id);
}

/** Refund the held escrow for a request back to the customer. */
export async function refundEscrow(
  requestId: string,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("request_id", requestId)
    .in("status", ["held", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!payment?.stripe_payment_intent_id) return;

  const intent = await escrow.refund(payment.stripe_payment_intent_id);
  await admin
    .from("payments")
    .update({ status: intent.status })
    .eq("id", payment.id);
}

/**
 * Record a shipment for an order. THIS is the escrow-release trigger: when a
 * tracking number is present, the funds are released and the request advances
 * received → shipped. Escrow release hangs off the tracking number — there is
 * deliberately no manual "release funds" path.
 */
export async function recordShipment(
  params: {
    orderId: string;
    carrier: string;
    trackingNumber: string | null;
    shippedAt?: string;
  },
  admin: AdminClient = createAdminClient(),
) {
  const { data: order, error } = await admin
    .from("orders")
    .select("id, request_id")
    .eq("id", params.orderId)
    .single();
  if (error || !order) throw new Error(`Order ${params.orderId} not found.`);

  const { data: shipment, error: insertError } = await admin
    .from("shipments")
    .insert({
      order_id: params.orderId,
      carrier: params.carrier,
      tracking_number: params.trackingNumber,
      shipped_at:
        params.trackingNumber != null
          ? (params.shippedAt ?? new Date().toISOString())
          : null,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  // The trigger: only a real tracking number releases escrow + advances status.
  if (params.trackingNumber) {
    await releaseEscrow(order.request_id, admin);
    await setRequestStatus(order.request_id, "shipped", admin);
  }

  return shipment;
}
