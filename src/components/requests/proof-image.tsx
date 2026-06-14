import { cn } from "@/lib/utils";
import { PlaceholderThumb } from "@/components/ui/placeholder-thumb";

/** Render one proof image with a placeholder fallback. */
export function ProofImage({
  src,
  alt = "",
  className,
  label = "photo",
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  label?: string;
}) {
  if (!src) {
    return <PlaceholderThumb label={label} className={className} />;
  }

  return (
    // Signed Supabase URLs and seed placeholders — avoid next/image domain config.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("rounded-lg border border-border object-cover", className)}
      loading="lazy"
    />
  );
}

/** Grid of proof images; pads with placeholders when fewer than `minSlots`. */
export function ProofGallery({
  urls,
  className,
  itemClassName,
  minSlots = 0,
  labels = [],
}: {
  urls: string[];
  className?: string;
  itemClassName?: string;
  minSlots?: number;
  labels?: string[];
}) {
  const count = Math.max(urls.length, minSlots);
  if (count === 0) return null;

  return (
    <div className={cn("grid gap-2.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ProofImage
          key={urls[i] ?? `slot-${i}`}
          src={urls[i]}
          label={labels[i] ?? `photo ${i + 1}`}
          className={itemClassName}
        />
      ))}
    </div>
  );
}
