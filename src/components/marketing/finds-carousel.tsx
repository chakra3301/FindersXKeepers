"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type Find = {
  title: string;
  note: string;
  days: string;
  img: string;
  alt: string;
  fit: "cover" | "contain";
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Coverflow 3D carousel — the active card faces forward, neighbours angle back
 * in perspective. Click a side card, use the arrows/dots, drag, or arrow-keys
 * to rotate focus. Transitions disabled under prefers-reduced-motion via the
 * `.finds-card` utility in globals.css.
 */
export function FindsCarousel({ items }: { items: Find[] }) {
  const n = items.length;
  const [active, setActive] = useState(0);
  const dragX = useRef<number | null>(null);

  const go = useCallback(
    (dir: number) => setActive((a) => (a + dir + n) % n),
    [n],
  );

  // signed shortest offset of card i from the active card (wraps the ring)
  const offset = (i: number) => {
    let d = i - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragX.current === null) return;
    const dx = e.clientX - dragX.current;
    dragX.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="Recent finds"
      className="select-none"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <div
        className="finds-stage relative h-[440px] sm:h-[470px]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {items.map((f, i) => {
          const d = offset(i);
          const ad = Math.abs(d);
          const hidden = ad > 1.5;
          const isActive = d === 0;
          return (
            <button
              key={f.title}
              type="button"
              tabIndex={isActive ? -1 : 0}
              aria-label={isActive ? undefined : `Show ${f.title}`}
              aria-hidden={hidden}
              onClick={() => !isActive && setActive(i)}
              className={cn(
                "finds-card surface group absolute left-1/2 top-1/2 overflow-hidden text-left",
                isActive ? "is-active cursor-default" : "cursor-pointer",
              )}
              style={{
                width: "clamp(230px, 25vw, 300px)",
                height: "clamp(320px, 34vw, 410px)",
                transform: `translate(-50%, -50%) translateX(${d * 62}%) translateZ(${-ad * 150}px) rotateY(${d * -40}deg) scale(${1 - ad * 0.16})`,
                zIndex: 30 - Math.round(ad * 10),
                opacity: hidden ? 0 : 1 - ad * 0.32,
                filter: `brightness(${1 - ad * 0.42})`,
                pointerEvents: hidden ? "none" : undefined,
              }}
            >
              <Image
                src={f.img}
                alt={f.alt}
                fill
                sizes="300px"
                className={cn(
                  "transition-transform duration-700 ease-out",
                  isActive && "group-hover:scale-[1.05]",
                  f.fit === "contain" ? "object-contain p-5" : "object-cover",
                )}
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-card via-card/35 to-transparent"
              />
              <span className="absolute right-3 top-3 rounded-full bg-background/75 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur-sm">
                {f.days}d
              </span>
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="text-pretty text-[0.95rem] font-medium leading-snug tracking-tight">
                  {f.title}
                </h3>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 13l4 4 10-11"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {f.note}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* controls */}
      <div className="mt-8 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous find"
          className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <Chevron dir="left" />
        </button>
        <div className="flex items-center gap-2">
          {items.map((f, i) => (
            <button
              key={f.title}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Go to ${f.title}`}
              aria-current={i === active}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === active ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next find"
          className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <Chevron dir="right" />
        </button>
      </div>
    </div>
  );
}
