import Link from "next/link";
import { ArrowUpRight, Clock, Gauge } from "lucide-react";
import type { DashboardRequest } from "@/lib/requests/queries";
import { STATUS_META } from "@/lib/requests/status";
import { RUSH_LABEL, formatJpy } from "@/lib/pricing";
import { formatRelativeTime } from "@/lib/dates";
import { StatusBadge } from "@/components/requests/status-badge";
import { EscrowBadge } from "@/components/requests/escrow-badge";
import { cn } from "@/lib/utils";

const CONDITION_LABEL: Record<DashboardRequest["min_condition"], string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  acceptable: "Acceptable",
  any: "Any condition",
};

const HEADLINE_LABEL: Record<DashboardRequest["headline"]["kind"], string> = {
  order: "Order total",
  candidate: "Candidate price",
  budget: "Budget cap",
};

export function RequestCard({ request }: { request: DashboardRequest }) {
  const meta = STATUS_META[request.status];
  const needsAction = meta.bucket === "action_needed";

  return (
    <Link
      href={`/requests/${request.id}`}
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card p-5 lift lift-hover",
        needsAction
          ? "border-blue-300/70 ring-1 ring-blue-200/60 dark:border-blue-400/30 dark:ring-blue-400/15"
          : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={request.status} />
          <EscrowBadge state={request.escrowState} />
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
      </div>

      <h3 className="mt-3.5 text-pretty font-heading text-lg font-medium leading-snug tracking-tight">
        {request.title}
      </h3>
      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
        {meta.blurb}
      </p>

      <div className="mt-4 flex items-end justify-between gap-4 border-t border-border/70 pt-4">
        <div>
          <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            {HEADLINE_LABEL[request.headline.kind]}
          </div>
          <div className="tnum mt-0.5 font-heading text-xl font-medium">
            {formatJpy(request.headline.amountJpy)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Gauge className="size-3.5" />
            {RUSH_LABEL[request.rush_tier]} · {CONDITION_LABEL[request.min_condition]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            Updated {formatRelativeTime(request.updated_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
