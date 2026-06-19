import { cn } from "@/lib/utils";

/**
 * Finders × Keepers mark — a "Targeted Shield": the shield (Keepers · escrow,
 * protection) drawn in the current text color, with a locked crosshair
 * (Finders · sourcing, targeting) in the accent. Two-tone, scalable, themeable.
 */
export function FkMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      {/* shield — Keepers */}
      <path
        d="M16 2.6 L27.2 6.9 L27.2 14.8 C27.2 22.4 22.3 27.1 16 29.6 C9.7 27.1 4.8 22.4 4.8 14.8 L4.8 6.9 Z"
        className="stroke-current"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* crosshair arms — Finders (broken around the centre lock) */}
      <g className="stroke-primary" strokeWidth={2} strokeLinecap="round">
        <path d="M16 6.4 L16 11.6" />
        <path d="M16 18.4 L16 23.6" />
        <path d="M8.4 15 L12.6 15" />
        <path d="M19.4 15 L23.6 15" />
      </g>
      {/* locked centre */}
      <circle cx="16" cy="15" r="3.4" className="stroke-primary" strokeWidth={2} />
      <circle cx="16" cy="15" r="1.05" className="fill-primary" />
    </svg>
  );
}
