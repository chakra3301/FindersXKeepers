import { cn } from "@/lib/utils";

/**
 * Live "console feed" ticker — a pinned terminal prompt + an infinite mono
 * marquee. The feed content is duplicated once so the -50% translate loops
 * seamlessly. Decorative; hidden from assistive tech.
 */
const FEED = [
  "Hasselblad 500C/M, boxed",
  "Yohji AW'95 wool coat",
  "Nintendo Famicom, mint",
  "Casio AE-1200, deadstock",
  "Number (N)ine denim",
  "Pokémon Base Set, JP 1996",
  "Daniel Arsham × Pokémon",
  "Porter Tanker, vintage",
  "Studio Ghibli laserdisc",
  "G-Shock Frogman DW-6300",
];

export function Ticker({ className }: { className?: string }) {
  const items = [...FEED, ...FEED];
  return (
    <div
      aria-hidden
      className={cn(
        "scanlines relative flex items-stretch overflow-hidden border-y border-border/70 bg-card/40",
        className,
      )}
    >
      {/* pinned terminal prompt */}
      <div className="z-10 flex shrink-0 items-center gap-2.5 border-r border-border/70 bg-background/70 px-4 backdrop-blur-sm sm:px-5">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-success">
          <span className="pulse-dot size-1.5 rounded-full bg-success" />
          Rec
        </span>
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
          FK://live-feed
        </span>
        <span className="term-cursor font-mono text-[13px] leading-none text-primary">▍</span>
      </div>

      {/* scrolling feed */}
      <div className="marquee-mask flex-1 overflow-hidden py-2.5">
        <div className="marquee-track">
          {items.map((item, i) => (
            <span
              key={i}
              className="mx-5 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              <span className="size-1 rounded-full bg-primary/80" />
              <span className="text-muted-foreground/55">Now hunting</span>
              <span className="text-foreground/75">{item}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
