import { describe, expect, it } from "vitest";
import {
  depositForRequest,
  approveCandidate,
  keepHunting,
  shipApprovedOrder,
  releaseEscrow,
} from "./operations";
import { computeQuote, totalJpy, SHIPPING_ESTIMATE_JPY } from "@/lib/pricing";

/* ---------- in-memory fake of the Supabase admin client ---------- */
type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

function makeId(prefix: string, store: { n: number }) {
  store.n += 1;
  return `${prefix}_${store.n}`;
}

function createFakeAdmin(seed: Tables) {
  const tables: Tables = JSON.parse(JSON.stringify(seed));
  const counter = { n: 0 };

  function from(table: string) {
    tables[table] ??= [];
    let op: "select" | "insert" | "update" = "select";
    let payload: Row | null = null;
    let wantReturn = false;
    const filters: [string, unknown][] = [];
    let inFilter: [string, unknown[]] | null = null;
    let limitN: number | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- self-returning chainable query-builder fake; its recursive shape can't be statically typed without obscuring the harness
    const builder: any = {
      select() { wantReturn = true; return builder; },
      insert(p: Row) { op = "insert"; payload = p; return builder; },
      update(p: Row) { op = "update"; payload = p; return builder; },
      eq(col: string, val: unknown) { filters.push([col, val]); return builder; },
      in(col: string, vals: unknown[]) { inFilter = [col, vals]; return builder; },
      order() { return builder; },
      limit(n: number) { limitN = n; return builder; },
      match(rows: Row[]) {
        return rows.filter(
          (r) =>
            filters.every(([c, v]) => r[c] === v) &&
            (!inFilter || inFilter[1].includes(r[inFilter[0]])),
        );
      },
      run() {
        if (op === "insert") {
          const row: Row = {
            id: makeId(table.slice(0, 3), counter),
            created_at: new Date(2026, 0, 1 + counter.n).toISOString(),
            ...payload,
          };
          // Mirrors the generated total_jpy column in supabase/migrations/0001_init.sql.
          if (table === "orders") {
            row.total_jpy =
              (row.item_cost_jpy as number) +
              (row.finder_fee_jpy as number) +
              (row.shipping_jpy as number) +
              (row.tax_jpy as number);
          }
          tables[table].push(row);
          return { data: wantReturn ? row : null, error: null };
        }
        const matched = builder.match(tables[table]);
        if (op === "update") {
          matched.forEach((r: Row) => Object.assign(r, payload));
          return { data: null, error: null };
        }
        let rows = matched;
        if (limitN != null) rows = rows.slice(0, limitN);
        return { data: rows, error: null };
      },
      single() {
        const { data } = builder.run();
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return Promise.resolve({ data: null, error: { message: "not found" } });
        return Promise.resolve({ data: row, error: null });
      },
      maybeSingle() {
        const { data } = builder.run();
        const row = Array.isArray(data) ? (data[0] ?? null) : data;
        return Promise.resolve({ data: row, error: null });
      },
      // {data,error}-resolving thenable — never rejects; run() returns {data,error} rather than throwing.
      then(resolve: (v: unknown) => void) {
        resolve(builder.run());
      },
    };
    return builder;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the fake builder duck-types the AdminClient surface the operations use; full typing would mean reproducing supabase-js generics
  return { tables, client: { from } as any };
}

function baseRequest(over: Row = {}): Row {
  return {
    id: "req_seed",
    user_id: "u1",
    title: "Test request",
    status: "open",
    min_condition: "any",
    must_haves: [],
    nice_to_haves: [],
    budget_cap_jpy: 50_000,
    rush_tier: "standard",
    deadline_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

/* ---------------------------- tests ---------------------------- */
describe("depositForRequest", () => {
  it("creates a held payment sized to the cap estimate and moves open → sourcing", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ status: "open", budget_cap_jpy: 50_000 })],
      payments: [],
    });

    await depositForRequest("req_seed", "standard", client);

    const expected = totalJpy(
      computeQuote({ itemCostJpy: 50_000, shippingJpy: SHIPPING_ESTIMATE_JPY, rushTier: "standard" }),
    );
    expect(tables.requests[0].status).toBe("sourcing");
    expect(tables.payments).toHaveLength(1);
    expect(tables.payments[0].status).toBe("held");
    expect(tables.payments[0].amount_jpy).toBe(expected);
  });

  it("persists a changed rush tier before sizing the hold", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ status: "open", rush_tier: "standard" })],
      payments: [],
    });
    await depositForRequest("req_seed", "express", client);
    const expected = totalJpy(
      computeQuote({ itemCostJpy: 50_000, shippingJpy: SHIPPING_ESTIMATE_JPY, rushTier: "express" }),
    );
    expect(tables.requests[0].rush_tier).toBe("express");
    expect(tables.payments[0].amount_jpy).toBe(expected);
  });

  it("throws on any non-open request and writes nothing", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ status: "candidate_sent" })],
      payments: [],
    });
    await expect(depositForRequest("req_seed", "standard", client)).rejects.toThrow();
    expect(tables.payments).toHaveLength(0);
    expect(tables.requests[0].status).toBe("candidate_sent");
  });
});

