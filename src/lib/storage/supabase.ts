import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  extensionFromFilename,
  extensionFromMime,
  newProofObjectPath,
  PROOFS_BUCKET,
} from "./paths";
import type { StorageProvider, UploadProofParams } from "./types";
import { assertAllowedProofFile } from "./types";

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase";

  async uploadProof(params: UploadProofParams): Promise<string> {
    assertAllowedProofFile(params.body.byteLength, params.contentType);

    let ext: string;
    try {
      ext = extensionFromMime(params.contentType);
    } catch {
      ext = extensionFromFilename(params.filename ?? "upload.jpg");
    }

    const path = newProofObjectPath(params.requestId, params.category, ext);
    const admin = createAdminClient();

    const { error } = await admin.storage.from(PROOFS_BUCKET).upload(path, params.body, {
      contentType: params.contentType,
      upsert: false,
    });
    if (error) throw error;
    return path;
  }

  async signProofPath(path: string, expiresInSeconds = 3600): Promise<string> {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(PROOFS_BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
      throw error ?? new Error(`Could not sign storage path: ${path}`);
    }
    return data.signedUrl;
  }
}
