import Link from "next/link";
import type { DashboardRequest } from "@/lib/requests/queries";
import { STATUS_META } from "@/lib/requests/status";
import { formatJpy } from "@/lib/pricing";
import { formatRelativeTime } from "@/lib/dates";
import {
  railProgress,
  escrowCaption,
  deadlineChip,
} from "@/lib/requests/display";
import { StatusBadge } from "@/components/requests/status-badge";
import { PlaceholderThumb } from "@/components/ui/placeholder-thumb";
import { cn } from "@/lib/utils";

export function RequestCard({ request }: { request: DashboardRequest }) {
  const meta = STATUS_META[request.status];
  const needsAction = meta.bucket === "action_needed";
  const progress = railProgress(request.status);
  const chip = deadlineChip(request.deadline_at, request.status);

  return (
    <Link
      href={`/requests/${request.id}`}
      className={cn(
        "group flex items-center gap-[18px] rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(15,17,21,.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,17,21,.07)]",
        needsAction ? "border-warning-border" : "border-border",
      )}
    >
      <PlaceholderThumb label="card" className="h-[84px] w-[62px] shrink-0" />

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="min-w-0 flex-[0_1_auto] truncate text-[15px] font-[560] tracking-tight">
            {request.title}
          </span>
          <StatusBadge status={request.status} className="shrink-0" />
        </div>

        <div className="flex flex-wrap gap-1">
          {Array.from({ length: progress.total }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 max-w-[42px] flex-1 rounded-full",
                i < progress.filled
                  ? progress.tone === "success"
                    ? "bg-success"
                    : "bg-primary"
                  : "bg-border",
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{meta.blurb}</span>
          <span>·</span>
          <span>updated {formatRelativeTime(request.updated_at)}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[11.5px] text-muted-foreground">
          {escrowCaption(request.status)}
        </div>
        <div className="tnum mt-0.5 text-lg font-[600] tracking-tight">
          {formatJpy(request.headline.amountJpy)}
        </div>
        {chip && (
          <div
            className={cn(
              "tnum mt-2 inline-block rounded-md px-2 py-0.5 text-[11.5px] font-[540]",
              chip.tone === "warning"
                ? "bg-warning-muted text-warning"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {chip.label}
          </div>
        )}
      </div>
    </Link>
  );
}
