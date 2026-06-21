import Link from "next/link";
import Image from "next/image";
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

  // Render the item image directly when it's a public/external ref (in-stock
  // claims, seed); storage-path refs would need signing, so fall back to thumb.
  const ref = request.reference_image_url ?? "";
  const imageUrl =
    ref.startsWith("http") || ref.startsWith("/") ? ref : null;

  // Direct action route for cards that need the customer to act.
  const actionHref =
    request.status === "candidate_sent"
      ? `/requests/${request.id}/candidate`
      : request.status === "received"
        ? `/requests/${request.id}/received`
        : request.status === "open" &&
            (request.escrowState === "none" || request.escrowState === "pending")
          ? `/requests/${request.id}/checkout`
          : null;

  return (
    <Link
      href={actionHref ?? `/requests/${request.id}`}
      className={cn(
        "group flex items-center gap-[18px] surface p-5 transition-shadow hover:border-primary/20",
        needsAction ? "border-warning-border" : "border-border",
      )}
    >
      {imageUrl ? (
        <div className="relative h-[84px] w-[62px] shrink-0 overflow-hidden rounded-[10px] border border-border bg-secondary">
          <Image
            src={imageUrl}
            alt={request.title}
            fill
            sizes="62px"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <PlaceholderThumb label="card" className="h-[84px] w-[62px] shrink-0" />
      )}

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
          {request.escrowState === "none"
            ? request.headline.kind === "order"
              ? "Order total"
              : request.headline.kind === "candidate"
                ? "Candidate price"
                : "Budget cap"
            : escrowCaption(request.status)}
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
                : "bg-secondary text-muted-foreground",
            )}
          >
            {chip.label}
          </div>
        )}
        {actionHref && (
          <div className="mt-2 text-[11.5px] font-[560] text-warning">
            {request.status === "candidate_sent" ? "Review candidate →"
              : request.status === "received" ? "Final check →"
              : request.escrowState === "pending" ? "Complete payment →"
              : request.in_stock ? "Complete purchase →"
              : "Deposit into escrow →"}
          </div>
        )}
      </div>
    </Link>
  );
}
