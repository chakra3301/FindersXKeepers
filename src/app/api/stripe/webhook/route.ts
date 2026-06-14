import { createAdminClient } from "@/lib/supabase/admin";
import { readStripeEnv } from "@/lib/escrow/stripe-env";
import { createStripeClient } from "@/lib/escrow/stripe-client";
import { handleWebhookRequest } from "@/lib/escrow/webhook";

// Webhooks carry no user session — authenticated by signature, handled with the
// service-role client. Must read the RAW body for signature verification.
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  const { secretKey, webhookSecret } = readStripeEnv();
  const stripe = createStripeClient(secretKey);
  const admin = createAdminClient();

  const { status, body } = await handleWebhookRequest({
    rawBody,
    signature,
    stripe,
    webhookSecret,
    admin,
  });

  return new Response(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}
