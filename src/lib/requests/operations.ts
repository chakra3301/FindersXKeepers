import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { escrow, type EscrowIntent } from "@/lib/escrow";
import { estimator } from "@/lib/estimator";
import { assertTransition, IllegalTransitionError } from "./state-machine";
import type { PriceLines } from "@/lib/pricing";
import { computeQuote, totalJpy } from "@/lib/pricing";
import type { RequestStatus, RushTier, AddressSnapshot } from "@/lib/db/types";
import {
  notifyPaymentConfirmed,
  notifyItemShipped,
  notifyRefundIssued,
} from "@/lib/email/notify";

/**
 * Team/system operations on a request. These run with the service-role client
 * and are the ONLY place request status changes — always through the state
 * machine (`assertTransition`). Customer-facing server actions delegate here.
 */

/**
 * The single money-moment. Sizes an escrow hold to the budget cap (a four-line
 * ESTIMATE), then moves the request open → sourcing. If the checkout rush
 * selector changed the tier, persist it first so the stored request and the
 * estimate agree. Guards status === "open" explicitly: `sourcing` is reachable
 * from several states, so a bare assertTransition would let candidate_sent →
 * sourcing through and double-charge.
 */
export async function depositForRequest(
  requestId: string,
  rushTier: RushTier,
  shippingAddress: AddressSnapshot | null = null,
  admin: AdminClient = createAdminClient(),
): Promise<{ checkoutUrl?: string }> {
  const { data: req, error } = await admin
    .from("requests")
    .select(
      "status, budget_cap_jpy, rush_tier, title, description, min_condition, must_haves, nice_to_haves, shipping_address",
    )
    .eq("id", requestId)
    .single();
  if (error || !req) throw new Error(`Request ${requestId} not found.`);
  if (req.status !== "open") {
    throw new IllegalTransitionError(req.status, "sourcing");
  }

  if (rushTier !== req.rush_tier) {
    const { error: rushErr } = await admin
      .from("requests")
      .update({ rush_tier: rushTier })
      .eq("id", requestId);
    if (rushErr) throw rushErr;
  }

  if (shippingAddress) {
    const { error: addrErr } = await admin
      .from("requests")
      .update({ shipping_address: shippingAddress })
      .eq("id", requestId);
    if (addrErr) throw addrErr;
  }

  // Hosted checkout (Stripe): if the customer backed out mid-flow, resume the
  // open session instead of creating duplicate pending payment rows.
  const { data: pendingPayment } = await admin
    .from("payments")
    .select("id, stripe_payment_intent_id")
    .eq("request_id", requestId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingPayment?.stripe_payment_intent_id) {
    const checkoutUrl = await escrow.resumeCheckout(
      pendingPayment.stripe_payment_intent_id,
    );
    if (checkoutUrl) return { checkoutUrl };

    // Expired / abandoned session — mark stale so a fresh hold can be created.
    await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("id", pendingPayment.id);
  }

  // Estimate shipping AND item value in parallel (so the deposit waits on the
  // slower of the two, not the sum). Shipping feeds the hold + the checkout
  // display (one input); the item-value estimate is advisory — persisted for the
  // operator console, never changing what the customer is charged.
  const [shippingEst, itemEst] = await Promise.all([
    estimator.estimateShipping({
      title: req.title,
      description: req.description,
      minCondition: req.min_condition,
      destinationCountry:
        req.shipping_address?.country ?? shippingAddress?.country,
    }),
    estimator
      .estimateItemValue({
        title: req.title,
        description: req.description,
        minCondition: req.min_condition,
        mustHaves: req.must_haves,
        niceToHaves: req.nice_to_haves,
        budgetCapJpy: req.budget_cap_jpy,
      })
      .catch(() => null),
  ]);
  const shippingJpy = shippingEst.shippingJpy;

  if (itemEst) {
    const { error: estErr } = await admin
      .from("requests")
      .update({
        est_value_jpy: itemEst.itemValueJpy,
        est_value_low_jpy: itemEst.lowJpy,
        est_value_high_jpy: itemEst.highJpy,
        est_confidence: itemEst.confidence,
        est_needs_review: itemEst.needsReview ?? false,
        est_category: itemEst.category ?? null,
        est_sources: itemEst.sources ?? [],
        est_updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    if (estErr) console.warn(`[deposit] estimate persist failed: ${estErr.message}`);
  }

  const lines = computeQuote({
    itemCostJpy: req.budget_cap_jpy ?? 0,
    shippingJpy,
    rushTier,
  });

  const intent = await createEscrowHold(requestId, lines, admin);

  // Hosted-payment providers (Stripe) confirm the hold asynchronously via the
  // webhook, which is what advances open → sourcing. Don't transition here —
  // just hand back the redirect URL. The synchronous stub has no checkoutUrl,
  // so it moves to sourcing immediately, exactly as before.
  if (intent.checkoutUrl) {
    return { checkoutUrl: intent.checkoutUrl };
  }

  await setRequestStatus(requestId, "sourcing", admin);
  return {};
}

/**
 * Confirm-only: lock the REAL four-line order from the candidate's price (no new
 * money moves — the hold from checkout already covers it whenever price ≤ cap),
 * mark the candidate approved, advance candidate_sent → approved. Asserts
 * legality BEFORE any write so an illegal state leaves no orphan order.
 */
export async function approveCandidate(
  requestId: string,
  candidateId: string,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: req, error: reqErr } = await admin
    .from("requests")
    .select(
      "status, rush_tier, budget_cap_jpy, title, description, min_condition, shipping_address",
    )
    .eq("id", requestId)
    .single();
  if (reqErr || !req) throw new Error(`Request ${requestId} not found.`);
  assertTransition(req.status, "approved");

  const { data: cand, error: candErr } = await admin
    .from("candidates")
    .select("id, price_jpy")
    .eq("id", candidateId)
    .single();
  if (candErr || !cand) throw new Error(`Candidate ${candidateId} not found.`);

  // Server-side over-cap guard (mirrors the UI gate): the approved price must
  // fit the hold sized to the cap. A null/zero cap means no cap.
  const cap = req.budget_cap_jpy ?? 0;
  const price = cand.price_jpy ?? 0;
  if (cap > 0 && price > cap) {
    throw new Error(
      `Candidate price ¥${price} exceeds the budget cap ¥${cap}; re-authorisation is required.`,
    );
  }

  // Re-use the same estimator (memoized for the model provider) so the locked
  // order's shipping line agrees with the estimate the hold was sized to.
  const { shippingJpy } = await estimator.estimateShipping({
    title: req.title,
    description: req.description,
    minCondition: req.min_condition,
    destinationCountry: req.shipping_address?.country,
  });

  const lines = computeQuote({
    itemCostJpy: cand.price_jpy ?? 0,
    shippingJpy,
    rushTier: req.rush_tier,
  });

  const { error: orderErr } = await admin.from("orders").insert({
    request_id: requestId,
    candidate_id: candidateId,
    item_cost_jpy: lines.itemCostJpy,
    finder_fee_jpy: lines.finderFeeJpy,
    shipping_jpy: lines.shippingJpy,
    tax_jpy: lines.taxJpy,
    received_image_urls: [],
    receipt_status: "pending",
  });
  if (orderErr) throw orderErr;

  const { error: markErr } = await admin
    .from("candidates")
    .update({ status: "approved" })
    .eq("id", candidateId);
  if (markErr) throw markErr;

  await setRequestStatus(requestId, "approved", admin);
}

export interface PostCandidateInput {
  priceJpy: number;
  listingUrl?: string | null;
  notes?: string | null;
  listingImages?: string[];
}

/**
 * Operator posts a candidate match. Asserts sourcing → candidate_sent BEFORE
 * inserting so an illegal state never leaves an orphan candidate row.
 */
export async function postCandidate(
  requestId: string,
  input: PostCandidateInput,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: req, error } = await admin
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .single();
  if (error || !req) throw new Error(`Request ${requestId} not found.`);
  assertTransition(req.status, "candidate_sent");

  const { error: insertErr } = await admin.from("candidates").insert({
    request_id: requestId,
    price_jpy: input.priceJpy,
    listing_url: input.listingUrl ?? null,
    notes: input.notes ?? null,
    listing_images: input.listingImages ?? [],
    status: "proposed",
  });
  if (insertErr) throw insertErr;

  await setRequestStatus(requestId, "candidate_sent", admin);
}

