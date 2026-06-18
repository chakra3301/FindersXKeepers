"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatJpy } from "@/lib/pricing";
import { fulfillLabel, type CompletedFind } from "@/lib/finds/queries";
import { useHoloTilt } from "@/components/finds/use-holo-tilt";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-[0.95rem] font-semibold tracking-tight">{value}</div>
    </div>
  );
}

/**
 * Interactive holographic "completed find" card — the shareable trophy. Tilts
 * and shimmers with the pointer (the holo/foil/glitter/glare technique), and
 * shows the item photo, details, key stats, and time-to-fulfill.
 */
export function TrophyCard({
  find,
  className,
}: {
  find: CompletedFind;
  className?: string;
}) {
  const { ref, active, handlers } = useHoloTilt(16);
  const priceLines = [
    { label: "Item", value: find.itemCostJpy },
    { label: "Finder's fee", value: find.finderFeeJpy },
    { label: "Shipping", value: find.shippingJpy },
    { label: "Tax", value: find.taxJpy },
  ];

  return (
    <div className={cn("holo-perspective w-[340px] max-w-full", className)}>
      <article
        ref={ref}
        {...handlers}
        className={cn("holo-card trophy-card group relative block w-full overflow-hidden", active && "is-active")}
      >
        {/* content */}
        <div className="relative flex flex-col gap-3.5 p-5">
          <div className="flex items-center justify-between">
            <span className="mono-label !text-primary">
              <span aria-hidden>[</span> Completed find <span aria-hidden>]</span>
            </span>
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
              FK · SAR
            </span>
          </div>

          {/* item photo */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/10 bg-muted">
            {find.imageUrl ? (
              <Image
                src={find.imageUrl}
                alt={find.title}
                fill
                sizes="340px"
                className="object-cover"
                priority
                unoptimized
              />
            ) : null}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-success" />
              Fulfilled in {fulfillLabel(find.fulfillMs)}
            </div>
          </div>

          <h3 className="font-display text-[1.15rem] font-semibold leading-tight tracking-tight">
            {find.title}
          </h3>

          {/* key stats */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-background/40 px-3.5 py-3">
            <Stat label="Fulfilled in" value={fulfillLabel(find.fulfillMs)} />
            <Stat label="Condition" value={find.condition} />
            <Stat label="Total" value={formatJpy(find.totalJpy)} />
          </div>

          {/* four-line breakdown */}
          <dl className="flex flex-col gap-1 border-t border-border/70 pt-3">
            {priceLines.map((l) => (
              <div key={l.label} className="flex items-baseline justify-between">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {l.label}
                </dt>
                <dd className="tnum text-xs">{formatJpy(l.value)}</dd>
              </div>
            ))}
          </dl>

          <div className="flex items-center justify-between border-t border-border/70 pt-3">
            <span className="font-display text-[11px] font-semibold tracking-tight">
              Finders&nbsp;Keepers
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Sourced from Japan · escrow
            </span>
          </div>
        </div>

        {/* holographic overlays */}
        <div className="holo-card__foil" aria-hidden />
        <div className="holo-card__glitter" aria-hidden />
        <div className="holo-card__sheen" aria-hidden />
        <div className="holo-card__glare" aria-hidden />
      </article>
    </div>
  );
}
