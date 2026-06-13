import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { getDashboardRequests } from "@/lib/requests/queries";
import { STATUS_META } from "@/lib/requests/status";
import { formatJpy } from "@/lib/pricing";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RequestCard } from "@/components/dashboard/request-card";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata = { title: "Dashboard — Finders × Keepers" };

export default async function DashboardPage() {
  const requests = await getDashboardRequests();

  const activeRequests = requests.filter(
    (r) => STATUS_META[r.status].rail !== null,
  );

  const fundedRequests = activeRequests.filter(
    (r) => r.escrowState === "held" || r.escrowState === "pending",
  );
  const totalEscrow = fundedRequests.reduce((sum, r) => sum + (r.headline.amountJpy ?? 0), 0);
  const activeCount = fundedRequests.length;

  const actionReqs = requests.filter(
    (r) => STATUS_META[r.status].bucket === "action_needed",
  );

  return (
    <div className="mx-auto w-full max-w-[1000px] px-10 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-medium tracking-tight sm:text-3xl">
            Your hunts
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Everything you&rsquo;ve asked us to source, with live lifecycle and
            escrow status.
          </p>
        </div>
        <Link
          href="/requests/new"
          className={cn(
            buttonVariants(),
            "inline-flex items-center gap-2 h-10 px-[17px] rounded-[10px] text-[13.5px] font-[540]",
          )}
        >
          <Plus className="size-4" />
          New request
        </Link>
      </header>

      {requests.length === 0 ? (
        <div className="mt-10">
          <EmptyState />
        </div>
      ) : (
        <>
          {/* Trust banner — only shown when funds are actually held */}
          {activeCount > 0 && (
            <div className="mb-3.5 mt-7 flex items-center gap-[18px] rounded-2xl border border-success-border bg-card px-[22px] py-[18px] shadow-[0_1px_2px_rgba(15,17,21,.04)]">
              <span className="grid size-[46px] shrink-0 place-items-center rounded-xl bg-success-muted">
                <ShieldCheck className="size-[22px] text-success" />
              </span>
              <div className="flex-1">
                <div className="text-[15px] font-[560] tracking-tight">
                  <span className="tnum">{formatJpy(totalEscrow)}</span> held safely across{" "}
                  {activeCount} {activeCount === 1 ? "hunt" : "hunts"}
                </div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">
                  Released only when each item ships. Refunded in full if we can&apos;t find it by the deadline.
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-success-muted px-2.5 py-1 text-xs font-[540] text-success">
                Escrow active
              </span>
            </div>
          )}

          {/* Action-needed strip */}
          {actionReqs.length > 0 && (
            <>
              <div className="mb-3.5 mt-6 flex items-center gap-2.5">
                <span className="pulse-dot size-[7px] rounded-full bg-amber-600" />
                <h2 className="m-0 text-[13px] font-[600] uppercase tracking-[.02em] text-warning">
                  Your action needed
                </h2>
                <span className="tnum text-xs text-muted-foreground">
                  {actionReqs.length}
                </span>
              </div>
              <div className="mb-7 flex flex-col gap-3">
                {actionReqs.map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
              </div>
            </>
          )}

          {/* All hunts */}
          <div className="mb-3.5 mt-2 flex items-center gap-2.5">
            <h2 className="m-0 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
              All hunts
            </h2>
            <span className="tnum text-xs text-muted-foreground">
              {requests.length}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
