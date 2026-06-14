import type { ProofCategory } from "./paths";

export interface UploadProofParams {
  requestId: string;
  category: ProofCategory;
  /** Raw file bytes. */
  body: ArrayBuffer;
  contentType: string;
  /** Original filename — used only to infer extension when MIME is generic. */
  filename?: string;
}

export interface StorageProvider {
  readonly name: string;
  /** Upload and return the object path stored in the DB. */
  uploadProof(params: UploadProofParams): Promise<string>;
  /** Turn a stored object path into a time-limited signed URL. */
  signProofPath(path: string, expiresInSeconds?: number): Promise<string>;
}

export const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export const ALLOWED_PROOF_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedProofMime = (typeof ALLOWED_PROOF_MIMES)[number];

export function assertAllowedProofFile(
  sizeBytes: number,
  contentType: string,
): void {
  if (sizeBytes <= 0) throw new Error("Image file is empty.");
  if (sizeBytes > MAX_PROOF_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }
  if (!ALLOWED_PROOF_MIMES.includes(contentType as AllowedProofMime)) {
    throw new Error("Image must be JPEG, PNG, WebP, or GIF.");
  }
}
