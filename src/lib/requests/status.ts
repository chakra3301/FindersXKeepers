import type { RequestStatus } from "@/lib/db/types";

/**
 * Presentational + grouping metadata for request lifecycle statuses.
 * The *legal transitions* live in ./state-machine.ts — this file is only
 * about how a status reads and where it sorts on the dashboard.
 */

export type Tone =
  | "slate"
  | "amber"
  | "blue"
  | "indigo"
  | "cyan"
  | "teal"
  | "emerald"
  | "rose"
  | "zinc";

// Dashboard columns/sections.
export type Bucket =
  | "action_needed"
  | "in_progress"
  | "in_transit"
  | "completed"
  | "closed";

export interface StatusMeta {
  label: string;
  /** Short, customer-facing one-liner: what's happening / what's next. */
  blurb: string;
  tone: Tone;
  bucket: Bucket;
  /** Position on the happy-path rail; null for off-rail states. */
  rail: number | null;
}

export const STATUS_META: Record<RequestStatus, StatusMeta> = {
  open: {
    label: "Open",
    blurb: "Posted — we're picking it up.",
    tone: "slate",
    bucket: "in_progress",
    rail: 0,
  },
  sourcing: {
    label: "Sourcing",
    blurb: "Our finders are searching Japan.",
    tone: "blue",
    bucket: "in_progress",
    rail: 1,
  },
  candidate_sent: {
    label: "Candidate sent",
    blurb: "A match is waiting for your approval.",
    tone: "amber",
    bucket: "action_needed",
    rail: 2,
  },
  approved: {
    label: "Approved",
    blurb: "You approved it — purchasing next.",
    tone: "blue",
    bucket: "in_progress",
    rail: 3,
  },
  purchased: {
    label: "Purchased",
    blurb: "Bought and en route to our hub.",
    tone: "blue",
    bucket: "in_progress",
    rail: 4,
  },
  received: {
    label: "Received",
    blurb: "In hand at our hub, prepping to ship.",
    tone: "amber",
    bucket: "in_progress",
    rail: 5,
  },
  shipped: {
    label: "Shipped",
    blurb: "In transit to you — escrow released.",
    tone: "blue",
    bucket: "in_transit",
    rail: 6,
  },
  released: {
    label: "Released",
    blurb: "Delivered and settled.",
    tone: "emerald",
    bucket: "completed",
    rail: 7,
  },
  refunded: {
    label: "Refunded",
    blurb: "Escrow returned to you.",
    tone: "slate",
    bucket: "closed",
    rail: null,
  },
  cancelled: {
    label: "Cancelled",
    blurb: "Request closed.",
    tone: "slate",
    bucket: "closed",
    rail: null,
  },
};

/** The happy-path rail, in order — used by the lifecycle timeline. */
export const LIFECYCLE_RAIL: RequestStatus[] = [
  "open",
  "sourcing",
  "candidate_sent",
  "approved",
  "purchased",
  "received",
  "shipped",
  "released",
];

export const BUCKET_META: Record<
  Bucket,
  { label: string; blurb: string; order: number }
> = {
  action_needed: {
    label: "Needs your attention",
    blurb: "Waiting on you to keep things moving.",
    order: 0,
  },
  in_progress: {
    label: "In progress",
    blurb: "We're on it.",
    order: 1,
  },
  in_transit: {
    label: "On its way",
    blurb: "Shipped and tracking.",
    order: 2,
  },
  completed: {
    label: "Completed",
    blurb: "Delivered and settled.",
    order: 3,
  },
  closed: {
    label: "Closed",
    blurb: "Cancelled or refunded.",
    order: 4,
  },
};

// Calm, low-saturation badge tints (Tailwind palette). Light theme first;
// dark variants keep contrast without shouting.
export const TONE_BADGE: Record<Tone, string> = {
  slate:   "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
  zinc:    "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
  blue:    "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25",
  indigo:  "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25",
  cyan:    "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25",
  amber:   "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  teal:    "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  rose:    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/25",
};

// Solid dot colors for the lifecycle rail nodes.
export const TONE_DOT: Record<Tone, string> = {
  slate: "bg-slate-400",
  zinc: "bg-slate-400",
  blue: "bg-blue-700",
  indigo: "bg-blue-700",
  cyan: "bg-blue-700",
  amber: "bg-amber-600",
  emerald: "bg-emerald-600",
  teal: "bg-emerald-600",
  rose: "bg-red-600",
};
