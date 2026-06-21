"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { type InventoryItem, formatUsd } from "@/lib/inventory";
import { useHoloTilt } from "@/components/finds/use-holo-tilt";
import { cn } from "@/lib/utils";

export function InventoryCard({
  item,
  accent,
}: {
  item: InventoryItem;
  accent: string;
}) {
  const { ref, active, handlers } = useHoloTilt(12);
  const low = !item.bundle && item.qty <= 2;

  return (
    <Link
      href={`/requests/new?title=${encodeURIComponent(item.name)}`}
      aria-label={`Claim ${item.name}`}
      className="holo-perspective block"
    >
      <article
        ref={ref}
        {...handlers}
        className={cn(
          "holo-card group relative flex h-full flex-col overflow-hidden !rounded-2xl border border-border bg-card !cursor-pointer",
          active && "is-active",
        )}
      >
        {/* product image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-secondary to-background">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ backgroundColor: accent }}
          />
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width:640px) 100vw, 320px"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]"
            unoptimized
          />
          {/* price pill */}
          <div className="absolute right-2.5 top-2.5 rounded-full bg-background/90 px-2.5 py-1 shadow-sm backdrop-blur">
            <span className="tnum text-[13px] font-[640]">
              {formatUsd(item.priceUsd)}
            </span>
            <span className="ml-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
              /{item.unit === "ea" ? "ea" : " lot"}
            </span>
          </div>
        </div>

        {/* info */}
        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <h3 className="text-[14px] font-[560] leading-snug tracking-tight">
            {item.name}
          </h3>

          <div className="mt-auto flex items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-[540]",
                item.bundle
                  ? "bg-primary/10 text-primary"
                  : low
                    ? "bg-warning-muted text-warning"
                    : "bg-success-muted text-success",
              )}
            >
              {item.bundle ? (
                <>
                  <Layers className="size-3" />
                  Bundle · {item.qty} boxes
                </>
              ) : (
                <>
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      low ? "bg-warning" : "bg-success",
                    )}
                  />
                  {item.qty} available
                </>
              )}
            </span>

            <span className="inline-flex items-center gap-1 text-[12.5px] font-[540] text-primary">
              Claim
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>

        {/* subtle 3D glare */}
        <div className="holo-card__sheen" aria-hidden />
        <div className="holo-card__glare" aria-hidden />
      </article>
    </Link>
  );
}
