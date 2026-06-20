import Link from "next/link";
import { PackageCheck, ArrowRight } from "lucide-react";
import { INVENTORY, INVENTORY_COUNT, formatUsd } from "@/lib/inventory";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
            Sealed boxes &amp; cases we already hold in Japan —{" "}
            <span className="tnum">{INVENTORY_COUNT}</span> listings. No sourcing
            wait; claim one and we ship on payment.
          </p>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-9">
        {INVENTORY.map((cat) => (
          <section key={cat.key}>
            <div
              className="mb-3 flex items-center gap-2.5 border-l-[3px] pl-3"
              style={{ borderColor: cat.color }}
            >
              <span className="text-base leading-none" aria-hidden>
                {cat.emoji}
              </span>
              <h2 className="m-0 text-[13px] font-[600] uppercase tracking-[0.04em]">
                {cat.label}
              </h2>
              <span className="tnum text-xs text-muted-foreground">
                {cat.items.length}
              </span>
            </div>

            <ul className="flex flex-col gap-2.5">
              {cat.items.map((item) => {
                const low = item.qty <= 2;
                return (
                  <li
                    key={item.name}
                    className="surface flex flex-wrap items-center gap-x-5 gap-y-3 px-[18px] py-[15px]"
                  >
                    <div className="min-w-[220px] flex-1">
                      <div className="text-[14.5px] font-[540] leading-snug tracking-tight">
                        {item.name}
                      </div>
                      <span
                        className={cn(
                          "mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-[540]",
                          low
                            ? "bg-warning-muted text-warning"
                            : "bg-success-muted text-success",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            low ? "bg-warning" : "bg-success",
                          )}
                        />
                        {item.qty} available
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="tnum text-[15px] font-[600] leading-none">
                        {formatUsd(item.priceUsd)}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        / {item.unit}
                      </div>
                    </div>

                    <Link
                      href={`/requests/new?title=${encodeURIComponent(item.name)}`}
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "group h-9 shrink-0 gap-1.5 rounded-[9px] text-[13px]",
                      )}
                    >
                      Claim
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-9 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
        All items sealed &amp; in hand unless noted · Prices in USD
      </p>
    </div>
  );
}
