/**
 * Seed script — creates a demo user and requests in every lifecycle state so
 * the dashboard shows real variety. Run with: `npm run seed`.
 *
 * It deliberately drives the "shipped", "released" and "refunded" cases through
 * the real operations layer (escrow + state machine) rather than fabricating
 * the end state, so the escrow-release-on-tracking rule is actually exercised.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createEscrowHold,
  recordShipment,
  refundEscrow,
  setRequestStatus,
} from "@/lib/requests/operations";
import { computeQuote } from "@/lib/pricing";
import type {
  CandidateStatus,
  MinCondition,
  RequestStatus,
  RushTier,
} from "@/lib/db/types";

const DEMO_EMAIL = "demo@finderskeepers.test";
const DEMO_PASSWORD = "concierge123";

const admin = createAdminClient();

function img(seed: string) {
  return `https://picsum.photos/seed/${seed}/600/600`;
}

async function resetDemoUser(): Promise<string> {
  // Remove any existing demo user (cascades to their requests) for a clean run.
  const { data: list } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existing = list?.users.find((u) => u.email === DEMO_EMAIL);
  if (existing) {
    await admin.auth.admin.deleteUser(existing.id);
    console.info(`Removed existing demo user ${existing.id}`);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("Failed to create user");

  // Flesh out the auto-created profile; mark staff so one login demos both sides.
  await admin
    .from("profiles")
    .update({ shipping_country: "US", currency_pref: "USD", is_staff: true })
    .eq("id", data.user.id);

  return data.user.id;
}

interface NewRequest {
  title: string;
  description?: string;
  status?: RequestStatus;
  min_condition?: MinCondition;
  rush_tier?: RushTier;
  budget_cap_jpy?: number;
  must_haves?: string[];
  nice_to_haves?: string[];
  reference_url?: string;
  reference_image_url?: string;
  deadline_at?: string;
}

async function insertRequest(userId: string, r: NewRequest): Promise<string> {
  const { data, error } = await admin
    .from("requests")
    .insert({
      user_id: userId,
      title: r.title,
      description: r.description ?? null,
      status: r.status ?? "open",
      min_condition: r.min_condition ?? "any",
      rush_tier: r.rush_tier ?? "standard",
      budget_cap_jpy: r.budget_cap_jpy ?? null,
      must_haves: r.must_haves ?? [],
      nice_to_haves: r.nice_to_haves ?? [],
      reference_url: r.reference_url ?? null,
      reference_image_url: r.reference_image_url ?? null,
      deadline_at: r.deadline_at ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("insert request failed");
  return data.id;
}

async function addCandidate(
  requestId: string,
  c: {
    price_jpy: number;
    notes: string;
    images: string[];
    listing_url?: string;
    status?: CandidateStatus;
  },
): Promise<string> {
  const { data, error } = await admin
    .from("candidates")
    .insert({
      request_id: requestId,
      price_jpy: c.price_jpy,
      notes: c.notes,
      listing_images: c.images,
      listing_url: c.listing_url ?? null,
      status: c.status ?? "proposed",
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("insert candidate failed");
  return data.id;
}

async function addOrder(
  requestId: string,
  candidateId: string,
  opts: {
    itemCostJpy: number;
    shippingJpy: number;
    rushTier?: RushTier;
    receiptStatus?: "pending" | "accepted" | "rejected";
    receivedImages?: string[];
  },
): Promise<string> {
  const lines = computeQuote({
    itemCostJpy: opts.itemCostJpy,
    shippingJpy: opts.shippingJpy,
    rushTier: opts.rushTier,
  });
  const { data, error } = await admin
    .from("orders")
    .insert({
      request_id: requestId,
      candidate_id: candidateId,
      item_cost_jpy: lines.itemCostJpy,
      finder_fee_jpy: lines.finderFeeJpy,
      shipping_jpy: lines.shippingJpy,
      tax_jpy: lines.taxJpy,
      receipt_status: opts.receiptStatus ?? "pending",
      received_image_urls: opts.receivedImages ?? [],
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("insert order failed");

  // Record the escrow hold through the real operations layer.
  await createEscrowHold(requestId, lines, admin);
  return data.id;
}

async function addMessage(
  requestId: string,
  sender: "customer" | "team",
  body: string,
) {
  await admin.from("messages").insert({ request_id: requestId, sender, body });
}

async function seed() {
  console.info("Seeding Finders × Keepers demo data…");
  const userId = await resetDemoUser();

  // 1. open — freshly posted
  await insertRequest(userId, {
    title: "Sealed Famicom — Mother 2 (EarthBound) cartridge",
    description:
      "Looking for a complete-in-box copy, ideally Japanese region. Boxed with manual.",
    status: "open",
    min_condition: "good",
    rush_tier: "standard",
    budget_cap_jpy: 28000,
    must_haves: ["Authentic", "Manual included"],
    nice_to_haves: ["Original receipt"],
  });

  // 2. sourcing — we're searching
  const sourcing = await insertRequest(userId, {
    title: "Vintage Comme des Garçons wool tailoring, size M",
    description:
      "AW '90s era, charcoal or black. Happy to wait for the right piece.",
    status: "sourcing",
    min_condition: "good",
    rush_tier: "priority",
    budget_cap_jpy: 65000,
    must_haves: ["No moth holes"],
    nice_to_haves: ["AD logo intact"],
  });
  await addMessage(sourcing, "team", "On it — scanning the usual archives in Tokyo. Will share matches soon.");

  // 3. candidate_sent — needs the customer's approval
  const candidateSent = await insertRequest(userId, {
    title: "Seiko 'Pepsi' SKX009K diver, boxed",
    description: "Original bracelet preferred. Servicing not required.",
    status: "candidate_sent",
    min_condition: "like_new",
    rush_tier: "standard",
    budget_cap_jpy: 42000,
    must_haves: ["Running well", "Original bezel"],
  });
  await addCandidate(candidateSent, {
    price_jpy: 33500,
    notes: "Boxed with bracelet, ~2019, light wear. Seller rated 4.9★ in Osaka.",
    images: [img("seiko1"), img("seiko2")],
    listing_url: "https://example.com/listing/seiko-skx009",
    status: "proposed",
  });
  await addMessage(candidateSent, "team", "Found a clean boxed example — details attached for your approval.");

  // 4. approved — you approved, purchasing next
  const approved = await insertRequest(userId, {
    title: "Nikon FM2 film body, black",
    status: "approved",
    min_condition: "good",
    rush_tier: "standard",
    budget_cap_jpy: 38000,
  });
  const approvedCand = await addCandidate(approved, {
    price_jpy: 26000,
    notes: "Black FM2n, accurate meter, glass clean.",
    images: [img("nikon1")],
    status: "approved",
  });
  await addOrder(approved, approvedCand, { itemCostJpy: 26000, shippingJpy: 3200 });

  // 5. purchased — bought, en route to our hub
  const purchased = await insertRequest(userId, {
    title: "Studio Ghibli 'My Neighbor Totoro' cel, framed",
    status: "purchased",
    min_condition: "like_new",
    rush_tier: "priority",
    budget_cap_jpy: 120000,
  });
  const purchasedCand = await addCandidate(purchased, {
    price_jpy: 88000,
    notes: "Authenticated reproduction cel, framed, mint.",
    images: [img("totoro1")],
    status: "approved",
  });
  await addOrder(purchased, purchasedCand, {
    itemCostJpy: 88000,
    shippingJpy: 5400,
    rushTier: "priority",
  });

  // 6. received — in hand at our hub
  const received = await insertRequest(userId, {
    title: "Onitsuka Tiger Mexico 66, deadstock, US9",
    status: "received",
    min_condition: "new",
    rush_tier: "standard",
    budget_cap_jpy: 22000,
  });
  const receivedCand = await addCandidate(received, {
    price_jpy: 14500,
    notes: "Deadstock, original box.",
    images: [img("tiger1")],
    status: "approved",
  });
  await addOrder(received, receivedCand, {
    itemCostJpy: 14500,
    shippingJpy: 2800,
    receiptStatus: "accepted",
    receivedImages: [img("tigerrcv1"), img("tigerrcv2")],
  });

  // 7. shipped — DRIVEN through recordShipment (escrow releases on tracking)
  const shipping = await insertRequest(userId, {
    title: "Hario V60 ceramic dripper set + Buono kettle",
    status: "received",
    min_condition: "new",
    rush_tier: "standard",
    budget_cap_jpy: 16000,
  });
  const shippingCand = await addCandidate(shipping, {
    price_jpy: 9800,
    notes: "Brand new set, sealed.",
    images: [img("hario1")],
    status: "approved",
  });
  const shippingOrder = await addOrder(shipping, shippingCand, {
    itemCostJpy: 9800,
    shippingJpy: 2400,
    receiptStatus: "accepted",
  });
  await recordShipment(
    { orderId: shippingOrder, carrier: "Japan Post EMS", trackingNumber: "EE123456789JP" },
    admin,
  );
  await addMessage(shipping, "team", "Shipped via EMS — escrow released. Tracking attached.");

  // 8. released — driven to shipped, then settled on delivery
  const released = await insertRequest(userId, {
    title: "Porter Tanker shoulder bag, iron blue",
    status: "received",
    min_condition: "like_new",
    rush_tier: "standard",
    budget_cap_jpy: 30000,
  });
  const releasedCand = await addCandidate(released, {
    price_jpy: 19800,
    notes: "Excellent condition, barely used.",
    images: [img("porter1")],
    status: "approved",
  });
  const releasedOrder = await addOrder(released, releasedCand, {
    itemCostJpy: 19800,
    shippingJpy: 3000,
    receiptStatus: "accepted",
  });
  await recordShipment(
    { orderId: releasedOrder, carrier: "DHL Express", trackingNumber: "DHL8842019JP" },
    admin,
  );
  await setRequestStatus(released, "released", admin); // delivered + settled

  // 9. cancelled — closed before purchase
  await insertRequest(userId, {
    title: "Limited Bandai Chogokin (sold out everywhere)",
    description: "Couldn't locate one within budget — closed.",
    status: "cancelled",
    min_condition: "new",
    rush_tier: "express",
    budget_cap_jpy: 45000,
  });

  // 10. refunded — purchased, then refunded through the escrow seam
  const refunded = await insertRequest(userId, {
    title: "Vintage Riri zipper jacket (condition dispute)",
    status: "purchased",
    min_condition: "good",
    rush_tier: "standard",
    budget_cap_jpy: 52000,
  });
  const refundedCand = await addCandidate(refunded, {
    price_jpy: 41000,
    notes: "Did not match the disclosed condition on receipt.",
    images: [img("jacket1")],
    status: "approved",
  });
  await addOrder(refunded, refundedCand, {
    itemCostJpy: 41000,
    shippingJpy: 4200,
    receiptStatus: "rejected",
  });
  await refundEscrow(refunded, admin);
  await setRequestStatus(refunded, "refunded", admin);
  await addMessage(refunded, "team", "The item didn't match the disclosed condition — we've refunded your escrow in full.");

  console.info("\n✓ Seed complete.");
  console.info("  Sign in with:");
  console.info(`    email:    ${DEMO_EMAIL}`);
  console.info(`    password: ${DEMO_PASSWORD}\n`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
