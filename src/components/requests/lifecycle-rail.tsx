import { Check } from "lucide-react";
import type { RequestStatus } from "@/lib/db/types";
import { LIFECYCLE_RAIL, STATUS_META } from "@/lib/requests/status";
import { cn } from "@/lib/utils";

/**
 * Vertical lifecycle timeline. Renders the happy-path rail and marks where the
 * request currently sits. Off-rail closures (cancelled / refunded) are shown as
 * a banner above the (dimmed) rail.
 */
export function LifecycleRail({
  status,
  timestamps,
}: {
  status: RequestStatus;
  timestamps?: Partial<Record<RequestStatus, string>>;
}) {
  const meta = STATUS_META[status];
  const offRail = meta.rail === null;
  const currentRail = meta.rail ?? -1;
  const usesSuccess = status === "released";

  return (
    <div>
      {offRail && (
        <div
          className={cn(
            "mb-4 rounded-lg border px-3 py-2 text-sm",
            status === "refunded"
              ? "border-warning-border bg-warning-muted text-warning"
              : "border-border bg-slate-100 text-slate-600",
          )}
        >
          {meta.label} — {meta.blurb}
        </div>
      )}

      <ol className={cn("relative", offRail && "opacity-50")}>
        {LIFECYCLE_RAIL.map((step, i) => {
          const stepMeta = STATUS_META[step];
          const done = !offRail && i < currentRail;
          const current = !offRail && i === currentRail;
          const isLast = i === LIFECYCLE_RAIL.length - 1;

          return (
            <li key={step} className="flex gap-3.5 pb-5 last:pb-0">
              {/* node + connector */}
              <div className="relative flex flex-col items-center">
                <span
                  className={cn(
                    "z-10 grid size-6 place-items-center rounded-full border-2 transition-colors",
                    done &&
                      (usesSuccess
                        ? "border-success bg-success text-success-foreground"
                        : "border-primary bg-primary text-primary-foreground"),
                    current &&
                      (usesSuccess
                        ? "border-success bg-card text-success ring-4 ring-success/15"
                        : "border-primary bg-card text-primary ring-4 ring-primary/15"),
                    !done && !current && "border-border bg-card",
                  )}
                >
                  {done ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        current
                          ? usesSuccess
                            ? "bg-success"
                            : "bg-primary"
                          : "bg-muted-foreground/40",
                      )}
                    />
                  )}
                </span>
                {!isLast && (
                  <span
                    className={cn(
                      "absolute top-6 h-[calc(100%-12px)] w-0.5",
                      done
                        ? usesSuccess
                          ? "bg-success/40"
                          : "bg-primary/40"
                        : "bg-border",
                    )}
                  />
                )}
              </div>

              {/* label + timestamp */}
              <div
                className={cn(
                  "flex flex-1 items-start justify-between gap-2.5 pt-0.5",
                  !done && !current && "opacity-70",
                )}
              >
                <div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      current ? "text-foreground" : "text-foreground/90",
                    )}
                  >
                    {stepMeta.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stepMeta.blurb}
                  </div>
                </div>
                <span className="tnum whitespace-nowrap text-xs text-muted-foreground">
                  {timestamps?.[step] ?? (done || current ? "" : "pending")}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
