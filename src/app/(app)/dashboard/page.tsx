import Link from "next/link";
import { Plus } from "lucide-react";
import { getDashboardRequests } from "@/lib/requests/queries";
import { STATUS_META, BUCKET_META, type Bucket } from "@/lib/requests/status";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatsRow, type DashboardStats } from "@/components/dashboard/stats";
import { RequestCard } from "@/components/dashboard/request-card";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata = { title: "Dashboard — Finders × Keepers" };

const BUCKET_ORDER: Bucket[] = [
  "action_needed",
  "in_progress",
  "in_transit",
  "completed",
  "closed",
];

export default async function DashboardPage() {
  const requests = await getDashboardRequests();

  const stats: DashboardStats = {
    active: requests.filter((r) =>
      ["action_needed", "in_progress", "in_transit"].includes(
        STATUS_META[r.status].bucket,
      ),
    ).length,
    needsAction: requests.filter(
      (r) => STATUS_META[r.status].bucket === "action_needed",
    ).length,
    inEscrowJpy: requests
      .filter((r) => r.escrowState === "held")
      .reduce((sum, r) => sum + (r.headline.amountJpy ?? 0), 0),
    inTransit: requests.filter(
      (r) => STATUS_META[r.status].bucket === "in_transit",
    ).length,
  };

  const grouped = BUCKET_ORDER.map((bucket) => ({
    bucket,
    items: requests.filter((r) => STATUS_META[r.status].bucket === bucket),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-medium tracking-tight sm:text-3xl">
            Your requests
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Everything you&rsquo;ve asked us to source, with live lifecycle and
            escrow status.
          </p>
        </div>
        <Link href="/requests/new" className={cn(buttonVariants(), "gap-1.5")}>
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
          <div className="mt-7">
            <StatsRow stats={stats} />
          </div>

          <div className="mt-10 flex flex-col gap-10">
            {grouped.map(({ bucket, items }) => (
              <section key={bucket} className="rise">
                <div className="mb-4 flex items-baseline gap-3">
                  <h2 className="font-heading text-lg font-medium tracking-tight">
                    {BUCKET_META[bucket].label}
                  </h2>
                  <span className="tnum rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {items.length}
                  </span>
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    {BUCKET_META[bucket].blurb}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
