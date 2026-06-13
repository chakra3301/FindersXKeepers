import type { Order } from "@/lib/db/types";
import { formatJpy } from "@/lib/pricing";

/**
 * The four-line price ledger — item cost / finder's fee / shipping / tax —
 * always shown as separate lines, never collapsed into one opaque number.
 */
const LINES: { key: keyof Order; label: string; note: string }[] = [
  { key: "item_cost_jpy", label: "Item cost", note: "Pass-through" },
  { key: "finder_fee_jpy", label: "Finder's fee", note: "Our service fee" },
  { key: "shipping_jpy", label: "Shipping", note: "Japan → you" },
  { key: "tax_jpy", label: "Tax", note: "Consumption tax" },
];

export function PriceBreakdown({ order }: { order: Order }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30">
      <dl className="divide-y divide-border/70">
        {LINES.map((line) => (
          <div
            key={String(line.key)}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <dt className="flex flex-col">
              <span className="text-sm text-foreground">{line.label}</span>
              <span className="text-[0.7rem] text-muted-foreground">
                {line.note}
              </span>
            </dt>
            <dd className="tnum text-sm font-medium text-foreground">
              {formatJpy(order[line.key] as number)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between border-t-2 border-border px-4 py-3">
        <span className="text-sm font-medium">Total</span>
        <span className="tnum font-heading text-lg font-medium">
          {formatJpy(order.total_jpy)}
        </span>
      </div>
    </div>
  );
}
