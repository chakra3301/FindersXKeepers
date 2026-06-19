import { cn } from "@/lib/utils";

/**
 * Instrument-panel label: `[ 01 ] SECTION NAME` in mono with crimson
 * brackets. The recurring "readout" voice that ties the page together.
 */
export function SectionTag({
  index,
  children,
  className,
}: {
  index?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("mono-label inline-flex items-center gap-2", className)}>
      <span aria-hidden className="text-primary">[</span>
      {index ? <span className="text-foreground/80">{index}</span> : null}
      <span>{children}</span>
      <span aria-hidden className="text-primary">]</span>
    </span>
  );
}

/**
 * Small crosshair registration mark — borrowed straight from the logo's
 * dot-art crosshair. Used as corner ticks to frame hero / panels.
 */
export function Crosshair({ className }: { className?: string }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden
      className={cn("text-primary/70", className)}
    >
      <path d="M6.5 0v13M0 6.5h13" stroke="currentColor" strokeWidth="1" />
      <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** Animated dotted hairline with a crimson signal sweep. */
export function GlitchRule({ className }: { className?: string }) {
  return <div aria-hidden className={cn("glitch-rule", className)} />;
}

/**
 * Frames children with four corner crosshair ticks — an instrument-bezel
 * treatment for hero blocks and feature panels.
 */
export function RegisterFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Crosshair className="absolute -left-2 -top-2" />
      <Crosshair className="absolute -right-2 -top-2" />
      <Crosshair className="absolute -bottom-2 -left-2" />
      <Crosshair className="absolute -bottom-2 -right-2" />
      {children}
    </div>
  );
}
