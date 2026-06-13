import { describe, expect, it } from "vitest";
import {
  railProgress,
  escrowCaption,
  deadlineChip,
  conditionLabel,
} from "./display";

describe("railProgress", () => {
  it("fills segments up to and including the current happy-path status", () => {
    const p = railProgress("candidate_sent"); // index 2 of 8
    expect(p.total).toBe(8);
    expect(p.filled).toBe(3);
    expect(p.tone).toBe("primary");
  });
  it("uses success tone at released and fills all", () => {
    const p = railProgress("released");
    expect(p.filled).toBe(8);
    expect(p.tone).toBe("success");
  });
  it("treats off-rail (refunded/cancelled) as muted, zero fill", () => {
    expect(railProgress("refunded")).toMatchObject({ filled: 0, tone: "muted" });
    expect(railProgress("cancelled")).toMatchObject({ filled: 0, tone: "muted" });
  });
});

describe("escrowCaption", () => {
  it("reads 'Held in escrow' while active", () => {
    expect(escrowCaption("sourcing")).toBe("Held in escrow");
  });
  it("reads 'Held · releasing' once shipped", () => {
    expect(escrowCaption("shipped")).toBe("Held · releasing");
  });
  it("reads 'Released' once released", () => {
    expect(escrowCaption("released")).toBe("Released");
  });
  it("reads 'Refunding to you' when refunded", () => {
    expect(escrowCaption("refunded")).toBe("Refunding to you");
  });
});

describe("deadlineChip", () => {
  const now = new Date("2026-06-13T00:00:00Z");
  it("returns null when no deadline", () => {
    expect(deadlineChip(null, "sourcing", now)).toBeNull();
  });
  it("flags urgent (<=4 days) with warning tone", () => {
    const due = new Date("2026-06-16T00:00:00Z").toISOString();
    expect(deadlineChip(due, "sourcing", now)).toMatchObject({
      label: "3 days left",
      tone: "warning",
    });
  });
  it("uses neutral tone when comfortably ahead", () => {
    const due = new Date("2026-06-25T00:00:00Z").toISOString();
    expect(deadlineChip(due, "sourcing", now)).toMatchObject({ tone: "neutral" });
  });
  it("returns null for terminal statuses", () => {
    const due = new Date("2026-06-16T00:00:00Z").toISOString();
    expect(deadlineChip(due, "released", now)).toBeNull();
  });
});

describe("conditionLabel", () => {
  it("maps enum to display text", () => {
    expect(conditionLabel("like_new")).toBe("Like new");
    expect(conditionLabel("any")).toBe("Any condition");
  });
});
