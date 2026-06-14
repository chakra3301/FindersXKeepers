import { describe, expect, it } from "vitest";
import { MAX_MESSAGE_LENGTH, parseMessageBody } from "./message-validation";

describe("parseMessageBody", () => {
  it("trims and accepts non-empty text", () => {
    expect(parseMessageBody("  hello  ")).toBe("hello");
  });

  it("rejects empty messages", () => {
    expect(() => parseMessageBody("   ")).toThrow(/empty/i);
  });

  it("rejects over-length messages", () => {
    expect(() => parseMessageBody("x".repeat(MAX_MESSAGE_LENGTH + 1))).toThrow(
      /characters/i,
    );
  });
});