/** Operator marks an approved request as purchased. Status-only — no money moves. */
export async function markPurchased(
  requestId: string,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: req, error } = await admin
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .single();
  if (error || !req) throw new Error(`Request ${requestId} not found.`);
  assertTransition(req.status, "purchased");
  await setRequestStatus(requestId, "purchased", admin);
}

export interface MarkReceivedInput {
  receivedImageUrls?: string[];
}

/**
 * Operator confirms the item is in hand at our hub. Optionally attaches proof
 * image URLs to the latest order, then advances purchased → received.
 */
export async function markReceived(
  requestId: string,
  input: MarkReceivedInput,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: req, error: reqErr } = await admin
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .single();
  if (reqErr || !req) throw new Error(`Request ${requestId} not found.`);
  assertTransition(req.status, "received");

  const urls = input.receivedImageUrls ?? [];
  if (urls.length > 0) {
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (orderErr || !order) {
      throw new Error(`No order for request ${requestId}.`);
    }
    const { error: updateErr } = await admin
      .from("orders")
      .update({ received_image_urls: urls })
      .eq("id", order.id);
    if (updateErr) throw updateErr;
  }

  await setRequestStatus(requestId, "received", admin);
}

/**
 * Reject this candidate and go back to sourcing. No money moves — the hold
 * stays put while we keep looking.
 */
