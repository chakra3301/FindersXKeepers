import { ExternalLink } from "lucide-react";
import type { Candidate } from "@/lib/db/types";
import { formatJpy } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const CANDIDATE_STATUS: Record<
  Candidate["status"],
  { label: string; className: string }
> = {
  proposed: {
    label: "Awaiting your call",
    className:
      "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-300",
  },
  approved: {
    label: "Approved",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  rejected: {
    label: "Passed",
    className:
      "bg-zinc-100 text-zinc-600 ring-zinc-500/15 dark:bg-zinc-400/10 dark:text-zinc-400",
  },
};

export function CandidateCard({ candidate }: { candidate: Candidate }) {
  const status = CANDIDATE_STATUS[candidate.status];
  const images = candidate.listing_images ?? [];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex gap-4 p-4">
        {images[0] && (
          // Remote placeholder images — plain <img> avoids next/image domain config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[0]}
            alt=""
            className="size-20 shrink-0 rounded-lg border border-border object-cover"
            loading="lazy"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-medium ring-1 ring-inset",
                status.className,
              )}
            >
              {status.label}
            </span>
            <span className="tnum font-heading text-lg font-medium">
              {formatJpy(candidate.price_jpy)}
            </span>
          </div>
          {candidate.notes && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {candidate.notes}
            </p>
          )}
          {candidate.listing_url && (
            <a
              href={candidate.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              View listing
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
