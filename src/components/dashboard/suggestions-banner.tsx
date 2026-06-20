"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { SUGGESTIONS, type Suggestion } from "@/lib/suggestions";
import { useHoloTilt } from "@/components/finds/use-holo-tilt";
import { cn } from "@/lib/utils";

function SuggestionCard({ item }: { item: Suggestion }) {
  const { ref, active, handlers } = useHoloTilt(16);
  return (
    <Link
      href={`/requests/new?title=${encodeURIComponent(item.prefill)}`}
      aria-label={`Request ${item.title}`}
      className="holo-perspective block w-[176px] shrink-0 snap-start"
    >
      <div
        ref={ref}
        {...handlers}
        className={cn(
          "holo-card group relative block aspect-[3/4] w-full overflow-hidden !cursor-pointer",
          active && "is-active",
        )}
      >
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="176px"
          className="holo-card__img object-cover"
          unoptimized
        />
        {/* legibility scrim */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

        {/* overlaying item info */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/65">
            {item.category}
          </span>
          <span className="text-[13.5px] font-semibold leading-tight tracking-tight text-white">
            {item.title}
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-white/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Start this hunt <ArrowRight className="size-3" />
          </span>
        </div>

        {/* holographic overlays */}
        <div className="holo-card__foil" aria-hidden />
        <div className="holo-card__glitter" aria-hidden />
        <div className="holo-card__sheen" aria-hidden />
        <div className="holo-card__glare" aria-hidden />
      </div>
    </Link>
  );
}

/**
 * Full-width "popular hunts" banner for the top of the dashboard. A row of
 * pointer-tilting 3D cards (the holo technique) with overlaid item info, plus
 * a CTA. Each card deep-links into a pre-filled new request.
 */
export function SuggestionsBanner() {
  return (
    <section className="relative mt-7 overflow-hidden rounded-[20px] border border-border bg-gradient-to-br from-primary/[0.07] via-card to-card p-5 sm:p-6">
      {/* soft accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-primary/12 text-primary">
              <Sparkles className="size-3.5" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
              Popular from Japan
            </span>
          </div>
          <h2 className="mt-2 font-display text-[19px] font-semibold tracking-tight sm:text-xl">
            Not sure what to hunt? Start here.
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Tap any card to open a request with the details pre-filled — then set
            your budget and condition.
          </p>
        </div>
        <Link
          href="/requests/new"
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2.5 text-[13px] font-[560] text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Request anything
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* 3D card row */}
      <div className="relative -mx-5 mt-5 sm:-mx-6">
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 pt-1 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SUGGESTIONS.map((item) => (
            <SuggestionCard key={item.title} item={item} />
          ))}
        </div>
        {/* edge fades hint scrollability */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent"
        />
      </div>
    </section>
  );
}