describe("approveCandidate", () => {
  it("locks a four-line order ≤ the hold and moves candidate_sent → approved", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "candidate_sent", budget_cap_jpy: 50_000, rush_tier: "standard" })],
      candidates: [{ id: "c1", request_id: "r1", price_jpy: 33_500, status: "proposed", created_at: "2026-01-02T00:00:00Z" }],
      orders: [],
    });

    await approveCandidate("r1", "c1", client);

    const order = tables.orders[0];
    const hold = totalJpy(computeQuote({ itemCostJpy: 50_000, shippingJpy: SHIPPING_ESTIMATE_JPY, rushTier: "standard" }));
    const expectedOrder = computeQuote({ itemCostJpy: 33_500, shippingJpy: SHIPPING_ESTIMATE_JPY, rushTier: "standard" });

    expect(order.item_cost_jpy).toBe(33_500);
    expect(order.finder_fee_jpy).toBe(expectedOrder.finderFeeJpy);
    expect(order.shipping_jpy).toBe(SHIPPING_ESTIMATE_JPY);
    expect(order.tax_jpy).toBe(expectedOrder.taxJpy);
    expect(order.total_jpy).toBe(totalJpy(expectedOrder));
    expect(order.total_jpy).toBeLessThanOrEqual(hold);
    expect(order.candidate_id).toBe("c1");
    expect(tables.candidates[0].status).toBe("approved");
    expect(tables.requests[0].status).toBe("approved");
  });

  it("throws on a non-candidate_sent request and writes no order", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "open" })],
      candidates: [{ id: "c1", request_id: "r1", price_jpy: 10_000, status: "proposed", created_at: "2026-01-02T00:00:00Z" }],
      orders: [],
    });
    await expect(approveCandidate("r1", "c1", client)).rejects.toThrow();
    expect(tables.orders).toHaveLength(0);
    expect(tables.candidates[0].status).toBe("proposed");
  });

  it("rejects an over-cap candidate and writes no order", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "candidate_sent", budget_cap_jpy: 30_000, rush_tier: "standard" })],
      candidates: [{ id: "c1", request_id: "r1", price_jpy: 41_000, status: "proposed", created_at: "2026-01-02T00:00:00Z" }],
      orders: [],
    });
    await expect(approveCandidate("r1", "c1", client)).rejects.toThrow();
    expect(tables.orders).toHaveLength(0);
    expect(tables.candidates[0].status).toBe("proposed");
    expect(tables.requests[0].status).toBe("candidate_sent");
  });
});

