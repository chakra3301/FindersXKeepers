"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Pointer-driven 3D tilt + glare, shared by holo cards. Writes CSS custom
 * properties (--rx/--ry/--mx/--my) consumed by `.holo-card*` utilities, and
 * tracks an `active` flag for hover-only effects. Honors reduced motion via
 * the CSS layer (the `.holo-card` transform is neutralised there).
 */
export function useHoloTilt(range = 18) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const [active, setActive] = useState(false);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${(0.5 - py) * range}deg`);
        el.style.setProperty("--ry", `${(px - 0.5) * (range * 1.15)}deg`);
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
      });
    },
    [range],
  );

  const onPointerEnter = useCallback(() => setActive(true), []);

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
    setActive(false);
  }, []);

  return {
    ref,
    active,
    handlers: { onPointerEnter, onPointerMove, onPointerLeave },
  };
}
