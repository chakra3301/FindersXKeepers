import { describe, expect, it } from "vitest";
import { StubEscrowProvider } from "./stub";

describe("StubEscrowProvider.release", () => {
  it("captures the given amount and returns the remainder", async () => {
    const p = new StubEscrowProvider();
    const intent = await p.createHold({ requestId: "r1", amountJpy: 50_000 });
    const settled = await p.release(intent.paymentIntentId, 36_300);
    expect(settled.status).toBe("released");
    expect(settled.capturedJpy).toBe(36_300);
    expect(settled.refundedJpy).toBe(13_700);
  });

  it("defaults to a full capture when no amount is given", async () => {
    const p = new StubEscrowProvider();
    const intent = await p.createHold({ requestId: "r1", amountJpy: 50_000 });
    const settled = await p.release(intent.paymentIntentId);
    expect(settled.capturedJpy).toBe(50_000);
    expect(settled.refundedJpy).toBe(0);
  });

  it("never captures more than was held (clamps)", async () => {
    const p = new StubEscrowProvider();
    const intent = await p.createHold({ requestId: "r1", amountJpy: 10_000 });
    const settled = await p.release(intent.paymentIntentId, 999_999);
    expect(settled.capturedJpy).toBe(10_000);
    expect(settled.refundedJpy).toBe(0);
  });
});
