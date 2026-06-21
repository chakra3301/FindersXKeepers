/** Private bucket for listing, received, and reference proof images. */
export const PROOFS_BUCKET = "proofs";

export type ProofCategory = "reference" | "listing" | "received";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

/**
 * True when the stored value is already a renderable URL — an absolute
 * http(s) URL (seed, legacy) or a root-relative public asset like
 * `/inventory/foo.jpg` (in-stock claims). These never need signing.
 */
export function isExternalImageRef(ref: string): boolean {
  return (
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("/")
  );
}

/** Map a MIME type to a file extension for object paths. */
export function extensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      throw new Error(`Unsupported image type: ${mime}`);
  }
}

/** Infer extension from an uploaded filename, falling back to jpg. */
export function extensionFromFilename(filename: string): string {
  const part = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ALLOWED_EXTENSIONS.has(part)) {
    return part === "jpeg" ? "jpg" : part;
  }
  return "jpg";
}

/**
 * Build a storage object path under `requests/{requestId}/{category}/…`.
 * The caller supplies a unique filename segment (typically a UUID + ext).
 */
export function proofObjectPath(
  requestId: string,
  category: ProofCategory,
  filename: string,
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe) throw new Error("Invalid proof filename.");
  return `requests/${requestId}/${category}/${safe}`;
}

/** Allocate a new random object path for an upload. */
export function newProofObjectPath(
  requestId: string,
  category: ProofCategory,
  ext: string,
): string {
  const normalized = ext === "jpeg" ? "jpg" : ext.toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(normalized) && normalized !== "jpg") {
    throw new Error(`Unsupported extension: ${ext}`);
  }
  const id = crypto.randomUUID();
  return proofObjectPath(requestId, category, `${id}.${normalized}`);
}
