# Plan 2 — Design Build-Out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Two more required skills (user-mandated for this build):**
> - **superpowers:test-driven-development** — for every Section 2 operation and every new query/util (test first, watch it fail, implement, watch it pass).
> - **frontend-design** — invoke BEFORE building each screen/component task (the tasks marked 🎨). Match the locked prototype `design/handoff/Finders Keepers.dc.html` and the existing design tokens in `src/app/globals.css`. The JSX in this plan is the correct **data wiring + honesty copy**; frontend-design refines the visual layer against the prototype. Do not invent new tokens or dependencies.

**Goal:** Build the remaining designed screens (public landing, checkout, candidate approval, item-received, messages, order history, account) wired to the real state machine + existing stub seams, with four thin escrow/lifecycle operations and tests — every flip through `assertTransition`, every stub honestly labeled.

**Architecture:** Server Components read via `src/lib/requests/queries.ts` (RLS-scoped, no `admin`). Mutations are server actions that delegate to four new orchestration functions in `src/lib/requests/operations.ts`, which compose the existing primitives (`createEscrowHold`, `releaseEscrow`, `recordShipment`, `setRequestStatus`). Money moves exactly once, at checkout, sized to the budget cap (a four-line estimate). The four operations are tested end-to-end against an in-memory fake of the admin client plus the real in-memory escrow stub.

**Tech Stack:** Next.js 16 (App Router) + TypeScript strict · Tailwind v4 + shadcn/ui (base-nova → `@base-ui/react`; link-styled buttons use `buttonVariants()` on `<Link>`, never `asChild`) · Supabase (RLS) · Vitest · existing stub escrow (`src/lib/escrow`). **No new dependencies.**

---

## Locked technical decisions (read before starting)

1. **`SHIPPING_ESTIMATE_JPY`** lives in `src/lib/pricing.ts` (pure, importable by both server ops and server-component pages, so the displayed estimate and the actual hold are built from the *same* inputs and always agree). Flagged-stub comment required.
2. **The hold = `computeQuote({ itemCostJpy: budget_cap_jpy, shippingJpy: SHIPPING_ESTIMATE_JPY, rushTier })`.** The real order = same call but `itemCostJpy: candidate.price_jpy`. Because the finder fee is monotonic in item cost and tax monotonic in fee (and shipping is the same estimate in both), `price ≤ cap ⟹ orderTotal ≤ hold`. This is what the approveCandidate test asserts.
3. **Assert-then-write.** Every new operation loads the request and asserts transition legality **before** any DB write or escrow call, so an illegal `from` state throws with **zero side effects** (no orphan orders, no escrow released-then-thrown). `depositForRequest` guards `status === "open"` explicitly (because `sourcing` is reachable from several states, plain `assertTransition` would let `candidate_sent → sourcing` through and double-charge).
4. **The escrow singleton IS the stub under test.** `@/lib/escrow` returns `StubEscrowProvider` whenever `ESCROW_PROVIDER` is unset (true under Vitest). Tests inject a fake **admin client** but use the **real** `escrow` singleton — so the orchestrations run genuinely end-to-end. Each `createHold` mints a unique intent id, so the stub's process-global map never collides across tests.
5. **Local-currency display is an indicative static-rate helper** (`src/lib/currency.ts`), clearly labeled "≈ … (indicative)". No live FX — that's a later phase. This is honest, not hidden.
6. **Demo tracking number** in `shipApprovedOrder`: `DEMO-<first 8 of orderId>`, surfaced in UI as a simulated value. It's the only way "Approve & ship" can fire the real release without an operator/carrier integration. Release still hangs off a tracking number.
7. **All status flips go through `setRequestStatus` → `assertTransition`.** Never write `requests.status` directly anywhere.

---

## File structure

**New files:**
- `src/lib/currency.ts` — indicative JPY→local formatter (+ `src/lib/currency.test.ts`)
- `src/lib/requests/operations.test.ts` — the four-operation harness + tests (fake admin client co-located here)
- `src/app/page.tsx` — **rewritten** from a redirect into the public landing (Server Component)
- `src/components/marketing/` — landing sections (`hero.tsx`, `how-it-works.tsx`, `escrow-band.tsx`, `recent-finds.tsx`, `final-cta.tsx`) 🎨
- `src/app/(app)/requests/[id]/checkout/page.tsx` + `actions.ts` + `checkout-form.tsx` 🎨
- `src/app/(app)/requests/[id]/candidate/page.tsx` + `actions.ts` + `candidate-actions.tsx` 🎨
- `src/app/(app)/requests/[id]/received/page.tsx` + `actions.ts` + `received-form.tsx` 🎨
- `src/app/(app)/messages/page.tsx` + `messages-view.tsx` 🎨
- `src/app/(app)/history/page.tsx` 🎨
- `src/app/(app)/account/page.tsx` 🎨

**Modified files:**
- `src/lib/pricing.ts` — add `SHIPPING_ESTIMATE_JPY`
- `src/lib/requests/operations.ts` — add 4 operations
- `src/lib/requests/queries.ts` — add `getMessageThreads`, `getThreadMessages`, `getOrderHistory`
- `src/app/layout.tsx` — `metadata.title` wordmark
- `src/app/(app)/requests/new/page.tsx`, `dashboard/page.tsx`, `login/page.tsx`, `legal/tokushoho/page.tsx`, `components/brand/logo.tsx` — wordmark
- `src/app/(app)/requests/new/actions.ts` — redirect target → `/checkout`
- `src/components/layout/sidebar.tsx` — nav rows
- `src/components/dashboard/request-card.tsx` — action CTA routing
- `src/app/(app)/requests/[id]/page.tsx` — "Deposit into escrow" CTA + sub-route links

---

# Phase A — Foundation

## Task A1: Indicative local-currency helper

**Files:**
- Create: `src/lib/currency.ts`
- Test: `src/lib/currency.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/currency.test.ts
import { describe, expect, it } from "vitest";
import { formatLocalApprox, SUPPORTED_CURRENCIES } from "./currency";

describe("formatLocalApprox", () => {
  it("returns null for JPY (no second line needed)", () => {
    expect(formatLocalApprox(10_000, "JPY")).toBeNull();
  });
  it("returns null for an unknown currency code", () => {
    expect(formatLocalApprox(10_000, "ZZZ")).toBeNull();
  });
  it("formats a known currency with the ≈ / indicative markers", () => {
    const out = formatLocalApprox(10_000, "USD");
    expect(out).toContain("≈");
    expect(out).toContain("$");
    expect(out).toContain("indicative");
  });
  it("exposes the supported set", () => {
    expect(SUPPORTED_CURRENCIES).toContain("USD");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/currency.test.ts`
Expected: FAIL — "Failed to resolve import ./currency".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/currency.ts
/**
 * INDICATIVE local-currency display only. Rates are a static snapshot, NOT a
 * live FX feed — every output is marked "≈ … (indicative)" so we never imply a
 * settled local-currency amount. Real FX + locale-aware checkout is a later
 * phase. Source of truth for what the customer pays remains JPY.
 */
const RATES_PER_JPY: Record<string, { symbol: string; rate: number }> = {
  USD: { symbol: "$", rate: 0.0064 },
  EUR: { symbol: "€", rate: 0.0059 },
  GBP: { symbol: "£", rate: 0.0050 },
  AUD: { symbol: "A$", rate: 0.0098 },
  CAD: { symbol: "C$", rate: 0.0088 },
  SGD: { symbol: "S$", rate: 0.0086 },
};

export const SUPPORTED_CURRENCIES = Object.keys(RATES_PER_JPY);

