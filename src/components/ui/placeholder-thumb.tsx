import { cn } from "@/lib/utils";

/**
 * Diagonal-hatch placeholder standing in for real imagery until Storage
 * uploads land. Matches the design prototype's thumbnails.
 */
export function PlaceholderThumb({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hatch flex items-end justify-center rounded-[10px] border border-input p-1.5",
        className,
      )}
    >
      {label ? (
        <span className="font-mono text-[8px] text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}
