import { createClient } from "@/lib/supabase/server";
import { escrowStateFromPayments, type EscrowState } from "@/lib/escrow/display";
import type {
  Candidate,
  Message,
  Order,
  Payment,
  Request,
  Shipment,
} from "@/lib/db/types";

export interface DashboardRequest extends Request {
  escrowState: EscrowState;
  /** Headline figure to show on the card, with its meaning. */
  headline: { amountJpy: number | null; kind: "order" | "candidate" | "budget" };
}

/**
 * Everything the dashboard needs. RLS scopes each table to the signed-in user,
 * so we can fetch each table wholesale and stitch them together in memory.
 */
export async function getDashboardRequests(): Promise<DashboardRequest[]> {
  const supabase = await createClient();

  const [requestsRes, paymentsRes, ordersRes, candidatesRes] =
    await Promise.all([
      supabase.from("requests").select("*").order("updated_at", { ascending: false }),
      supabase
        .from("payments")
        .select("id, request_id, status, amount_jpy, created_at"),
      supabase.from("orders").select("id, request_id, total_jpy, created_at"),
      supabase
        .from("candidates")
        .select("id, request_id, price_jpy, status, created_at"),
    ]);

  if (requestsRes.error) throw requestsRes.error;
  const requests = requestsRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const candidates = candidatesRes.data ?? [];

  return requests.map((req) => {
    const reqPayments = payments.filter((p) => p.request_id === req.id);
    const reqOrders = orders
      .filter((o) => o.request_id === req.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const reqCandidates = candidates
      .filter((c) => c.request_id === req.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    let headline: DashboardRequest["headline"];
    if (reqOrders.length > 0) {
      headline = { amountJpy: reqOrders[0].total_jpy, kind: "order" };
    } else if (reqCandidates.length > 0) {
      headline = { amountJpy: reqCandidates[0].price_jpy, kind: "candidate" };
    } else {
      headline = { amountJpy: req.budget_cap_jpy, kind: "budget" };
    }

    return {
      ...req,
      escrowState: escrowStateFromPayments(reqPayments),
      headline,
    };
  });
}

export interface RequestDetail {
  request: Request;
  candidates: Candidate[];
  orders: Order[];
  shipments: Shipment[];
  payments: Payment[];
  messages: Message[];
}

/** Full detail for one request, or null if not found / not owned. */
export async function getRequestDetail(
  id: string,
): Promise<RequestDetail | null> {
  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!request) return null;

  const [candidatesRes, ordersRes, paymentsRes, messagesRes] =
    await Promise.all([
      supabase
        .from("candidates")
        .select("*")
        .eq("request_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("*")
        .eq("request_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("*")
        .eq("request_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("messages")
        .select("*")
        .eq("request_id", id)
        .order("created_at", { ascending: true }),
    ]);

  const orders = ordersRes.data ?? [];

  // Shipments hang off orders.
  let shipments: Shipment[] = [];
  if (orders.length > 0) {
    const { data } = await supabase
      .from("shipments")
      .select("*")
      .in(
        "order_id",
        orders.map((o) => o.id),
      )
      .order("created_at", { ascending: false });
    shipments = data ?? [];
  }

  return {
    request,
    candidates: candidatesRes.data ?? [],
    orders,
    shipments,
    payments: paymentsRes.data ?? [],
    messages: messagesRes.data ?? [],
  };
}
