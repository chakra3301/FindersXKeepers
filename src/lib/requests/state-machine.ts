import type { RequestStatus } from "@/lib/db/types";

/**
 * The request lifecycle state machine — the single source of truth for which
 * status transitions are legal. Nothing else in the app may flip a request's
 * status without going through `assertTransition`. Keep all the rules here.
 *
 *   open → sourcing → candidate_sent → approved → purchased → received
 *        → shipped → released
 *
 * plus `cancelled` (before money is committed) and `refunded` (after).
 *
 * Note: the received → shipped edge is intentionally reachable *only* via the
 * shipment path (see operations.recordShipment) — escrow release hangs off a
 * tracking number, never a manual status flip.
 */
export const TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  // "purchased" is the in-stock store-purchase edge (item already in hand);
  // normal hunts go open → sourcing. Only operations.depositForRequest uses it,
  // and only when requests.in_stock is true.
  open: ["sourcing", "purchased", "cancelled"],
  sourcing: ["candidate_sent", "cancelled"],
  // candidate rejected → back to sourcing; approved → forward.
  candidate_sent: ["approved", "sourcing", "cancelled"],
  approved: ["purchased", "cancelled"],
  // once purchased, funds are committed → exit is refund, not cancel.
  purchased: ["received", "refunded"],
  received: ["shipped", "refunded"],
  shipped: ["released", "refunded"],
  released: [],
  refunded: [],
  cancelled: [],
} as const;

/** Statuses with no outgoing transitions. */
export const TERMINAL_STATUSES: readonly RequestStatus[] = (
  Object.keys(TRANSITIONS) as RequestStatus[]
).filter((s) => TRANSITIONS[s].length === 0);

export function canTransition(
  from: RequestStatus,
  to: RequestStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: RequestStatus): readonly RequestStatus[] {
  return TRANSITIONS[from];
}

export function isTerminal(status: RequestStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export class IllegalTransitionError extends Error {
  constructor(
    public readonly from: RequestStatus,
    public readonly to: RequestStatus,
  ) {
    super(
      `Illegal request transition: ${from} → ${to}. ` +
        `Allowed from ${from}: ${TRANSITIONS[from].join(", ") || "(terminal)"}.`,
    );
    this.name = "IllegalTransitionError";
  }
}

/** Throws IllegalTransitionError if the transition is not permitted. */
export function assertTransition(
  from: RequestStatus,
  to: RequestStatus,
): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
}
