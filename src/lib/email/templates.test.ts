import { describe, expect, it } from "vitest";
import {
  paymentConfirmedEmail,
  itemShippedEmail,
  refundIssuedEmail,
} from "./templates";

const URL = "https://app.test/requests/r1";

describe("paymentConfirmedEmail", () => {
  it("names the request and shows the held amount in both bodies", () => {
    const m = paymentConfirmedEmail({
      requestTitle: "Grand Seiko SBGA211",
      amountJpy: 52_000,
      requestUrl: URL,
    });
    expect(m.subject).toContain("Grand Seiko SBGA211");
    expect(m.html).toContain("52,000");
    expect(m.html).toContain(URL);
    expect(m.text).toContain("52,000");
    expect(m.text).toContain(URL);
  });
});

describe("itemShippedEmail", () => {
  it("includes carrier and tracking number", () => {
    const m = itemShippedEmail({
      requestTitle: "Kapital Boro jacket",
      carrier: "EMS",
      trackingNumber: "EE123456789JP",
      requestUrl: URL,
    });
    expect(m.subject).toContain("Kapital Boro jacket");
    expect(m.html).toContain("EMS");
    expect(m.html).toContain("EE123456789JP");
    expect(m.text).toContain("EE123456789JP");
  });
});

describe("refundIssuedEmail", () => {
  it("shows the refunded amount", () => {
    const m = refundIssuedEmail({
      requestTitle: "Onitsuka Tiger Mexico 66",
      refundedJpy: 18_500,
      requestUrl: URL,
    });
    expect(m.subject).toContain("Refund issued");
    expect(m.html).toContain("18,500");
    expect(m.text).toContain("18,500");
  });
});
