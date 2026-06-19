const AVATARS_BUCKET = "avatars";

/** Turn a stored avatar path (or legacy full URL) into a browser-ready public URL. */
export function resolveAvatarUrl(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null;
  const value = stored.trim();

  if (value.startsWith("http://") || value.startsWith("https://")) {
    // Legacy rows saved the full URL — repair the common missing /public/ segment.
    return value.replace(
      /\/storage\/v1\/object\/avatars\//,
      "/storage/v1/object/public/avatars/",
    );
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${AVATARS_BUCKET}/${value}`;
}
