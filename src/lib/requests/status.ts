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
    tone: "rose",
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
    tone: "rose",
    bucket: "in_progress",
    rail: 3,
  },
  purchased: {
    label: "Purchased",
    blurb: "Bought and en route to our hub.",
    tone: "rose",
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
    tone: "rose",
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

// Badge tints — dark-first, crimson for in-progress states.
export const TONE_BADGE: Record<Tone, string> = {
  slate:   "bg-secondary text-muted-foreground ring-1 ring-border",
  zinc:    "bg-secondary text-muted-foreground ring-1 ring-border",
  blue:    "bg-accent text-accent-foreground ring-1 ring-primary/20",
  indigo:  "bg-accent text-accent-foreground ring-1 ring-primary/20",
  cyan:    "bg-accent text-accent-foreground ring-1 ring-primary/20",
  amber:   "bg-warning-muted text-warning ring-1 ring-warning-border",
  emerald: "bg-success-muted text-success ring-1 ring-success-border",
  teal:    "bg-success-muted text-success ring-1 ring-success-border",
  rose:    "bg-accent text-accent-foreground ring-1 ring-primary/25",
};

export const TONE_DOT: Record<Tone, string> = {
  slate: "bg-muted-foreground",
  zinc: "bg-muted-foreground",
  blue: "bg-primary",
  indigo: "bg-primary",
  cyan: "bg-primary",
  amber: "bg-warning",
  emerald: "bg-success",
  teal: "bg-success",
  rose: "bg-primary",
};