export function formatLocalApprox(
  amountJpy: number | null | undefined,
  currencyPref: string | null | undefined,
): string | null {
  if (amountJpy == null) return null;
  const code = (currencyPref ?? "").toUpperCase();
  if (code === "JPY" || !RATES_PER_JPY[code]) return null;
  const { symbol, rate } = RATES_PER_JPY[code];
  const local = Math.round(amountJpy * rate);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(local);
  return `≈ ${symbol}${formatted} ${code} (indicative)`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/currency.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/currency.ts src/lib/currency.test.ts
git commit -m "feat(currency): indicative local-currency display helper"
```

## Task A2: Brand wordmark cleanup (drop the ×)

**Files (user-facing strings only — leave CLAUDE.md / docs / globals.css comment as-is):**
- Modify: `src/app/layout.tsx:19`
- Modify: `src/app/(app)/requests/new/page.tsx:3`
- Modify: `src/app/(app)/dashboard/page.tsx:11`
- Modify: `src/app/legal/tokushoho/page.tsx:6` and `:93`
- Modify: `src/app/login/page.tsx:8` and the side-panel block (~`:42-51`)
- Modify: `src/components/brand/logo.tsx:4` (comment — optional) — the wordmark text is already "Finders Keepers"; no change to the rendered string needed there.

- [ ] **Step 1: Normalize the metadata titles**

In `src/app/layout.tsx:19`:
```ts
  title: "Finders Keepers — sourced from Japan, held in escrow",
```
In `src/app/(app)/requests/new/page.tsx:3`:
```ts
export const metadata = { title: "New request — Finders Keepers" };
```
In `src/app/(app)/dashboard/page.tsx:11`:
```ts
export const metadata = { title: "Dashboard — Finders Keepers" };
```
In `src/app/legal/tokushoho/page.tsx:6`:
```ts
  title: "特定商取引法に基づく表記 — Finders Keepers",
```
In `src/app/legal/tokushoho/page.tsx:93`, change the body sentence start:
```tsx
          Finders Keepers operates as a sourcing <em>agent</em> — purchasing on
```
In `src/app/login/page.tsx:8`:
```ts
  title: "Sign in — Finders Keepers",
```

- [ ] **Step 2: Fix the login side-panel wordmark**

In `src/app/login/page.tsx` (~lines 48-50), replace the interpolated × wordmark:
```tsx
    <span className="font-sans text-[15px] font-medium tracking-tight">
      Finders Keepers
    </span>
```
(Remove the `<span className="opacity-70">×</span>` element.)

- [ ] **Step 3: Verify no user-facing × remains**

Run: `grep -rn "Finders × Keepers" src/`
Expected: only `src/app/globals.css` (a CSS comment) and `src/components/brand/logo.tsx` (a code comment) may remain — both non-user-facing; everything else gone.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx "src/app/(app)/requests/new/page.tsx" "src/app/(app)/dashboard/page.tsx" src/app/legal/tokushoho/page.tsx src/app/login/page.tsx
git commit -m "chore(brand): drop the × from user-facing wordmark"
```

## Task A3: Routing split — `/` becomes public, post-create routes to checkout

**Files:**
- Modify: `src/lib/supabase/middleware.ts` (confirm `/` public; no authed redirect off `/`)
- Modify: `src/app/(app)/requests/new/actions.ts:123` (redirect target)

> Note: `src/app/page.tsx` is rewritten into the landing in Task A4. This task only confirms middleware + fixes the post-create redirect so the wizard's final button lands on checkout.

- [ ] **Step 1: Confirm middleware leaves `/` public with no authed redirect**

In `src/lib/supabase/middleware.ts`, verify lines 43-62. `pathname === "/"` is already in `isPublic`. There is **no** rule redirecting signed-in users away from `/` (only away from `/login`). No change required — but confirm by reading. If any `pathname === "/"` → `/dashboard` redirect exists, remove it.

- [ ] **Step 2: Reroute the post-create redirect to checkout**

In `src/app/(app)/requests/new/actions.ts`, change the final redirect (currently `redirect(\`/requests/${data.id}\`)`):
```ts
  revalidatePath("/dashboard");
  redirect(`/requests/${data.id}/checkout`);
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean (checkout route created in Task B5; redirect string is untyped so this is fine now, but the route must exist before the dev walkthrough in Phase D).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/requests/new/actions.ts" src/lib/supabase/middleware.ts
git commit -m "feat(routing): post-create wizard routes to escrow checkout"
```

## Task A4: Public landing page (`/`) 🎨

**Files:**
- Rewrite: `src/app/page.tsx`
- Create: `src/components/marketing/hero.tsx`, `how-it-works.tsx`, `escrow-band.tsx`, `recent-finds.tsx`, `final-cta.tsx`

> 🎨 **Invoke frontend-design first.** Open `design/handoff/Finders Keepers.dc.html`, find the marketing/landing sections, and match them. The skeleton below locks the **section order, data honesty, and CTAs**; frontend-design owns the visual fidelity. The landing lives **outside** `(app)`, so it renders root layout + global `Footer` (特商法 link present for free) with no sidebar/topbar.

- [ ] **Step 1: Build the escrow band with a REAL computed four-line example**

```tsx
// src/components/marketing/escrow-band.tsx
import { computeQuote, totalJpy, formatJpy, SHIPPING_ESTIMATE_JPY } from "@/lib/pricing";

// Illustrative example built from the real pricing engine (NOT hardcoded numbers),
// so the landing can never drift from how we actually price.
const EXAMPLE_ITEM_JPY = 42_000;

export function EscrowBand() {
  const quote = computeQuote({
    itemCostJpy: EXAMPLE_ITEM_JPY,
    shippingJpy: SHIPPING_ESTIMATE_JPY,
    rushTier: "standard",
  });
  const lines = [
    { label: "Item cost", note: "Pass-through", value: quote.itemCostJpy },
    { label: "Finder's fee", note: "Our service fee", value: quote.finderFeeJpy },
    { label: "Shipping", note: "Japan → you", value: quote.shippingJpy },
    { label: "Tax", note: "Consumption tax", value: quote.taxJpy },
  ];
  return (
    <section className="bg-foreground text-background">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">
          Held in escrow, released only when it ships
        </h2>
        <p className="mt-2 max-w-xl text-sm text-background/70">
          Four separate lines, always. You see exactly what you pay — item cost
          is pass-through, our finder&apos;s fee is disclosed, and funds release
          to us only once your item is in transit.
        </p>
        <dl className="mt-8 max-w-md rounded-2xl bg-background/5 p-5 ring-1 ring-background/10">
          {lines.map((l) => (
            <div key={l.label} className="flex items-baseline justify-between border-b border-background/10 py-2.5">
              <dt className="flex flex-col">
                <span className="text-sm">{l.label}</span>
                <span className="text-[11px] text-background/50">{l.note}</span>
              </dt>
              <dd className="tnum text-sm font-medium">{formatJpy(l.value)}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between pt-3">
            <span className="text-sm font-semibold">Total held in escrow</span>
            <span className="tnum text-lg font-semibold">{formatJpy(totalJpy(quote))}</span>
          </div>
        </dl>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Build hero, how-it-works, recent-finds, final-cta**

`hero.tsx` — headline + subcopy + proof card; primary CTA `buttonVariants()` on `<Link href="/requests/new">`, secondary `<Link href="/login">`.
`how-it-works.tsx` — 3 steps (Post a request → We source + send proof → Ship on approval, escrow releases).
`recent-finds.tsx` — a **small static curated array** in-module; lead the file with a comment:
```tsx
// Illustrative showcase only — a curated static array, NOT a DB query. Real
// "recent finds" would come from released requests once we have volume.
const RECENT_FINDS = [
  { title: "Seiko 'Pepsi' SKX009K diver, boxed", note: "Sourced from Osaka" },
  { title: "Comme des Garçons AW'90s wool tailoring", note: "Tokyo archive" },
  { title: "Onitsuka Tiger Mexico 66, deadstock", note: "New, original box" },
];
```
`final-cta.tsx` — closing CTA → `/requests/new`.

Use `PlaceholderThumb` for any image slots. All link-styled buttons: `className={buttonVariants({ ... })}` on `<Link>`.

- [ ] **Step 3: Compose the landing page**

```tsx
// src/app/page.tsx
import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { EscrowBand } from "@/components/marketing/escrow-band";
import { RecentFinds } from "@/components/marketing/recent-finds";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: "Finders Keepers — sourced from Japan, held in escrow",
};

