import type { RequestStatus } from "@/lib/db/types";
import { STATUS_META, TONE_BADGE, TONE_DOT } from "@/lib/requests/status";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: RequestStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        TONE_BADGE[meta.tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", TONE_DOT[meta.tone])} />
      {meta.label}
    </span>
  );
}
