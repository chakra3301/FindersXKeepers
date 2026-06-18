"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Interactive holographic trading card — vendored technique (3D pointer tilt +
 * moving glare + holo sheen + glow), adapted from the SwiftUI parallax-card
 * idea (helvetiica/PokemonCard) to the web. No external dependency.
 *
 * The image is treated as a complete card face (e.g. a full SAR scan). Pointer
 * position drives CSS custom properties consumed by `.holo-card*` utilities in
 * globals.css. Honors prefers-reduced-motion (tilt + sheen disabled there).
 *
 * `ambient`: render as a non-interactive backdrop that tilts/shimmers from
 * cursor movement anywhere on the page (used when the card sits *behind* other
 * content, so it can't be hovered directly).
 */
export function HoloCard({
  src,
  alt,
  width = 300,
  ambient = false,
  className,
}: {
  src: string;
  alt: string;
  /** Rendered card width in px (height derives from the 2.5:3.5 ratio). */
  width?: number;
  ambient?: boolean;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const activeRef = useRef(false);
  const [active, setActive] = useState(false);

  const height = Math.round((width * 3.5) / 2.5);

  const apply = useCallback(
    (px: number, py: number, range: number) => {
      const el = cardRef.current;
      if (!el) return;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${(0.5 - py) * range}deg`);
        el.style.setProperty("--ry", `${(px - 0.5) * (range * 1.2)}deg`);
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
      });
      if (!activeRef.current) {
        activeRef.current = true;
        setActive(true);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
    activeRef.current = false;
    setActive(false);
  }, []);

  // Ambient mode: follow the cursor from anywhere on the page.
  useEffect(() => {
    if (!ambient) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = cardRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = Math.max(-0.4, Math.min(1.4, (e.clientX - r.left) / r.width));
      const py = Math.max(-0.4, Math.min(1.4, (e.clientY - r.top) / r.height));
      apply(px, py, 12);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [ambient, apply]);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = cardRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      apply((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, 20);
    },
    [apply],
  );

  return (
    <div
      className={cn("holo-perspective", ambient && "pointer-events-none", className)}
      style={{ width }}
    >
      <div
        ref={cardRef}
        className={cn("holo-card", active && "is-active", ambient && "is-ambient")}
        style={{ width, height }}
        onPointerEnter={ambient ? undefined : () => setActive(true)}
        onPointerMove={ambient ? undefined : onMove}
        onPointerLeave={ambient ? undefined : reset}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={`${width}px`}
          className="holo-card__img"
          priority
        />
        <div className="holo-card__foil" aria-hidden />
        <div className="holo-card__glitter" aria-hidden />
        <div className="holo-card__sheen" aria-hidden />
        <div className="holo-card__glare" aria-hidden />
      </div>
    </div>
  );
}
