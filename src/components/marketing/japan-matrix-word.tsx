"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const GLYPHS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" +
  "日本探物珍品古着刀書箱屋市場求響魂夢風林火山";

function pickGlyph(seed: number): string {
  return GLYPHS[Math.abs(seed) % GLYPHS.length]!;
}

type DotCell = {
  glyph: string;
  dot: boolean;
  tone: "white" | "red" | "dim";
};

export function JapanMatrixWord({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [staticFallback, setStaticFallback] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const id = requestAnimationFrame(() => setStaticFallback(true));
      return () => cancelAnimationFrame(id);
    }

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const context = ctx;
    context.imageSmoothingEnabled = false;

    const label = "Japan";
    let raf = 0;
    let frame = 0;
    let fontSize = 48;
    let displayFont = "Syne, sans-serif";
    const glyphFont = "var(--font-sans), 'Hiragino Sans', 'Noto Sans JP', sans-serif";
    let cssW = 0;
    let cssH = 0;
    let cell = 4;
    let cols = 0;
    let rows = 0;
    let mask: boolean[][] = [];
    let grid: DotCell[][] = [];
    let scrollY = 0;
    let padRight = 0;

    function readMetrics() {
      const cs = getComputedStyle(wrap!);
      fontSize = parseFloat(cs.fontSize) || 48;
      displayFont = cs.fontFamily || "Syne, sans-serif";
      // Tiny cells — glitch dot-art density scales with headline size.
      cell = Math.max(3, Math.round(fontSize * 0.045));
    }

    function randomCell(seed: number): DotCell {
      const roll = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
      return {
        glyph: pickGlyph(seed),
        dot: roll < 0.62,
        tone: roll > 0.88 ? "white" : roll > 0.38 ? "red" : "dim",
      };
    }

    function buildMask() {
      const probe = document.createElement("canvas");
      probe.width = Math.max(1, Math.ceil(cssW));
      probe.height = Math.max(1, Math.ceil(cssH));
      const pc = probe.getContext("2d");
      if (!pc) return;

      pc.clearRect(0, 0, cssW, cssH);
      pc.font = `600 ${fontSize}px ${displayFont}`;
      pc.textBaseline = "alphabetic";
      pc.fillStyle = "#fff";
      const baseline = cssH - fontSize * 0.12;
      pc.fillText(label, 0, baseline);

      const data = pc.getImageData(0, 0, probe.width, probe.height).data;
      mask = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const px = Math.min(probe.width - 1, Math.floor(c * cell + cell * 0.5));
          const py = Math.min(probe.height - 1, Math.floor(r * cell + cell * 0.5));
          return data[(py * probe.width + px) * 4 + 3]! > 40;
        }),
      );
    }

    function initGrid() {
      grid = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) =>
          mask[r]?.[c] ? randomCell(r * 977 + c) : randomCell(0),
        ),
      );
    }

    function layout() {
      readMetrics();
      // Room for the final letter + glyph/dot bleed past measured text width.
      padRight = Math.max(cell * 2, Math.round(fontSize * 0.07));
      wrap!.style.paddingRight = `${padRight}px`;

      const rect = wrap!.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.max(1, Math.floor(cssW * dpr));
      canvas!.height = Math.max(1, Math.floor(cssH * dpr));
      canvas!.style.width = `${cssW}px`;
      canvas!.style.height = `${cssH}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(cssW / cell) + 1;
      rows = Math.ceil(cssH / cell) + 1;
      buildMask();
      initGrid();
    }

    function toneColor(tone: DotCell["tone"]): string {
      switch (tone) {
        case "white":
          return "#ffffff";
        case "red":
          return "#ef4444";
        default:
          return "rgba(153, 27, 27, 0.55)";
      }
    }

    function draw() {
      context.clearRect(0, 0, cssW, cssH);
      const glyphPx = Math.max(3, cell - 1);

      scrollY = (scrollY + 0.35) % cell;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!mask[r]?.[c]) continue;

          // Flicker / glitch repick
          if (Math.random() < 0.055) {
            grid[r]![c] = randomCell(frame * 131 + r * 17 + c);
          }

          const { glyph, dot, tone } = grid[r]![c]!;
          const x = c * cell;
          const y = r * cell + scrollY - cell;

          if (y < -cell || y > cssH + cell) continue;

          context.fillStyle = toneColor(tone);

          if (dot) {
            const inset = cell <= 4 ? 0 : 1;
            context.fillRect(x + inset, y + inset, cell - inset * 2 - 1, cell - inset * 2 - 1);
          } else {
            context.font = `500 ${glyphPx}px ${glyphFont}`;
            context.textBaseline = "top";
            context.fillText(glyph, x, y);
          }
        }
      }

      frame += 1;
    }

    function tick() {
      draw();
      raf = requestAnimationFrame(tick);
    }

    layout();
    tick();

    const ro = new ResizeObserver(() => layout());
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  if (staticFallback) {
    return <span className={cn("text-white", className)}>Japan</span>;
  }

  return (
    <span
      ref={wrapRef}
      className={cn("relative inline-block overflow-visible align-baseline", className)}
    >
      <span className="sr-only">Japan</span>
      <span aria-hidden className="invisible select-none">
        Japan
      </span>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 block"
      />
    </span>
  );
}
