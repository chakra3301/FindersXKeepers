import "server-only";

import { isExternalImageRef } from "./paths";
import { SupabaseStorageProvider } from "./supabase";
import type { StorageProvider } from "./types";

export type {
  StorageProvider,
  UploadProofParams,
  AllowedProofMime,
} from "./types";
export {
  assertAllowedProofFile,
  MAX_PROOF_BYTES,
  ALLOWED_PROOF_MIMES,
} from "./types";
export {
  PROOFS_BUCKET,
  isExternalImageRef,
  newProofObjectPath,
  proofObjectPath,
  extensionFromMime,
  extensionFromFilename,
} from "./paths";
export type { ProofCategory } from "./paths";

function createStorageProvider(): StorageProvider {
  return new SupabaseStorageProvider();
}

const globalForStorage = globalThis as unknown as {
  __fkStorage?: StorageProvider;
};

/** Singleton storage provider — swap implementation here if needed. */
export const storage: StorageProvider =
  globalForStorage.__fkStorage ?? createStorageProvider();

if (process.env.NODE_ENV !== "production") {
  globalForStorage.__fkStorage = storage;
}

/** Resolve one DB ref (external URL or storage path) to a renderable URL. */
export async function resolveImageRef(ref: string): Promise<string> {
  if (!ref || isExternalImageRef(ref)) return ref;
  return storage.signProofPath(ref);
}

/** Resolve many refs in parallel; drops empty strings. */
export async function resolveImageRefs(refs: string[]): Promise<string[]> {
  const filtered = refs.filter(Boolean);
  return Promise.all(filtered.map(resolveImageRef));
}

/** Upload a browser File via the storage seam; returns the object path. */
export async function uploadProofFile(
  requestId: string,
  category: Parameters<StorageProvider["uploadProof"]>[0]["category"],
  file: File,
): Promise<string> {
  const body = await file.arrayBuffer();
  return storage.uploadProof({
    requestId,
    category,
    body,
    contentType: file.type,
    filename: file.name,
  });
}

/** Collect valid image files from a FormData field (supports multi-file). */
export function proofFilesFromFormData(
  formData: FormData,
  fieldName: string,
): File[] {
  const entries = formData.getAll(fieldName);
  return entries.filter((e): e is File => e instanceof File && e.size > 0);
}

/** Upload every file in a FormData field; returns object paths. */
export async function uploadProofFilesFromFormData(
  requestId: string,
  category: Parameters<StorageProvider["uploadProof"]>[0]["category"],
  formData: FormData,
  fieldName: string,
): Promise<string[]> {
  const files = proofFilesFromFormData(formData, fieldName);
  return Promise.all(
    files.map((file) => uploadProofFile(requestId, category, file)),
  );
}
