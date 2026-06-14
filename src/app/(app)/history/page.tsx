import Link from "next/link";
import { getOrderHistory } from "@/lib/requests/queries";
import { StatusBadge } from "@/components/requests/status-badge";
import { EscrowBadge } from "@/components/requests/escrow-badge";
import { PriceBreakdown } from "@/components/requests/price-breakdown";
import { buttonVariants } from "@/components/ui/button";
import { formatJpy } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const metadata = { title: "Order history — Finders Keepers" };

export default async function HistoryPage() {
  const rows = await getOrderHistory();

  return (
    <div className="mx-auto w-full max-w-[1000px] px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Order history</h1>
      <p className="mb-6 text-sm text-muted-foreground">Settled and closed hunts.</p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No closed hunts yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(({ request, order, refundedJpy }) => {
            const reorder = new URLSearchParams({
              title: request.title,
              condition: request.min_condition,
              rush: request.rush_tier,
              ...(request.budget_cap_jpy
                ? { budget: String(request.budget_cap_jpy) }
                : {}),
            });
            return (
              <div
                key={request.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href={`/requests/${request.id}`}
                    className="text-[15px] font-[560] tracking-tight hover:underline"
                  >
                    {request.title}
                  </Link>
                  <StatusBadge status={request.status} />
                  <EscrowBadge
                    state={
                      request.status === "released"
                        ? "released"
                        : request.status === "refunded"
                          ? "refunded"
                          : "none"
                    }
                  />
                  {refundedJpy != null && refundedJpy > 0 && (
                    <span className="text-[12px] text-success">
                      {formatJpy(refundedJpy)} returned to you
                    </span>
                  )}
                  <Link
                    href={`/requests/new?${reorder}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "ml-auto",
                    )}
                  >
                    Reorder
                  </Link>
                </div>
                {order && (
                  <div className="mt-4 max-w-md">
                    <PriceBreakdown order={order} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
