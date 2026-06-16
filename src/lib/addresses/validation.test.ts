import { describe, expect, it } from "vitest";
import { addressSchema } from "./validation";

const valid = {
  recipientName: "Aiko Tanaka",
  line1: "1-2-3 Shibuya",
  line2: "",
  city: "Tokyo",
  region: "",
  postalCode: "150-0002",
  country: "us",
  phone: "",
};

describe("addressSchema", () => {
  it("accepts a valid address and uppercases the country", () => {
    const result = addressSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe("US");
      expect(result.data.line2).toBeNull();
      expect(result.data.region).toBeNull();
      expect(result.data.phone).toBeNull();
    }
  });

  it("rejects missing required fields", () => {
    expect(addressSchema.safeParse({ ...valid, recipientName: "" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, line1: "  " }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, city: "" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, postalCode: "" }).success).toBe(false);
  });

  it("rejects unsupported countries", () => {
    expect(addressSchema.safeParse({ ...valid, country: "ZZ" }).success).toBe(false);
  });
});