// Public landing. Lives outside the (app) group, so it renders the root layout
// (+ global Footer with the 特商法 link) and NO sidebar/topbar. Both anonymous
// and signed-in visitors see this — the sidebar's "View public site" link works.
export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <EscrowBand />
      <RecentFinds />
      <FinalCta />
    </>
  );
}
```

- [ ] **Step 4: Build + visual check**

Run: `npm run build` → expected clean.
Run: `npm run dev`, open `/` while signed out **and** signed in. Expected: landing renders both times (no redirect), footer 特商法 link present, CTAs route correctly, escrow band totals match `computeQuote`.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/marketing/
git commit -m "feat(landing): public marketing page with real computed escrow example"
```

---

# Phase B — Money spine

## Task B1: `SHIPPING_ESTIMATE_JPY` constant

**Files:**
- Modify: `src/lib/pricing.ts`

- [ ] **Step 1: Add the flagged constant**

Append to `src/lib/pricing.ts`:
```ts
/**
 * FLAGGED STUB. Pre-sourcing we cannot know real Japan→customer shipping, so the
 * escrow hold and the displayed estimate are both sized with this single
 * constant (shown to the customer as "estimated"). The hold covers it; the real
 * figure is reconciled when an order is locked. Real shipping quotes are a later
 * phase. Both the checkout page and `depositForRequest` import THIS so the
 * displayed estimate and the actual hold are always built from the same input.
 */
export const SHIPPING_ESTIMATE_JPY = 4_000;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pricing.ts
git commit -m "feat(pricing): add flagged SHIPPING_ESTIMATE_JPY constant"
```

## Task B2: Operations test harness + `depositForRequest` (TDD)

**Files:**
- Create: `src/lib/requests/operations.test.ts`
- Modify: `src/lib/requests/operations.ts`

> This task builds the in-memory fake admin client (reused by B2-B4) and the first operation. The fake supports exactly the query chains the operations use: `from`, `select`, `insert`, `update`, `eq` (repeatable), `in`, `order`, `limit`, `single`, `maybeSingle`. The builder is thenable so `await admin.from(t).update(x).eq(...)` and `await admin.from(t).select().eq(...).single()` both resolve to `{ data, error }`.

- [ ] **Step 1: Write the fake admin client + the failing depositForRequest test**

```ts
// src/lib/requests/operations.test.ts
import { describe, expect, it } from "vitest";
import {
  depositForRequest,
  approveCandidate,
  keepHunting,
  shipApprovedOrder,
} from "./operations";
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
          const row = {
            id: makeId(table.slice(0, 3), counter),
            created_at: new Date(2026, 0, 1 + counter.n).toISOString(),
            ...payload,
          };
          // generated column mirror for orders
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
        const { data, error } = builder.run();
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/requests/operations.test.ts`
Expected: FAIL — `depositForRequest` is not exported.

- [ ] **Step 3: Implement `depositForRequest`**

Add to `src/lib/requests/operations.ts` (imports at top — extend the existing pricing import and add the state-machine error):
```ts
import {
  computeQuote,
  totalJpy,
  SHIPPING_ESTIMATE_JPY,
} from "@/lib/pricing";
import { IllegalTransitionError } from "./state-machine";
import type { RushTier } from "@/lib/db/types";
```
```ts
/**
 * The single money-moment. Sizes an escrow hold to the budget cap (a four-line
 * ESTIMATE), then moves the request open → sourcing. If the checkout rush
 * selector changed the tier, persist it first so the stored request and the
 * estimate agree. Guards status === "open" explicitly: `sourcing` is reachable
 * from several states, so a bare assertTransition would let candidate_sent →
 * sourcing through and double-charge.
 */
export async function depositForRequest(
  requestId: string,
  rushTier: RushTier,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: req, error } = await admin
    .from("requests")
    .select("status, budget_cap_jpy, rush_tier")
    .eq("id", requestId)
    .single();
  if (error || !req) throw new Error(`Request ${requestId} not found.`);
  if (req.status !== "open") {
    throw new IllegalTransitionError(req.status, "sourcing");
  }

  if (rushTier !== req.rush_tier) {
    const { error: rushErr } = await admin
      .from("requests")
      .update({ rush_tier: rushTier })
      .eq("id", requestId);
    if (rushErr) throw rushErr;
  }

  const lines = computeQuote({
    itemCostJpy: req.budget_cap_jpy ?? 0,
    shippingJpy: SHIPPING_ESTIMATE_JPY,
    rushTier,
  });

  await createEscrowHold(requestId, lines, admin);
  await setRequestStatus(requestId, "sourcing", admin);
}
```
> Confirm `AdminClient` and `createAdminClient` are already imported in this file (they are — existing ops use them). If `RushTier` is already imported, don't duplicate.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/requests/operations.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/requests/operations.ts src/lib/requests/operations.test.ts
git commit -m "feat(operations): depositForRequest with fake-admin test harness"
```

## Task B3: `approveCandidate` + `keepHunting` (TDD)

**Files:**
- Modify: `src/lib/requests/operations.ts`, `src/lib/requests/operations.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `operations.test.ts`:
```ts
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
    expect(order.total_jpy).toBeLessThanOrEqual(hold); // price ≤ cap ⟹ order ≤ hold
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/requests/operations.test.ts`
Expected: FAIL — `approveCandidate` / `keepHunting` not exported.

- [ ] **Step 3: Implement both (assert-then-write)**

In `operations.ts`, extend the state-machine import added in B2 to include `assertTransition` (one combined line — do NOT add a second import from `./state-machine`, that trips `no-duplicate-imports`):
```ts
import { IllegalTransitionError, assertTransition } from "./state-machine";
```
Then add:
```ts
/**
 * Confirm-only: lock the REAL four-line order from the candidate's price (no new
 * money moves — the hold from checkout already covers it whenever price ≤ cap),
 * mark the candidate approved, advance candidate_sent → approved. Asserts
 * legality BEFORE any write so an illegal state leaves no orphan order.
 */
export async function approveCandidate(
  requestId: string,
  candidateId: string,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: req, error: reqErr } = await admin
    .from("requests")
    .select("status, rush_tier")
    .eq("id", requestId)
    .single();
  if (reqErr || !req) throw new Error(`Request ${requestId} not found.`);
  assertTransition(req.status, "approved");

  const { data: cand, error: candErr } = await admin
    .from("candidates")
    .select("id, price_jpy")
    .eq("id", candidateId)
    .single();
  if (candErr || !cand) throw new Error(`Candidate ${candidateId} not found.`);

  const lines = computeQuote({
    itemCostJpy: cand.price_jpy ?? 0,
    shippingJpy: SHIPPING_ESTIMATE_JPY,
    rushTier: req.rush_tier,
  });

  const { error: orderErr } = await admin.from("orders").insert({
    request_id: requestId,
    candidate_id: candidateId,
    item_cost_jpy: lines.itemCostJpy,
    finder_fee_jpy: lines.finderFeeJpy,
    shipping_jpy: lines.shippingJpy,
    tax_jpy: lines.taxJpy,
  });
  if (orderErr) throw orderErr;

  const { error: markErr } = await admin
    .from("candidates")
    .update({ status: "approved" })
    .eq("id", candidateId);
  if (markErr) throw markErr;

  await setRequestStatus(requestId, "approved", admin);
}

/**
 * Reject this candidate and go back to sourcing. No money moves — the hold
 * stays put while we keep looking.
 */
export async function keepHunting(
  requestId: string,
  candidateId: string,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: req, error } = await admin
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .single();
  if (error || !req) throw new Error(`Request ${requestId} not found.`);
  assertTransition(req.status, "sourcing");

  const { error: markErr } = await admin
    .from("candidates")
    .update({ status: "rejected" })
    .eq("id", candidateId);
  if (markErr) throw markErr;

  await setRequestStatus(requestId, "sourcing", admin);
}
```
> Note: `orders.total_jpy` is a generated column in Postgres (the insert omits it). The fake admin mirrors this by computing `total_jpy` on insert (see B2 harness). Do not insert `total_jpy`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/requests/operations.test.ts`
Expected: PASS (B2 + B3 = 7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/requests/operations.ts src/lib/requests/operations.test.ts
git commit -m "feat(operations): approveCandidate + keepHunting"
```

