import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveAvatarUrl } from "./avatar";

describe("resolveAvatarUrl", () => {
  const prev = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://example.supabase.co";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = prev;
  });

  it("returns null for empty values", () => {
    expect(resolveAvatarUrl(null)).toBeNull();
    expect(resolveAvatarUrl("")).toBeNull();
  });

  it("builds a public URL from a storage path", () => {
    expect(
      resolveAvatarUrl("user-id/avatar-123.png"),
    ).toBe(
      "https://example.supabase.co/storage/v1/object/public/avatars/user-id/avatar-123.png",
    );
  });

  it("repairs legacy URLs missing the public segment", () => {
    expect(
      resolveAvatarUrl(
        "https://example.supabase.co/storage/v1/object/avatars/user-id/avatar-123.png",
      ),
    ).toBe(
      "https://example.supabase.co/storage/v1/object/public/avatars/user-id/avatar-123.png",
    );
  });
});