describe("keepHunting", () => {
  it("rejects the candidate and moves candidate_sent → sourcing", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "candidate_sent" })],
      candidates: [{ id: "c1", request_id: "r1", price_jpy: 10_000, status: "proposed", created_at: "2026-01-02T00:00:00Z" }],
    });
    await keepHunting("r1", "c1", client);
    expect(tables.candidates[0].status).toBe("rejected");
    expect(tables.requests[0].status).toBe("sourcing");
  });

  it("throws on a non-candidate_sent request", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "sourcing" })],
      candidates: [{ id: "c1", request_id: "r1", price_jpy: 10_000, status: "proposed", created_at: "2026-01-02T00:00:00Z" }],
    });
    await expect(keepHunting("r1", "c1", client)).rejects.toThrow();
    expect(tables.candidates[0].status).toBe("proposed");
  });
});

describe("shipApprovedOrder", () => {
  it("settles at the order total: captures it, returns the unused cap, ships", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "received" })],
      orders: [{ id: "o1", request_id: "r1", item_cost_jpy: 14_500, finder_fee_jpy: 1_500, shipping_jpy: 4_000, tax_jpy: 150, total_jpy: 20_150, created_at: "2026-01-03T00:00:00Z" }],
      shipments: [],
      payments: [{ id: "p1", request_id: "r1", stripe_payment_intent_id: "pi_test_held", amount_jpy: 30_000, status: "held", created_at: "2026-01-02T00:00:00Z" }],
    });

    await shipApprovedOrder("r1", client);

    expect(tables.shipments).toHaveLength(1);
    expect(tables.shipments[0].tracking_number).toContain("DEMO-");
    expect(tables.requests[0].status).toBe("shipped");
    expect(tables.payments[0].status).toBe("released");
    expect(tables.payments[0].captured_jpy).toBe(20_150); // released to us
    expect(tables.payments[0].refunded_jpy).toBe(9_850);   // returned to the customer
  });

  it("throws on a non-received request and releases nothing", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "approved" })],
      orders: [{ id: "o1", request_id: "r1", item_cost_jpy: 1, finder_fee_jpy: 1, shipping_jpy: 1, tax_jpy: 1, total_jpy: 4, created_at: "2026-01-03T00:00:00Z" }],
      shipments: [],
      payments: [{ id: "p1", request_id: "r1", stripe_payment_intent_id: "pi_test_held2", amount_jpy: 4, status: "held", created_at: "2026-01-02T00:00:00Z" }],
    });
    await expect(shipApprovedOrder("r1", client)).rejects.toThrow();
    expect(tables.shipments).toHaveLength(0);
    expect(tables.payments[0].status).toBe("held");
  });

  it("returns zero when the order equals the hold", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "received" })],
      orders: [{ id: "o1", request_id: "r1", item_cost_jpy: 16_000, finder_fee_jpy: 1_600, shipping_jpy: 4_000, tax_jpy: 160, total_jpy: 21_760, created_at: "2026-01-03T00:00:00Z" }],
      shipments: [],
      payments: [{ id: "p1", request_id: "r1", stripe_payment_intent_id: "pi_eq", amount_jpy: 21_760, status: "held", created_at: "2026-01-02T00:00:00Z" }],
    });
    await shipApprovedOrder("r1", client);
    expect(tables.payments[0].captured_jpy).toBe(21_760);
    expect(tables.payments[0].refunded_jpy).toBe(0);
  });
});

describe("releaseEscrow", () => {
  it("defaults to a full release when no capture amount is given", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "received" })],
      payments: [{ id: "p1", request_id: "r1", stripe_payment_intent_id: "pi_full", amount_jpy: 5_000, status: "held", created_at: "2026-01-02T00:00:00Z" }],
    });
    await releaseEscrow("r1", undefined, client);
    expect(tables.payments[0].status).toBe("released");
    expect(tables.payments[0].captured_jpy).toBe(5_000);
    expect(tables.payments[0].refunded_jpy).toBe(0);
  });
});