export async function keepHunting(
  requestId: string,
  candidateId: string,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: req, error } = await admin
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .single();
  if (error || !req) throw new Error(`Request ${requestId} not found.`);
  assertTransition(req.status, "sourcing");

  const { error: markErr } = await admin
    .from("candidates")
    .update({ status: "rejected" })
    .eq("id", candidateId);
  if (markErr) throw markErr;

  await setRequestStatus(requestId, "sourcing", admin);
}

/**
 * Customer confirms the in-hand item. Loads the request's order and records a
 * shipment with a CLEARLY-SIMULATED demo tracking number — which is what fires
 * the real releaseEscrow + received → shipped inside recordShipment(). Real
 * carrier handoff is a later phase; release still hangs off a tracking number,
 * never a manual flag. Asserts received → shipped legality BEFORE recording, so
 * an illegal state never releases escrow then throws.
 */
export async function shipApprovedOrder(
  requestId: string,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: req, error: reqErr } = await admin
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .single();
  if (reqErr || !req) throw new Error(`Request ${requestId} not found.`);
  assertTransition(req.status, "shipped");

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderErr || !order) throw new Error(`No order for request ${requestId}.`);

  await recordShipment(
    {
      orderId: order.id,
      carrier: "Simulated carrier (demo)",
      trackingNumber: `DEMO-${order.id.slice(0, 8)}`,
    },
    admin,
  );
}

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

/**
 * Create an escrow hold for a request and record the payment row with the
 * provider's returned status (`held` for the synchronous stub, `pending` for
 * Stripe until the webhook confirms). Returns the intent so the caller can read
 * an optional `checkoutUrl` (hosted payment redirect).
 */
export async function createEscrowHold(
  requestId: string,
  lines: PriceLines,
  admin: AdminClient = createAdminClient(),
): Promise<EscrowIntent> {
  const amountJpy = totalJpy(lines);
  const intent = await escrow.createHold({ requestId, amountJpy });
  const { error } = await admin.from("payments").insert({
    request_id: requestId,
    stripe_payment_intent_id: intent.paymentIntentId,
    amount_jpy: amountJpy,
    status: intent.status,
  });
  if (error) throw error;

  // Synchronous (stub) holds confirm here; async (Stripe Checkout) holds stay
  // `pending` until the webhook flips them to held, which sends the receipt
  // there instead. Gating on `held` keeps it exactly-once across both modes.
  if (intent.status === "held") {
    await notifyPaymentConfirmed(requestId, admin);
  }
  return intent;
}

/**
 * Settle the held escrow for a request (our trigger). Captures `captureJpy` to
 * us and returns the rest of the hold to the customer; the split is computed
 * from the authoritative held amount on the payment row. `captureJpy` omitted →
 * full release (captured = held, refunded = 0).
 */
export async function releaseEscrow(
  requestId: string,
  captureJpy?: number,
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

  const held = payment.amount_jpy;
  const capturedJpy = Math.max(0, Math.min(captureJpy ?? held, held));
  const refundedJpy = held - capturedJpy;

  const intent = await escrow.release(
    payment.stripe_payment_intent_id,
    capturedJpy,
  );
  await admin
    .from("payments")
    .update({
      status: intent.status,
      captured_jpy: capturedJpy,
      refunded_jpy: refundedJpy,
    })
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

  await notifyRefundIssued(requestId, admin);
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
    .select("id, request_id, total_jpy")
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

  // The trigger: only a real tracking number settles escrow + advances status.
  if (params.trackingNumber) {
    await releaseEscrow(order.request_id, order.total_jpy, admin);
    await setRequestStatus(order.request_id, "shipped", admin);
    await notifyItemShipped(order.request_id, admin);
  }

  return shipment;
}
