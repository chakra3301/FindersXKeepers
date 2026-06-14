import type { PaymentStatus } from "@/lib/db/types";
import type { Tone } from "@/lib/requests/status";

/** Escrow state for display, including the "no payment yet" case. */
export type EscrowState = PaymentStatus | "none";

export interface EscrowMeta {
  label: string;
  tone: Tone;
  /** lucide icon name resolved by the badge component */
  icon: "lock-open" | "shield-check" | "shield" | "check" | "rotate-ccw" | "x";
  blurb: string;
}

export const ESCROW_META: Record<EscrowState, EscrowMeta> = {
  none: {
    label: "Not funded",
    tone: "slate",
    icon: "lock-open",
    blurb: "No funds committed yet.",
  },
  pending: {
    label: "Authorising",
    tone: "amber",
    icon: "shield",
    blurb: "Payment is being authorised.",
  },
  held: {
    label: "In escrow",
    tone: "rose",
    icon: "shield-check",
    blurb: "Funds held by the processor, awaiting our release trigger.",
  },
  released: {
    label: "Released",
    tone: "emerald",
    icon: "check",
    blurb: "Released to us — your item is in transit.",
  },
  refunded: {
    label: "Refunded",
    tone: "rose",
    icon: "rotate-ccw",
    blurb: "Returned to you in full.",
  },
  failed: {
    label: "Payment failed",
    tone: "rose",
    icon: "x",
    blurb: "The processor declined the payment.",
  },
};

/** Pick the current escrow state from a request's payment rows. */
export function escrowStateFromPayments(
  payments: { status: PaymentStatus; created_at: string }[] | null | undefined,
): EscrowState {
  if (!payments || payments.length === 0) return "none";
  const latest = [...payments].sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  )[0];
  return latest.status;
}
