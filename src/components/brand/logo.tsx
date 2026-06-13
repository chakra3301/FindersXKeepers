import { cn } from "@/lib/utils";

/**
 * Finders × Keepers wordmark. The circular emblem is the design-handoff mark —
 * a ring with a filled centre dot, rendered in the primary indigo via currentColor.
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
      <svg
        aria-hidden
        width="26"
        height="26"
        viewBox="0 0 28 28"
        fill="none"
        className="shrink-0 text-primary"
      >
        <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2" />
        <circle cx="14" cy="14" r="3.6" fill="currentColor" />
      </svg>
      {showWordmark && (
        <span className="font-sans text-[15px] font-[600] tracking-tight text-foreground">
          Finders&nbsp;Keepers
        </span>
      )}
    </span>
  );
}
