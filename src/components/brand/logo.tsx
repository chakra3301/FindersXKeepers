import { cn } from "@/lib/utils";
import { FkMark } from "@/components/brand/fk-mark";

/**
 * Finders × Keepers wordmark: the Targeted Shield mark + optional text label.
 */
export function Logo({
  className,
  showWordmark = true,
  markClassName,
}: {
  className?: string;
  showWordmark?: boolean;
  /** Size/position tweaks for the mark (defaults by wordmark mode). */
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <FkMark className={cn(showWordmark ? "h-9 w-9" : "h-7 w-7", markClassName)} />
      {showWordmark && (
        <span className="font-sans text-[15px] font-[600] tracking-tight text-foreground">
          Finders&nbsp;Keepers
        </span>
      )}
    </span>
  );
}
