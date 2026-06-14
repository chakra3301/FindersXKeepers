import type Stripe from "stripe";
import type { AdminClient } from "@/lib/supabase/admin";
import { escrow } from "./index";
import { createStripeClient } from "./stripe-client";
import { readStripeEnv } from "./stripe-env";
import { processStripeEvent } from "./webhook";

/**
 * Dev / fallback confirmation when the customer lands on success_url but the
 * webhook was blocked (e.g. auth middleware redirected it). Idempotent — safe
 * to call on every `?checkout=complete` view.
 */
export async function syncStripeCheckoutReturn(
  requestId: string,
  admin: AdminClient,
): Promise<boolean> {
  if (escrow.name !== "stripe") return false;

  const { data: payment } = await admin
    .from("payments")
    .select("id, status, stripe_payment_intent_id")
    .eq("request_id", requestId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ref = payment?.stripe_payment_intent_id;
  if (!ref?.startsWith("cs_")) return false;

  const { secretKey } = readStripeEnv();
  const stripe = createStripeClient(secretKey);
  const session = await stripe.checkout.sessions.retrieve(ref);
  if (session.status !== "complete" || !session.payment_intent) return false;

  await processStripeEvent(
    {
      id: `sync_${session.id}`,
      type: "checkout.session.completed",
      data: { object: session },
    } as unknown as Stripe.Event,
    admin,
  );
  return true;
}