## Task B4: `shipApprovedOrder` (TDD)

**Files:**
- Modify: `src/lib/requests/operations.ts`, `src/lib/requests/operations.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `operations.test.ts`:
```ts
describe("shipApprovedOrder", () => {
  it("records a demo-tracked shipment, releases escrow, and moves received → shipped", async () => {
    const { tables, client } = createFakeAdmin({
      requests: [baseRequest({ id: "r1", status: "received" })],
      orders: [{ id: "o1", request_id: "r1", item_cost_jpy: 14_500, finder_fee_jpy: 1_500, shipping_jpy: 4_000, tax_jpy: 150, total_jpy: 20_150, created_at: "2026-01-03T00:00:00Z" }],
      shipments: [],
      payments: [{ id: "p1", request_id: "r1", stripe_payment_intent_id: "pi_test_held", amount_jpy: 20_150, status: "held", created_at: "2026-01-02T00:00:00Z" }],
    });

    await shipApprovedOrder("r1", client);

    expect(tables.shipments).toHaveLength(1);
    expect(tables.shipments[0].tracking_number).toContain("DEMO-");
    expect(tables.shipments[0].order_id).toBe("o1");
    expect(tables.requests[0].status).toBe("shipped");
    expect(tables.payments[0].status).toBe("released"); // release fired off the tracking number
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
});
```
> Note: this test uses a pre-seeded `payments` row whose `stripe_payment_intent_id` was NOT minted by the stub. `releaseEscrow` calls `escrow.release(id)`; the stub's `transition()` handles unknown ids gracefully (creates an intent with status "released"), and the payment row is updated to "released". So the assertion holds without a prior `createHold`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/requests/operations.test.ts`
Expected: FAIL — `shipApprovedOrder` not exported.

- [ ] **Step 3: Implement `shipApprovedOrder`**

Add to `operations.ts`:
```ts
/**
 * Customer confirms the in-hand item. Loads the request's order and records a
 * shipment with a CLEARLY-SIMULATED demo tracking number — which is what fires
 * the real releaseEscrow + received → shipped inside recordShipment(). Real
 * carrier handoff is a later phase; release still hangs off a tracking number,
 * never a manual flag. Asserts received → shipped legality BEFORE recording, so
 * an illegal state never releases escrow then throws.
 */
export async function shipApprovedOrder(
  requestId: string,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const { data: req, error: reqErr } = await admin
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .single();
  if (reqErr || !req) throw new Error(`Request ${requestId} not found.`);
  assertTransition(req.status, "shipped");

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderErr || !order) throw new Error(`No order for request ${requestId}.`);

  await recordShipment(
    {
      orderId: order.id,
      carrier: "Simulated carrier (demo)",
      trackingNumber: `DEMO-${order.id.slice(0, 8)}`,
    },
    admin,
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/requests/operations.test.ts`
Expected: PASS (B2+B3+B4 = 9 tests).

- [ ] **Step 5: Run the FULL suite**

Run: `npm test`
Expected: 16 existing + 4 currency + 9 operation = **29 tests pass** (2 prior files + currency + operations = 4 files).

- [ ] **Step 6: Commit**

```bash
git add src/lib/requests/operations.ts src/lib/requests/operations.test.ts
git commit -m "feat(operations): shipApprovedOrder fires real release off demo tracking"
```

## Task B5: Checkout / escrow deposit screen 🎨

**Files:**
- Create: `src/app/(app)/requests/[id]/checkout/page.tsx`, `actions.ts`, `checkout-form.tsx`

> 🎨 **Invoke frontend-design.** Match the checkout/deposit screen in the prototype. **Honesty guards (constraint #5):** item line labeled "up to your cap", shipping labeled "estimated", and the unused-cap copy says funds are **"returned to you"** — NEVER "released" (released = to us), and NEVER imply an automatic difference-refund (that's a later phase).

- [ ] **Step 1: Server action**

```ts
// src/app/(app)/requests/[id]/checkout/actions.ts
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { depositForRequest } from "@/lib/requests/operations";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { RushTier } from "@/lib/db/types";

export type CheckoutState = { status: "idle" | "error"; message?: string };

export async function submitDeposit(
  requestId: string,
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  await requireUser();
  // RLS ownership guard: the user must be able to read this request.
  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("requests")
    .select("id")
    .eq("id", requestId)
    .maybeSingle();
  if (!owned) return { status: "error", message: "Request not found." };

  const rushTier = (formData.get("rushTier") as RushTier) ?? "standard";
  try {
    await depositForRequest(requestId, rushTier);
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  revalidatePath("/dashboard");
  redirect(`/requests/${requestId}`);
}
```
> The action uses the RLS-scoped server client only to confirm ownership, then `depositForRequest` (admin) performs the privileged writes. This keeps the "only operations touch admin" rule while still gating by the signed-in user.

- [ ] **Step 2: Checkout form (client)**

```tsx
// src/app/(app)/requests/[id]/checkout/checkout-form.tsx
"use client";
import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { submitDeposit, type CheckoutState } from "./actions";
import { RUSH_TIERS } from "@/lib/validation/request";
import { RUSH_LABEL, computeQuote, totalJpy, formatJpy, SHIPPING_ESTIMATE_JPY } from "@/lib/pricing";
import { formatLocalApprox } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RushTier } from "@/lib/db/types";

export function CheckoutForm({
  requestId, budgetCapJpy, initialRush, currencyPref,
}: {
  requestId: string; budgetCapJpy: number | null; initialRush: RushTier; currencyPref: string;
}) {
  const initial: CheckoutState = { status: "idle" };
  const action = submitDeposit.bind(null, requestId);
  const [state, formAction, isPending] = useActionState(action, initial);
  const [rush, setRush] = useState<RushTier>(initialRush);
  const [accepted, setAccepted] = useState(false);

  const cap = budgetCapJpy ?? 0;
  const quote = computeQuote({ itemCostJpy: cap, shippingJpy: SHIPPING_ESTIMATE_JPY, rushTier: rush });
  const total = totalJpy(quote);
  const local = formatLocalApprox(total, currencyPref);

  const lines = [
    { label: "Item cost", note: "Up to your cap", value: quote.itemCostJpy },
    { label: "Finder's fee", note: "Our service fee", value: quote.finderFeeJpy },
    { label: "Shipping", note: "Estimated", value: quote.shippingJpy },
    { label: "Tax", note: "Consumption tax", value: quote.taxJpy },
  ];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="rushTier" value={rush} />

      {state.status === "error" && state.message && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      {/* Rush selector */}
      <div className="flex flex-col gap-2">
        {RUSH_TIERS.map((t) => (
          <button key={t} type="button" onClick={() => setRush(t)} aria-pressed={rush === t}
            className={cn("flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm",
              rush === t ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border")}>
            <span className="font-medium">{RUSH_LABEL[t]}</span>
          </button>
        ))}
      </div>

      {/* Four-line ESTIMATE */}
      <dl className="rounded-2xl border border-border bg-card p-5">
        {lines.map((l) => (
          <div key={l.label} className="flex items-baseline justify-between border-b border-[#F4F5F7] py-2.5">
            <dt className="flex flex-col">
              <span className="text-[13.5px]">{l.label}</span>
              <span className="text-[11px] text-muted-foreground">{l.note}</span>
            </dt>
            <dd className="tnum text-[13.5px] font-[540]">{formatJpy(l.value)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between pt-3">
          <span className="text-sm font-[600]">Held in escrow today</span>
          <span className="tnum text-[17px] font-[600]">{formatJpy(total)}</span>
        </div>
        {local && <p className="mt-1 text-right text-[11px] text-muted-foreground">{local}</p>}
      </dl>

      {/* Honesty copy — constraint #5 */}
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        This is an <strong>estimate</strong> sized to your budget cap. We hold it
        in escrow now. When we lock a real match, the final four-line total is
        confirmed — if it costs less than your cap, the difference is{" "}
        <strong>returned to you</strong>. Funds release to us only once your item
        ships; if we can&apos;t find it by your deadline, you&apos;re refunded in full.
      </p>

      <label className="flex items-start gap-2.5 text-[13px]">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
        <span>I authorise Finders Keepers to hold {formatJpy(total)} in escrow and agree to the terms.</span>
      </label>

      <Button type="submit" disabled={!accepted || isPending || cap <= 0} className="gap-2">
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Deposit into escrow
      </Button>
      {cap <= 0 && <p className="text-xs text-destructive">Set a budget cap on this request before depositing.</p>}
    </form>
  );
}
```

- [ ] **Step 2b: Page (server)**

```tsx
// src/app/(app)/requests/[id]/checkout/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getRequestDetail } from "@/lib/requests/queries";
import { getProfile } from "@/lib/auth";
import { escrowStateFromPayments } from "@/lib/escrow/display";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Checkout — Finders Keepers" };

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, profile] = await Promise.all([getRequestDetail(id), getProfile()]);
  if (!detail) notFound();
  const { request, payments } = detail;

  // Already funded or past open → nothing to deposit; send to detail.
  if (request.status !== "open" || escrowStateFromPayments(payments) !== "none") {
    redirect(`/requests/${id}`);
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-6 pt-8 pb-24">
      <Link href={`/requests/${id}`} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <ChevronLeft size={15} /> Back to request
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Deposit into escrow</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{request.title}</p>
      <div className="mt-7">
        <CheckoutForm
          requestId={id}
          budgetCapJpy={request.budget_cap_jpy}
          initialRush={request.rush_tier}
          currencyPref={profile?.currency_pref ?? "JPY"}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build + verify**

Run: `npm run build` → clean.
Run: `npm run dev`, log in as demo, open seed #1 (open, unfunded) → `/requests/<id>/checkout`. Deposit → lands on detail showing **Escrow · In escrow** and status **Sourcing**. Re-visiting `/checkout` for that request now redirects to detail.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/requests/[id]/checkout/"
git commit -m "feat(checkout): escrow deposit screen wired to depositForRequest"
```

## Task B6: Candidate approval screen 🎨

**Files:**
- Create: `src/app/(app)/requests/[id]/candidate/page.tsx`, `actions.ts`, `candidate-actions.tsx`

> 🎨 **Invoke frontend-design.** Reachable when status is `candidate_sent` (seed #3). Show listing photos (`PlaceholderThumb` — Storage upload is a later phase), source/seller (`listing_url`, `notes`), and a "checked against your cap" meter (`price_jpy` vs `budget_cap_jpy`). Over-cap variant disables Approve.

- [ ] **Step 1: Server actions**

```ts
// src/app/(app)/requests/[id]/candidate/actions.ts
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { approveCandidate, keepHunting } from "@/lib/requests/operations";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function assertOwned(requestId: string) {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("requests").select("id").eq("id", requestId).maybeSingle();
  if (!data) throw new Error("Request not found.");
}

export async function approveAction(requestId: string, candidateId: string) {
  await assertOwned(requestId);
  await approveCandidate(requestId, candidateId);
  revalidatePath("/dashboard");
  redirect(`/requests/${requestId}`);
}

export async function keepHuntingAction(requestId: string, candidateId: string) {
  await assertOwned(requestId);
  await keepHunting(requestId, candidateId);
  revalidatePath("/dashboard");
  redirect(`/requests/${requestId}`);
}
```

- [ ] **Step 2: Action buttons (client)**

```tsx
// src/app/(app)/requests/[id]/candidate/candidate-actions.tsx
"use client";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { approveAction, keepHuntingAction } from "./actions";
import { Button } from "@/components/ui/button";

export function CandidateActions({
  requestId, candidateId, overCap,
}: { requestId: string; candidateId: string; overCap: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2.5">
      <Button disabled={overCap || pending} className="gap-2"
        onClick={() => start(() => approveAction(requestId, candidateId))}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Approve &amp; buy
      </Button>
      <Button variant="outline" disabled={pending}
        onClick={() => start(() => keepHuntingAction(requestId, candidateId))}>
        Keep hunting
      </Button>
      {overCap && (
        <p className="text-[12.5px] text-warning">
          This candidate is over your cap — approving would need re-authorising your
          escrow hold, which isn&apos;t available yet. You can keep hunting instead.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Page (server)**

```tsx
// src/app/(app)/requests/[id]/candidate/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getRequestDetail } from "@/lib/requests/queries";
import { formatJpy } from "@/lib/pricing";
import { PlaceholderThumb } from "@/components/ui/placeholder-thumb";
import { CandidateActions } from "./candidate-actions";

export const metadata = { title: "Review candidate — Finders Keepers" };

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getRequestDetail(id);
  if (!detail) notFound();
  const { request, candidates } = detail;
  if (request.status !== "candidate_sent") redirect(`/requests/${id}`);

  const candidate = candidates.find((c) => c.status === "proposed") ?? candidates[0];
  if (!candidate) redirect(`/requests/${id}`);

  const cap = request.budget_cap_jpy ?? 0;
  const price = candidate.price_jpy ?? 0;
  const overCap = cap > 0 && price > cap;
  const pct = cap > 0 ? Math.min(100, Math.round((price / cap) * 100)) : 0;

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 pt-8 pb-24">
      <Link href={`/requests/${id}`} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <ChevronLeft size={15} /> Back to request
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">We found a match</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{request.title}</p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-2.5">
            <PlaceholderThumb label="listing" className="aspect-[3/4]" />
            <PlaceholderThumb label="listing" className="aspect-[3/4]" />
            <PlaceholderThumb label="listing" className="aspect-[3/4]" />
          </div>
          {candidate.notes && <p className="text-sm leading-relaxed">{candidate.notes}</p>}
          {candidate.listing_url && (
            <a href={candidate.listing_url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-primary underline-offset-4 hover:underline">
              View source listing
            </a>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-muted-foreground">Candidate price</span>
              <span className="tnum text-lg font-[600]">{formatJpy(price)}</span>
            </div>
            <div className="mt-3 text-[11.5px] text-muted-foreground">Checked against your cap {formatJpy(cap)}</div>
            <div className="mt-1.5 h-2 w-full rounded-full bg-border">
              <div className={`h-2 rounded-full ${overCap ? "bg-warning" : "bg-success"}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1.5 text-[11.5px]">
              {overCap ? <span className="text-warning">Over cap</span> : <span className="text-success">Within cap</span>}
            </div>
          </div>
          <CandidateActions requestId={id} candidateId={candidate.id} overCap={overCap} />
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build + verify**

Run: `npm run build` → clean.
Run dev: open seed #3 (candidate_sent) → `/requests/<id>/candidate`. "Approve & buy" → request parks at **Approved** with a four-line order; "Keep hunting" → back to **Sourcing**, candidate rejected.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/requests/[id]/candidate/"
git commit -m "feat(candidate): approval screen wired to approveCandidate/keepHunting"
```

## Task B7: Item-received approval screen 🎨

**Files:**
- Create: `src/app/(app)/requests/[id]/received/page.tsx`, `actions.ts`, `received-form.tsx`

> 🎨 **Invoke frontend-design.** Reachable when status is `received` (seed #6). In-hand proof (`PlaceholderThumb`) + a condition checklist. "Approve & ship" → `shipApprovedOrder` → real escrow release → `shipped`.

- [ ] **Step 1: Server action**

```ts
// src/app/(app)/requests/[id]/received/actions.ts
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { shipApprovedOrder } from "@/lib/requests/operations";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function approveAndShip(requestId: string) {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("requests").select("id").eq("id", requestId).maybeSingle();
  if (!data) throw new Error("Request not found.");
  await shipApprovedOrder(requestId);
  revalidatePath("/dashboard");
  redirect(`/requests/${requestId}`);
}
```

- [ ] **Step 2: Form (client)**

```tsx
// src/app/(app)/requests/[id]/received/received-form.tsx
"use client";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { approveAndShip } from "./actions";
import { Button } from "@/components/ui/button";

const CHECKS = [
  "The item matches the photos and description",
  "The condition meets what I asked for",
  "I want this shipped to me now",
];

export function ReceivedForm({ requestId }: { requestId: string }) {
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));
  const [pending, start] = useTransition();
  const allChecked = checked.every(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2.5">
        {CHECKS.map((c, i) => (
          <li key={c}>
            <label className="flex items-start gap-2.5 text-[13.5px]">
              <input type="checkbox" checked={checked[i]} className="mt-0.5"
                onChange={(e) => setChecked((p) => p.map((v, j) => (j === i ? e.target.checked : v)))} />
              <span>{c}</span>
            </label>
          </li>
        ))}
      </ul>
      <Button disabled={!allChecked || pending} className="gap-2"
        onClick={() => start(() => approveAndShip(requestId))}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Approve &amp; ship
      </Button>
      <p className="text-[12px] text-muted-foreground">
        Approving releases your escrow to us and puts the item in transit to you.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Page (server)**

```tsx
// src/app/(app)/requests/[id]/received/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getRequestDetail } from "@/lib/requests/queries";
import { PriceBreakdown } from "@/components/requests/price-breakdown";
import { PlaceholderThumb } from "@/components/ui/placeholder-thumb";
import { ReceivedForm } from "./received-form";

export const metadata = { title: "Final check — Finders Keepers" };

export default async function ReceivedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getRequestDetail(id);
  if (!detail) notFound();
  const { request, orders } = detail;
  if (request.status !== "received") redirect(`/requests/${id}`);
  const order = orders[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 pt-8 pb-24">
      <Link href={`/requests/${id}`} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <ChevronLeft size={15} /> Back to request
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">It arrived — final check</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{request.title}</p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-2.5">
            <PlaceholderThumb label="in hand" className="aspect-[3/4]" />
            <PlaceholderThumb label="in hand" className="aspect-[3/4]" />
            <PlaceholderThumb label="in hand" className="aspect-[3/4]" />
          </div>
          <ReceivedForm requestId={id} />
        </div>
        <aside>{order && <PriceBreakdown order={order} />}</aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build + verify**

Run: `npm run build` → clean.
Run dev: open seed #6 (received) → `/requests/<id>/received`. Check all boxes → "Approve & ship" → request becomes **Shipped**, escrow **Released**, detail shows the demo tracking number.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/requests/[id]/received/"
git commit -m "feat(received): final-check screen fires real escrow release on ship"
```

---

# Phase C — Read surfaces

## Task C1: New queries (TDD where pure, else build + verify)

**Files:**
- Modify: `src/lib/requests/queries.ts`

> These are RLS-scoped reads via `createClient()` — no `admin`. They mirror the existing bulk-fetch + in-memory-join pattern. No unit tests (they need a live DB); verify via the dev walkthrough in C2-C4. Follow the existing `getDashboardRequests` / `getRequestDetail` style exactly.

- [ ] **Step 1: Add `getMessageThreads` and `getThreadMessages`**

Append to `queries.ts` (reuse existing `createClient` import; add types as needed):
```ts
export interface MessageThread {
  requestId: string;
  title: string;
  lastBody: string;
  lastAt: string;
  lastSender: "customer" | "team";
}

/** One row per request that has messages, newest activity first. */
export async function getMessageThreads(): Promise<MessageThread[]> {
  const supabase = await createClient();
  const [reqRes, msgRes] = await Promise.all([
    supabase.from("requests").select("id, title"),
    supabase.from("messages").select("request_id, body, sender, created_at"),
  ]);
  if (msgRes.error) throw msgRes.error;
  const titles = new Map((reqRes.data ?? []).map((r) => [r.id, r.title]));
  const byReq = new Map<string, typeof msgRes.data>();
  for (const m of msgRes.data ?? []) {
    (byReq.get(m.request_id) ?? byReq.set(m.request_id, []).get(m.request_id))!.push(m);
  }
  const threads: MessageThread[] = [];
  for (const [requestId, msgs] of byReq) {
    const sorted = [...msgs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const last = sorted[0];
    threads.push({
      requestId,
      title: titles.get(requestId) ?? "Untitled request",
      lastBody: last.body,
      lastAt: last.created_at,
      lastSender: last.sender,
    });
  }
  return threads.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}

/** All messages for one request, oldest first (chat order). */
export async function getThreadMessages(requestId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
```
> Ensure `Message` type is imported from `@/lib/db/types` at the top of `queries.ts` (add if missing).

- [ ] **Step 2: Add `getOrderHistory`**

```ts
export interface OrderHistoryRow {
  request: Request;
  order: Order | null;
}

/** Settled/closed hunts (released, refunded, cancelled) with their order. */
export async function getOrderHistory(): Promise<OrderHistoryRow[]> {
  const supabase = await createClient();
  const [reqRes, orderRes] = await Promise.all([
    supabase
      .from("requests")
      .select("*")
      .in("status", ["released", "refunded", "cancelled"])
      .order("updated_at", { ascending: false }),
    supabase.from("orders").select("*"),
  ]);
  if (reqRes.error) throw reqRes.error;
  const orders = orderRes.data ?? [];
  return (reqRes.data ?? []).map((request) => ({
    request,
    order:
      orders
        .filter((o) => o.request_id === request.id)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] ?? null,
  }));
}
```
> Add `Request`, `Order` to the `@/lib/db/types` import in `queries.ts` if not already present.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/requests/queries.ts
git commit -m "feat(queries): message threads, thread messages, order history"
```

## Task C2: Messages screen 🎨

**Files:**
- Create: `src/app/(app)/messages/page.tsx`, `messages-view.tsx`

> 🎨 **Invoke frontend-design.** Two-pane: thread list + conversation. Composer is **rendered but disabled** with an inline "interactive send is a later phase" note — no fake send. `sender` drives bubble alignment (customer right, team left). Deep-linkable: `/messages?request=<id>`.

- [ ] **Step 1: View component (client, handles selection)**

```tsx
// src/app/(app)/messages/messages-view.tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/dates";
import type { MessageThread } from "@/lib/requests/queries";
import type { Message } from "@/lib/db/types";

export function MessagesView({
  threads, activeId, messages,
}: { threads: MessageThread[]; activeId: string | null; messages: Message[] }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <div className="grid h-[calc(100vh-13rem)] grid-cols-[280px_1fr] overflow-hidden rounded-2xl border border-border bg-card">
      {/* Thread list */}
      <ul className="overflow-y-auto border-r border-border">
        {threads.length === 0 && <li className="p-4 text-sm text-muted-foreground">No conversations yet.</li>}
        {threads.map((t) => (
          <li key={t.requestId}>
            <button onClick={() => { const p = new URLSearchParams(params); p.set("request", t.requestId); router.push(`/messages?${p}`); }}
              className={cn("flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left",
                t.requestId === activeId ? "bg-secondary" : "hover:bg-secondary/50")}>
              <span className="truncate text-[13.5px] font-[560]">{t.title}</span>
              <span className="truncate text-[12px] text-muted-foreground">
                {t.lastSender === "team" ? "Your hunter: " : "You: "}{t.lastBody}
              </span>
              <span className="text-[11px] text-muted-foreground">{formatRelativeTime(t.lastAt)}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Conversation */}
      <div className="flex flex-col">
        {activeId ? (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              <ul className="flex flex-col gap-3">
                {messages.map((m) => (
                  <li key={m.id} className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-[13.5px]",
                    m.sender === "customer" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary")}>
                    {m.body}
                    <div className={cn("mt-1 text-[10.5px]", m.sender === "customer" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {formatRelativeTime(m.created_at)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* Disabled composer — interactive send is a later phase */}
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
                <input disabled placeholder="Messaging opens in a later phase" className="flex-1 bg-transparent text-sm outline-none" />
                <button disabled className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">Send</button>
              </div>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Select a conversation</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Page (server)**

```tsx
// src/app/(app)/messages/page.tsx
import { getMessageThreads, getThreadMessages } from "@/lib/requests/queries";
import { MessagesView } from "./messages-view";

export const metadata = { title: "Messages — Finders Keepers" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const { request } = await searchParams;
  const threads = await getMessageThreads();
  const activeId = request ?? threads[0]?.requestId ?? null;
  const messages = activeId ? await getThreadMessages(activeId) : [];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-6 py-8">
      <h1 className="mb-5 text-2xl font-semibold tracking-tight">Messages</h1>
      <MessagesView threads={threads} activeId={activeId} messages={messages} />
    </div>
  );
}
```

- [ ] **Step 3: Build + verify**

Run: `npm run build` → clean.
Run dev: `/messages` lists seed threads (#2, #3, #7, #10 have team messages); selecting one shows bubbles; composer disabled; `/messages?request=<id>` deep-links.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/messages/"
git commit -m "feat(messages): two-pane reader with disabled composer"
```

## Task C3: Order history screen 🎨

**Files:**
- Create: `src/app/(app)/history/page.tsx`
- Modify: `src/components/requests/request-form.tsx` (read reorder prefill query params on mount)

> 🎨 **Invoke frontend-design.** Closed/settled hunts (`released`, `refunded`, `cancelled`) with their four-line `PriceBreakdown`, final `StatusBadge`/`EscrowBadge`, and a **Reorder** action → `/requests/new?title=…&condition=…&budget=…&rush=…`. Reorder is navigation + prefill only — no new write path.

- [ ] **Step 1: History page (server)**

```tsx
// src/app/(app)/history/page.tsx
import Link from "next/link";
import { getOrderHistory } from "@/lib/requests/queries";
import { escrowStateFromPayments } from "@/lib/escrow/display";
import { StatusBadge } from "@/components/requests/status-badge";
import { EscrowBadge } from "@/components/requests/escrow-badge";
import { PriceBreakdown } from "@/components/requests/price-breakdown";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Order history — Finders Keepers" };

export default async function HistoryPage() {
  const rows = await getOrderHistory();

  return (
    <div className="mx-auto w-full max-w-[1000px] px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Order history</h1>
      <p className="mb-6 text-sm text-muted-foreground">Settled and closed hunts.</p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No closed hunts yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(({ request, order }) => {
            const reorder = new URLSearchParams({
              title: request.title,
              condition: request.min_condition,
              rush: request.rush_tier,
              ...(request.budget_cap_jpy ? { budget: String(request.budget_cap_jpy) } : {}),
            });
            return (
              <div key={request.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link href={`/requests/${request.id}`} className="text-[15px] font-[560] tracking-tight hover:underline">
                    {request.title}
                  </Link>
                  <StatusBadge status={request.status} />
                  {/* refunded/released map cleanly; cancelled → escrow "none" */}
                  <EscrowBadge state={request.status === "released" ? "released" : request.status === "refunded" ? "refunded" : "none"} />
                  <Link href={`/requests/new?${reorder}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}>
                    Reorder
                  </Link>
                </div>
                {order && <div className="mt-4 max-w-md"><PriceBreakdown order={order} /></div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wizard reads reorder prefill on mount**

In `src/components/requests/request-form.tsx`, add `useSearchParams` and seed initial state from it. Replace the `useState("")` initializers (lines 65-73) so they read once on mount:
```tsx
// at top:
import { useSearchParams } from "next/navigation";
import { MIN_CONDITIONS, RUSH_TIERS } from "@/lib/validation/request";
```
```tsx
  const params = useSearchParams();
  const [title, setTitle] = useState(() => params.get("title") ?? "");
  const [minCondition, setMinCondition] = useState<(typeof MIN_CONDITIONS)[number]>(() => {
    const c = params.get("condition");
    return (MIN_CONDITIONS as readonly string[]).includes(c ?? "") ? (c as (typeof MIN_CONDITIONS)[number]) : "any";
  });
  const [rushTier, setRushTier] = useState<(typeof RUSH_TIERS)[number]>(() => {
    const r = params.get("rush");
    return (RUSH_TIERS as readonly string[]).includes(r ?? "") ? (r as (typeof RUSH_TIERS)[number]) : "standard";
  });
  const [mustHaves, setMustHaves] = useState<string[]>([]);
  const [niceToHaves, setNiceToHaves] = useState<string[]>([]);
  const [budgetCapRaw, setBudgetCapRaw] = useState(() => params.get("budget") ?? "");
```
> Keep the rest of the component unchanged. The hidden inputs already serialize these controlled values, so a prefilled wizard posts the prefilled data.

- [ ] **Step 3: Build + verify**

Run: `npm run build` → clean.
Run dev: `/history` shows seed #8 (released), #9 (cancelled), #10 (refunded) with breakdowns + correct badges. Click "Reorder" on #8 → `/requests/new` with title/condition/budget/rush prefilled.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/history/" src/components/requests/request-form.tsx
git commit -m "feat(history): settled hunts with four-line breakdown and reorder prefill"
```

## Task C4: Account & settings screen 🎨

**Files:**
- Create: `src/app/(app)/account/page.tsx`

> 🎨 **Invoke frontend-design.** Reads the real `profiles` row. Sections: shipping address, currency/language, payment method (presentational), notifications (presentational). All controls render **real current values** but are **read-only / disabled** with a visible "saving is a later phase" note — nothing here mutates the DB.

- [ ] **Step 1: Account page (server)**

```tsx
// src/app/(app)/account/page.tsx
import { getProfile, requireUser } from "@/lib/auth";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

export const metadata = { title: "Account — Finders Keepers" };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-[540]">{value}</span>
    </div>
  );
}

export default async function AccountPage() {
  const [user, profile] = await Promise.all([requireUser(), getProfile()]);

  return (
    <div className="mx-auto w-full max-w-[680px] px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Account &amp; settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Saving changes opens in a later phase — values below are read-only for now.
      </p>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-2 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">Account</h2>
        <Row label="Email" value={user.email ?? "—"} />
        <Row label="Shipping country" value={profile?.shipping_country ?? "Not set"} />
        <Row label="Currency" value={profile?.currency_pref ?? "JPY"} />
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-2 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">Currency &amp; language</h2>
        <label className="block text-sm">
          <span className="text-muted-foreground">Display currency</span>
          <select disabled defaultValue={profile?.currency_pref ?? "JPY"} className="mt-1 w-full rounded-lg border border-border bg-muted/40 px-3 py-2">
            <option value="JPY">JPY (¥)</option>
            {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <p className="mt-2 text-[12px] text-muted-foreground">Local-currency amounts are indicative; you always pay in JPY.</p>
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5 opacity-80">
        <h2 className="mb-2 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">Payment method</h2>
        <p className="text-sm text-muted-foreground">Connecting a card opens with real checkout in a later phase.</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 opacity-80">
        <h2 className="mb-2 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">Notifications</h2>
        {["Candidate found", "Item received", "Shipped"].map((n) => (
          <label key={n} className="flex items-center justify-between py-2 text-sm">
            <span>{n}</span>
            <input type="checkbox" disabled defaultChecked />
          </label>
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Build + verify**

Run: `npm run build` → clean.
Run dev: `/account` shows the demo user's real email/country/currency; all controls disabled; phase note visible.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/account/"
git commit -m "feat(account): read-only settings reflecting real profile"
```

---

# Phase D — Wire-up & cross-cutting

## Task D1: Sidebar nav rows

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

> Done after Section 3 so there are no dead links. Active highlighting follows the existing pattern (lines 42-44, `pathname.startsWith`).

- [ ] **Step 1: Extend the NAV array**

In `src/components/layout/sidebar.tsx`, add the icon imports and rows:
```tsx
import { LayoutDashboard, MessageSquare, Clock, Settings, Plus, ShieldCheck } from "lucide-react";
```
```tsx
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/history", label: "Order history", icon: Clock },
  { href: "/account", label: "Account", icon: Settings },
];
```
> The existing active-route logic already handles non-dashboard hrefs via `pathname.startsWith(item.href)`. No other change needed.

- [ ] **Step 2: Build + verify**

Run: `npm run build` → clean.
Run dev: all four nav rows render; each highlights when active; no dead links.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(nav): add Messages / Order history / Account sidebar rows"
```

## Task D2: Dashboard action-strip + detail-page CTA routing

**Files:**
- Modify: `src/components/dashboard/request-card.tsx`
- Modify: `src/app/(app)/requests/[id]/page.tsx`

> Last step so every target route exists. Route action-needed + unfunded-open cards straight to the right sub-route; add a "Deposit into escrow" CTA on the detail page when `open && escrowState === "none"`.

- [ ] **Step 1: Add an action-href helper + CTA to the request card**

In `src/components/dashboard/request-card.tsx`, compute a direct action target for cards that need one. Add near the top of the component body:
```tsx
  // Direct action route for cards that need the customer to act.
  const actionHref =
    request.status === "candidate_sent"
      ? `/requests/${request.id}/candidate`
      : request.status === "received"
        ? `/requests/${request.id}/received`
        : request.status === "open" && request.escrowState === "none"
          ? `/requests/${request.id}/checkout`
          : null;
```
Then render a small CTA inside the right-hand column (after the headline/chip block, before closing the `<div className="shrink-0 text-right">`), only when `actionHref` is set. Because the whole card is a `<Link>`, render the CTA as a styled span with the label and stop propagation is unnecessary — instead, change the card's outer `href` to `actionHref ?? \`/requests/${request.id}\``:
```tsx
    <Link
      href={actionHref ?? `/requests/${request.id}`}
      ...
```
And add a visible label so the action reads clearly:
```tsx
        {actionHref && (
          <div className="mt-2 text-[11.5px] font-[560] text-warning">
            {request.status === "candidate_sent" ? "Review candidate →"
              : request.status === "received" ? "Final check →"
              : "Deposit into escrow →"}
          </div>
        )}
```

- [ ] **Step 2: Add the detail-page deposit CTA**

In `src/app/(app)/requests/[id]/page.tsx`, after the action banner block (after line 165), add:
```tsx
      {/* Unfunded open request → deposit CTA */}
      {request.status === "open" && escrowState === "none" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <div className="text-[13.5px]">
            <div className="font-[560]">Fund this hunt</div>
            <div className="text-muted-foreground">Deposit into escrow so we can start sourcing.</div>
          </div>
          <Link href={`/requests/${request.id}/checkout`}
            className={cn(buttonVariants(), "shrink-0")}>
            Deposit into escrow
          </Link>
        </div>
      )}
```
Add the imports at the top of the file if missing:
```tsx
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

- [ ] **Step 3: Build + verify the whole flow**

Run: `npm run build` → clean.
Run dev walkthrough:
- Dashboard action-needed: seed #3 card → "Review candidate", seed #6 card → "Final check".
- Seed #1 (open, unfunded) card → "Deposit into escrow"; detail page shows the deposit CTA.
- Full money path on a fresh request: create via wizard → checkout → deposit → (seed a candidate or use #3) approve → … → received → ship.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/request-card.tsx "src/app/(app)/requests/[id]/page.tsx"
git commit -m "feat(wire-up): action-strip + detail deposit CTA route to sub-screens"
```

## Task D3: Done-criteria verification

**Files:** none (verification only)

> REQUIRED SKILL: superpowers:verification-before-completion — run every command and confirm output before claiming done.

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: **29 tests pass** across 4 files (pricing 16-prior split, display, currency 4, operations 9 — confirm the prior count of 16 plus the 13 new = 29 total).

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both clean, no warnings about missing routes.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 4: No-dead-links + honesty audit (manual dev walkthrough)**

Run: `npm run dev` and confirm against the locked prototype:
- 特商法 footer link present and reachable on `/` (landing) and all `(app)` routes; Terms/Privacy remain non-link placeholders (no 404s).
- Every sidebar row resolves; every dashboard CTA resolves; checkout/candidate/received redirect correctly when status doesn't match.
- Escrow copy never says "released" for the customer's returned funds; no UI implies an automatic difference-refund.
- `grep -rn "Finders × Keepers" src/` → only non-user-facing comments remain.

- [ ] **Step 5: Final commit (if any walkthrough fixes)**

```bash
git add -A
git commit -m "chore(plan2): done-criteria verification fixes"
```

---

## Self-review notes (author)

- **Spec coverage:** 1a (D-confirm + A3) · 1b (A4) · 1c (A2) · Section 2 ops (B2-B4) + tests (B2-B4) · 2a checkout (B5) · 2b candidate (B6) · 2c received (B7) · 3a messages (C2) · 3b history (C3) · 3c account (C4) · 4a sidebar (D1) · 4b wire-up (D2) · 4c done-criteria (D3). All covered.
- **Test count reconciliation:** prototype baseline is 16 (`pricing.test.ts` + `display.test.ts`). Plan adds 4 (currency) + 9 (operations) = **29** at the end.
- **Type consistency:** operation names `depositForRequest` / `approveCandidate` / `keepHunting` / `shipApprovedOrder` used identically in ops + tests + actions. `SHIPPING_ESTIMATE_JPY`, `formatLocalApprox`, `SUPPORTED_CURRENCIES`, `getMessageThreads`/`getThreadMessages`/`getOrderHistory`, `MessageThread`/`OrderHistoryRow` consistent across producer and consumer tasks.
- **Stub flags:** `SHIPPING_ESTIMATE_JPY` and the `DEMO-` tracking number are both code-commented as flagged stubs; the curated "recent finds" array and disabled composer/account controls carry visible phase notes.
