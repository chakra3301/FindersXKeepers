import { cn } from "@/lib/utils";

/**
 * Finders × Keepers wordmark. The seal carries a 探 ("search / seek out") glyph —
 * a quiet nod to the sourcing craft — and the × in the wordmark is the indigo accent.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-[0.5rem] bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20"
      >
        <span className="font-sans text-[15px] leading-none">探</span>
      </span>
      {showWordmark && (
        <span className="font-sans text-[15px] font-medium tracking-tight text-foreground">
          Finders <span className="text-primary">×</span> Keepers
        </span>
      )}
    </span>
  );
}
