import { createAdminClient } from "@/lib/supabase/admin";
import { conditionLabel } from "@/lib/requests/display";
import type { RequestStatus } from "@/lib/db/types";

/**
 * Public, anonymised view of a fulfilled request — the data behind a shareable
 * "completed find" card. No buyer identity is exposed. Fetched with the
 * service-role client so it works for anyone with the link (the find is only
 * resolvable once it has actually shipped/released).
 */
export type CompletedFind = {
  id: string;
  title: string;
  condition: string;
  imageUrl: string | null;
  itemCostJpy: number;
  finderFeeJpy: number;
  shippingJpy: number;
  taxJpy: number;
  totalJpy: number;
  postedAt: string;
  fulfilledAt: string;
  /** Wall-clock time from request posted → shipped, in milliseconds. */
  fulfillMs: number;
  carrier: string | null;
  status: Extract<RequestStatus, "shipped" | "released">;
};

export async function getCompletedFind(
  id: string,
): Promise<CompletedFind | null> {
  // UUID guard — avoids a DB round-trip on garbage paths.
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return null;

  const admin = createAdminClient();

  const { data: request } = await admin
    .from("requests")
    .select("id, title, min_condition, status, reference_image_url, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!request) return null;
  if (request.status !== "shipped" && request.status !== "released") return null;

  const { data: orders } = await admin
    .from("orders")
    .select("*")
    .eq("request_id", id)
    .order("created_at", { ascending: false });
  const order = orders?.[0];
  if (!order) return null;

  const { data: candidate } = order.candidate_id
    ? await admin
        .from("candidates")
        .select("listing_images")
        .eq("id", order.candidate_id)
        .maybeSingle()
    : { data: null };

  const { data: shipments } = await admin
    .from("shipments")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false });
  const shipment = shipments?.[0];
  const fulfilledAt = shipment?.shipped_at ?? order.created_at;

  const imageUrl =
    order.received_image_urls?.[0] ??
    candidate?.listing_images?.[0] ??
    request.reference_image_url ??
    null;

  return {
    id: request.id,
    title: request.title,
    condition: conditionLabel(request.min_condition),
    imageUrl,
    itemCostJpy: order.item_cost_jpy,
    finderFeeJpy: order.finder_fee_jpy,
    shippingJpy: order.shipping_jpy,
    taxJpy: order.tax_jpy,
    totalJpy: order.total_jpy,
    postedAt: request.created_at,
    fulfilledAt,
    fulfillMs: Math.max(
      0,
      new Date(fulfilledAt).getTime() - new Date(request.created_at).getTime(),
    ),
    carrier: shipment?.carrier ?? null,
    status: request.status,
  };
}

/** Human label for a fulfilment duration, e.g. "9 days", "1 day", "< 1 day". */
export function fulfillLabel(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return "< 1 day";
}

/** Compact form for tight spaces, e.g. "9D", "6H". */
export function fulfillShort(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days}D`;
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return `${hours}H`;
}
