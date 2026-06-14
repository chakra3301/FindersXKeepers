import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Candidate,
  Order,
  Request,
  RequestStatus,
} from "@/lib/db/types";

/** Action bucket for the operator queue. */
export type OperatorBucket =
  | "needs_candidate"
  | "needs_purchase"
  | "needs_receive"
  | "in_progress";

const ACTIVE_STATUSES: RequestStatus[] = [
  "open",
  "sourcing",
  "candidate_sent",
  "approved",
  "purchased",
  "received",
  "shipped",
];

function bucketForStatus(status: RequestStatus): OperatorBucket {
  switch (status) {
    case "sourcing":
      return "needs_candidate";
    case "approved":
      return "needs_purchase";
    case "purchased":
      return "needs_receive";
    default:
      return "in_progress";
  }
}

export interface OperatorQueueItem {
  id: string;
  title: string;
  status: RequestStatus;
  budget_cap_jpy: number | null;
  user_id: string;
  updated_at: string;
  bucket: OperatorBucket;
  latestCandidate: Candidate | null;
  latestOrder: Order | null;
}

export type OperatorQueue = Record<OperatorBucket, OperatorQueueItem[]>;

/**
 * Cross-user read of all active requests for the operator console. Uses the
 * service-role admin client — only call from staff-gated pages.
 */
export async function getOperatorQueue(): Promise<OperatorQueue> {
  const admin = createAdminClient();

  const [requestsRes, candidatesRes, ordersRes] = await Promise.all([
    admin
      .from("requests")
      .select("id, title, status, budget_cap_jpy, user_id, updated_at")
      .in("status", ACTIVE_STATUSES)
      .order("updated_at", { ascending: false }),
    admin
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false }),
    admin.from("orders").select("*").order("created_at", { ascending: false }),
  ]);

  if (requestsRes.error) throw requestsRes.error;
  if (candidatesRes.error) throw candidatesRes.error;
  if (ordersRes.error) throw ordersRes.error;

  const candidates = candidatesRes.data ?? [];
  const orders = ordersRes.data ?? [];

  const queue: OperatorQueue = {
    needs_candidate: [],
    needs_purchase: [],
    needs_receive: [],
    in_progress: [],
  };

  for (const req of requestsRes.data ?? []) {
    const reqCandidates = candidates.filter((c) => c.request_id === req.id);
    const reqOrders = orders.filter((o) => o.request_id === req.id);
    const bucket = bucketForStatus(req.status);
    const item: OperatorQueueItem = {
      ...req,
      bucket,
      latestCandidate: reqCandidates[0] ?? null,
      latestOrder: reqOrders[0] ?? null,
    };
    queue[bucket].push(item);
  }

  return queue;
}

export interface OperatorRequestDetail {
  request: Request;
  candidates: Candidate[];
  orders: Order[];
}

/** Full cross-user detail for one request (operator console). */
export async function getOperatorRequestDetail(
  id: string,
): Promise<OperatorRequestDetail | null> {
  const admin = createAdminClient();

  const { data: request, error } = await admin
    .from("requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!request) return null;

  const [candidatesRes, ordersRes] = await Promise.all([
    admin
      .from("candidates")
      .select("*")
      .eq("request_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("orders")
      .select("*")
      .eq("request_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (candidatesRes.error) throw candidatesRes.error;
  if (ordersRes.error) throw ordersRes.error;

  return {
    request,
    candidates: candidatesRes.data ?? [],
    orders: ordersRes.data ?? [],
  };
}
