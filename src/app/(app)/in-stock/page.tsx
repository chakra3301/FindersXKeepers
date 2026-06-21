import { PackageCheck } from "lucide-react";
import { INVENTORY, INVENTORY_COUNT } from "@/lib/inventory";
import { InventoryCard } from "@/components/in-stock/inventory-card";

export const metadata = { title: "In stock — Finders Keepers" };

export default function InStockPage() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-10 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-success">
            <PackageCheck className="size-4" />
            <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
              In hand · ready to ship
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            In stock now
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sealed boxes &amp; cases we already hold —{" "}
            <span className="tnum">{INVENTORY_COUNT}</span> listings. No sourcing
            wait; claim one and we ship on payment.
          </p>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-9">
        {INVENTORY.map((cat) => (
          <section key={cat.key}>
            <div
              className="mb-3.5 flex items-center gap-2.5 border-l-[3px] pl-3"
              style={{ borderColor: cat.color }}
            >
              <h2 className="m-0 text-[13px] font-[600] uppercase tracking-[0.04em]">
                {cat.label}
              </h2>
              <span className="tnum text-xs text-muted-foreground">
                {cat.items.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cat.items.map((item) => (
                <InventoryCard key={item.name} item={item} accent={cat.color} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-9 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
        All items sealed &amp; in hand unless noted · Prices in USD
      </p>
    </div>
  );
}
