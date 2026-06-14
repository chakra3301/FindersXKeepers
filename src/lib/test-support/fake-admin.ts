/**
 * In-memory fake of the Supabase admin client for unit tests. Duck-types just
 * the chainable query-builder surface the operations + webhook layers use
 * (select / insert / update / eq / in / order / limit / single / maybeSingle),
 * backed by plain arrays so tests can assert on the resulting rows.
 *
 * Test-only: imported solely by *.test.ts files, never by app code.
 */
export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

function makeId(prefix: string, store: { n: number }) {
  store.n += 1;
  return `${prefix}_${store.n}`;
}

export function createFakeAdmin(seed: Tables) {
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
