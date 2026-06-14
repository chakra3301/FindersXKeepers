import { describe, expect, it } from "vitest";
import { readStripeEnv } from "./stripe-env";

describe("readStripeEnv", () => {
  it("returns the keys when both are present", () => {
    expect(
      readStripeEnv({
        STRIPE_SECRET_KEY: "sk_test_x",
        STRIPE_WEBHOOK_SECRET: "whsec_x",
      }),
    ).toEqual({ secretKey: "sk_test_x", webhookSecret: "whsec_x" });
  });

  it("throws listing the secret key when it is missing", () => {
    expect(() =>
      readStripeEnv({ STRIPE_WEBHOOK_SECRET: "whsec_x" }),
    ).toThrow(/STRIPE_SECRET_KEY/);
  });

  it("throws listing the webhook secret when it is missing", () => {
    expect(() =>
      readStripeEnv({ STRIPE_SECRET_KEY: "sk_test_x" }),
    ).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  it("lists every missing var at once on an empty env", () => {
    expect(() => readStripeEnv({})).toThrow(
      /STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET/,
    );
  });
});
