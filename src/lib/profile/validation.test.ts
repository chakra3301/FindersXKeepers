import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "./validation";

describe("updateProfileSchema", () => {
  it("accepts a valid country and currency", () => {
    const result = updateProfileSchema.safeParse({
      shippingCountry: "us",
      currencyPref: "USD",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shippingCountry).toBe("US");
      expect(result.data.currencyPref).toBe("USD");
    }
  });

  it("allows clearing shipping country", () => {
    const result = updateProfileSchema.safeParse({
      shippingCountry: "",
      currencyPref: "JPY",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.shippingCountry).toBeNull();
  });

  it("rejects unknown countries and currencies", () => {
    expect(
      updateProfileSchema.safeParse({
        shippingCountry: "ZZ",
        currencyPref: "USD",
      }).success,
    ).toBe(false);
    expect(
      updateProfileSchema.safeParse({
        shippingCountry: "US",
        currencyPref: "BTC",
      }).success,
    ).toBe(false);
  });
});
