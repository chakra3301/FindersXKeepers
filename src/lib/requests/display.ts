import type { MinCondition, RequestStatus } from "@/lib/db/types";
import { LIFECYCLE_RAIL, STATUS_META } from "@/lib/requests/status";

export interface RailProgress {
  total: number;
  filled: number;
  tone: "primary" | "success" | "muted";
}

/** Segmented progress for a request, matching the dashboard card bar. */
export function railProgress(status: RequestStatus): RailProgress {
  const total = LIFECYCLE_RAIL.length;
  const rail = STATUS_META[status].rail;
  if (rail === null) return { total, filled: 0, tone: "muted" };
  return {
    total,
    filled: rail + 1,
    tone: status === "released" ? "success" : "primary",
  };
}

export function escrowCaption(status: RequestStatus): string {
  switch (status) {
    case "released":
      return "Released";
    case "shipped":
      return "Held · releasing";
    case "refunded":
      return "Refunding to you";
    case "cancelled":
      return "Closed";
    default:
      return "Held in escrow";
  }
}

export interface DeadlineChip {
  label: string;
  tone: "warning" | "neutral";
}

export function deadlineChip(
  deadlineAt: string | null,
  status: RequestStatus,
  now: Date = new Date(),
): DeadlineChip | null {
  if (!deadlineAt) return null;
  if (STATUS_META[status].rail === null) return null;
  if (status === "shipped" || status === "released") return null;
  const ms = new Date(deadlineAt).getTime() - now.getTime();
  const days = Math.ceil(ms / 86_400_000);
  if (days <= 0) return { label: "Deadline passed", tone: "warning" };
  return {
    label: `${days} ${days === 1 ? "day" : "days"} left`,
    tone: days <= 4 ? "warning" : "neutral",
  };
}

const CONDITION_LABELS: Record<MinCondition, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  acceptable: "Acceptable",
  any: "Any condition",
};

export function conditionLabel(c: MinCondition): string {
  return CONDITION_LABELS[c];
}
