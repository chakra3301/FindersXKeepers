import { describe, expect, it } from "vitest";
import {
  extensionFromFilename,
  extensionFromMime,
  isExternalImageRef,
  newProofObjectPath,
  proofObjectPath,
} from "./paths";

describe("isExternalImageRef", () => {
  it("detects http(s) URLs", () => {
    expect(isExternalImageRef("https://example.com/a.jpg")).toBe(true);
    expect(isExternalImageRef("http://x.com/b.png")).toBe(true);
  });

  it("treats storage paths as internal", () => {
    expect(
      isExternalImageRef("requests/abc/listing/00000000-0000-0000-0000-000000000001.jpg"),
    ).toBe(false);
  });
});

describe("proofObjectPath", () => {
  it("builds a namespaced path", () => {
    expect(proofObjectPath("req-1", "listing", "photo.jpg")).toBe(
      "requests/req-1/listing/photo.jpg",
    );
  });

  it("allocates random paths under the request folder", () => {
    const p = newProofObjectPath("req-2", "received", "png");
    expect(p).toMatch(/^requests\/req-2\/received\/[0-9a-f-]+\.png$/);
  });
});

describe("extensionFromMime", () => {
  it("maps known image types", () => {
    expect(extensionFromMime("image/jpeg")).toBe("jpg");
    expect(extensionFromMime("image/png")).toBe("png");
  });

  it("rejects unknown types", () => {
    expect(() => extensionFromMime("application/pdf")).toThrow();
  });
});

describe("extensionFromFilename", () => {
  it("reads the extension from a filename", () => {
    expect(extensionFromFilename("proof.PNG")).toBe("png");
    expect(extensionFromFilename("noext")).toBe("jpg");
  });
});
