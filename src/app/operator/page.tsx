import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getOperatorQueue, type OperatorQueueItem } from "@/lib/requests/operator-queries";
import { StatusBadge } from "@/components/requests/status-badge";
import { formatJpy } from "@/lib/pricing";

const SECTIONS: {
  key: keyof Awaited<ReturnType<typeof getOperatorQueue>>;
  title: string;
  description: string;
}[] = [
  {
    key: "needs_candidate",
    title: "Post candidate",
    description: "Sourcing — find a match and send proof to the customer.",
  },
  {
    key: "needs_purchase",
    title: "Mark purchased",
    description: "Approved — buy the item and mark it purchased.",
  },
  {
    key: "needs_receive",
    title: "Mark received",
    description: "Purchased — confirm the item is in hand at our hub.",
  },
  {
    key: "in_progress",
    title: "In progress",
    description: "Waiting on the customer or downstream steps.",
  },
];

function QueueRow({ item }: { item: OperatorQueueItem }) {
  return (
    <Link
      href={`/operator/${item.id}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary/30 hover:bg-muted/30"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[14px] font-[560] text-foreground">
            {item.title}
          </span>
          <StatusBadge status={item.status} className="shrink-0" />
        </div>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Cap {formatJpy(item.budget_cap_jpy ?? 0)}
          {item.latestCandidate?.price_jpy != null && (
            <>
              {" "}
              · latest candidate {formatJpy(item.latestCandidate.price_jpy)}
            </>
          )}
        </p>
      </div>
      <ChevronRight
        size={16}
        className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
      />
    </Link>
  );
}

export default async function OperatorQueuePage() {
  const queue = await getOperatorQueue();
  const actionCount =
    queue.needs_candidate.length +
    queue.needs_purchase.length +
    queue.needs_receive.length;

  return (
    <div>
      <h1 className="text-2xl font-[600] tracking-tight">Fulfillment queue</h1>
      <p className="mt-1.5 max-w-[42em] text-[14px] leading-relaxed text-muted-foreground">
        Team actions that drive the lifecycle between customer steps.{" "}
        {actionCount > 0 ? (
          <span className="text-foreground">
            {actionCount} {actionCount === 1 ? "hunt needs" : "hunts need"} your
            action.
          </span>
        ) : (
          "Nothing needs action right now."
        )}
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {SECTIONS.map(({ key, title, description }) => {
          const items = queue[key];
          if (items.length === 0) return null;
          return (
            <section key={key}>
              <div className="mb-3">
                <h2 className="text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
                  {title}
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {description}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <QueueRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}

        {SECTIONS.every(({ key }) => queue[key].length === 0) && (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">
            No active hunts in the queue.
          </p>
        )}
      </div>
    </div>
  );
}
