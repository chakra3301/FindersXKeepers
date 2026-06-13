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
    tone: "amber",
    bucket: "in_progress",
    rail: 1,
  },
  candidate_sent: {
    label: "Candidate sent",
    blurb: "A match is waiting for your approval.",
    tone: "blue",
    bucket: "action_needed",
    rail: 2,
  },
  approved: {
    label: "Approved",
    blurb: "You approved it — purchasing next.",
    tone: "indigo",
    bucket: "in_progress",
    rail: 3,
  },
  purchased: {
    label: "Purchased",
    blurb: "Bought and en route to our hub.",
    tone: "indigo",
    bucket: "in_progress",
    rail: 4,
  },
  received: {
    label: "Received",
    blurb: "In hand at our hub, prepping to ship.",
    tone: "cyan",
    bucket: "in_progress",
    rail: 5,
  },
  shipped: {
    label: "Shipped",
    blurb: "In transit to you — escrow released.",
    tone: "teal",
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
    tone: "rose",
    bucket: "closed",
    rail: null,
  },
  cancelled: {
    label: "Cancelled",
    blurb: "Request closed.",
    tone: "zinc",
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
  slate:
    "bg-slate-50 text-slate-700 ring-slate-600/15 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
  amber:
    "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  blue:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25",
  indigo:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-300 dark:ring-indigo-400/25",
  cyan:
    "bg-cyan-50 text-cyan-800 ring-cyan-600/20 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/20",
  teal:
    "bg-teal-50 text-teal-800 ring-teal-600/20 dark:bg-teal-400/10 dark:text-teal-300 dark:ring-teal-400/20",
  emerald:
    "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  rose:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25",
  zinc:
    "bg-zinc-100 text-zinc-600 ring-zinc-500/15 dark:bg-zinc-400/10 dark:text-zinc-400 dark:ring-zinc-400/20",
};

// Solid dot colors for the lifecycle rail nodes.
export const TONE_DOT: Record<Tone, string> = {
  slate: "bg-slate-400",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  cyan: "bg-cyan-500",
  teal: "bg-teal-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  zinc: "bg-zinc-400",
};
