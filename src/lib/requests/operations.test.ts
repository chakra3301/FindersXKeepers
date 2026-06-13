import { describe, expect, it } from "vitest";
import { depositForRequest } from "./operations";
import { computeQuote, totalJpy, SHIPPING_ESTIMATE_JPY } from "@/lib/pricing";

/* ---------- in-memory fake of the Supabase admin client ---------- */
type Row = Record<string, any>;
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
    const filters: [string, any][] = [];
    let inFilter: [string, any[]] | null = null;
    let limitN: number | null = null;

    const builder: any = {
      select() { wantReturn = true; return builder; },
      insert(p: Row) { op = "insert"; payload = p; return builder; },
      update(p: Row) { op = "update"; payload = p; return builder; },
      eq(col: string, val: any) { filters.push([col, val]); return builder; },
      in(col: string, vals: any[]) { inFilter = [col, vals]; return builder; },
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
          if (table === "orders") {
            row.total_jpy =
              row.item_cost_jpy + row.finder_fee_jpy + row.shipping_jpy + row.tax_jpy;
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
      then(resolve: (v: any) => void) {
        resolve(builder.run());
      },
    };
    return builder;
  }

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
