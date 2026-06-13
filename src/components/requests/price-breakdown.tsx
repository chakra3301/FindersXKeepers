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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,17,21,.04)]">
      <h3 className="mb-2 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
        What you&apos;ll pay
      </h3>
      <dl>
        {LINES.map((line) => (
          <div
            key={String(line.key)}
            className="flex items-baseline justify-between border-b border-[#F4F5F7] py-2.5"
          >
            <dt className="flex flex-col">
              <span className="text-[13.5px] text-foreground">{line.label}</span>
              <span className="text-[11px] text-muted-foreground">
                {line.note}
              </span>
            </dt>
            <dd className="tnum text-[13.5px] font-[540] text-foreground">
              {formatJpy(order[line.key] as number)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex items-baseline justify-between pt-3">
        <span className="text-sm font-[600]">Total held</span>
        <span className="tnum text-[17px] font-[600]">
          {formatJpy(order.total_jpy)}
        </span>
      </div>
    </div>
  );
}
