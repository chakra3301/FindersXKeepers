import { describe, expect, it } from "vitest";
import { addressToSnapshot } from "./types";
import type { Address } from "@/lib/db/types";

const row: Address = {
  id: "a1",
  user_id: "u1",
  recipient_name: "Aiko Tanaka",
  line1: "1-2-3 Shibuya",
  line2: null,
  city: "Tokyo",
  region: null,
  postal_code: "150-0002",
  country: "US",
  phone: null,
  is_default: true,
  created_at: "2026-06-16T00:00:00Z",
};

describe("addressToSnapshot", () => {
  it("drops id/user_id/is_default/created_at", () => {
    const snap = addressToSnapshot(row);
    expect(snap).toEqual({
      recipient_name: "Aiko Tanaka",
      line1: "1-2-3 Shibuya",
      line2: null,
      city: "Tokyo",
      region: null,
      postal_code: "150-0002",
      country: "US",
      phone: null,
    });
    expect("id" in snap).toBe(false);
  });
});
