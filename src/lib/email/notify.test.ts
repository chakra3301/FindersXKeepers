import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeAdmin, type Tables, type Users } from "@/lib/test-support/fake-admin";
import { email } from "./index";
import {
  notifyPaymentConfirmed,
  notifyItemShipped,
  notifyRefundIssued,
} from "./notify";

const USERS: Users = { u1: { email: "buyer@example.com" } };

function seed(extra: Tables = {}): Tables {
  return {
    requests: [{ id: "r1", user_id: "u1", title: "Grand Seiko", status: "received" }],
    payments: [
      { id: "p1", request_id: "r1", amount_jpy: 52_000, status: "held", created_at: "2026-01-01T00:00:00Z" },
    ],
    profiles: [{ id: "u1", notify_shipped: true }],
    orders: [{ id: "o1", request_id: "r1" }],
    shipments: [
      { id: "s1", order_id: "o1", carrier: "EMS", tracking_number: "EE1JP", created_at: "2026-01-02T00:00:00Z" },
    ],
    ...extra,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("notifyPaymentConfirmed", () => {
  it("sends a receipt when recipient and payment exist (always, no preference gate)", async () => {
    const send = vi.spyOn(email, "send").mockResolvedValue();
    const { client } = createFakeAdmin(seed(), USERS);
    await notifyPaymentConfirmed("r1", client);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].to).toBe("buyer@example.com");
  });

  it("skips silently when the user has no email", async () => {
    const send = vi.spyOn(email, "send").mockResolvedValue();
    const { client } = createFakeAdmin(seed(), {});
    await notifyPaymentConfirmed("r1", client);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("notifyItemShipped", () => {
  it("sends with carrier + tracking when notify_shipped is on", async () => {
    const send = vi.spyOn(email, "send").mockResolvedValue();
    const { client } = createFakeAdmin(seed(), USERS);
    await notifyItemShipped("r1", client);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].html).toContain("EE1JP");
  });

  it("does NOT send when notify_shipped is off", async () => {
    const send = vi.spyOn(email, "send").mockResolvedValue();
    const { client } = createFakeAdmin(
      seed({ profiles: [{ id: "u1", notify_shipped: false }] }),
      USERS,
    );
    await notifyItemShipped("r1", client);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("notifyRefundIssued", () => {
  it("sends regardless of preferences (financial)", async () => {
    const send = vi.spyOn(email, "send").mockResolvedValue();
    const { client } = createFakeAdmin(
      seed({ profiles: [{ id: "u1", notify_shipped: false }] }),
      USERS,
    );
    await notifyRefundIssued("r1", client);
    expect(send).toHaveBeenCalledOnce();
  });
});
