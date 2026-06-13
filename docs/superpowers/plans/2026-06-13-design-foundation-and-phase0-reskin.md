# Design Foundation + Phase 0 Re-skin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the finalized design-handoff system (Geist-only, clean white, blue-700 indigo, emerald/amber trust semantics) and re-skin the existing Phase 0 surfaces (app shell, dashboard, request detail, create flow) to be faithful to it.

**Architecture:** Extend the shadcn token layer in `globals.css` with the handoff palette (oklch) plus `--success`/`--warning` semantic families, drop Fraunces, and recolor the existing tone maps (`status.ts`, `escrow/display.ts`) to the design's slate/blue/amber/emerald system. The app already centralizes presentation through `STATUS_META` + `TONE_BADGE`/`TONE_DOT` and the four-line `PriceBreakdown`, so most of the reskin is token + tone changes plus component anatomy rewrites. No backend/state-machine changes.

**Tech Stack:** Next.js 16 App Router, TypeScript (strict), Tailwind v4, shadcn/base-ui, Geist + Geist Mono, lucide-react, Vitest (added in Task 0 — no runner exists yet).

**Reference:** Design spec `docs/superpowers/specs/2026-06-13-design-handoff-implementation-design.md`; locked prototype `design/handoff/Finders Keepers.dc.html`.

**Hex → Tailwind/oklch crib (exact or near):** primary `#1D4ED8`=`blue-700`; success `#047857`=`emerald-700`; warning text `#B45309`=`amber-700`, dot `#D97706`=`amber-600`; destructive `#B42318`≈`red-700`; slate dot `#94A3B8`=`slate-400`, slate chip bg `#F1F5F9`=`slate-100`, slate text `#475569`=`slate-600`; ink `#0F1115`≈`zinc-950`; ground `#FCFCFD`; card `#fff`.

**Verification note:** Visual surfaces have no snapshot tooling (per spec). For component/page tasks the verification command is `npm run lint && npx tsc --noEmit && npm run build` plus the described visual check via `npm run dev`. Logic tasks use Vitest TDD.

---

## File structure

**Foundation (logic/tokens — fully coded below):**
- Modify `src/app/globals.css` — palette + semantic tokens + keyframes + hatch utility.
- Modify `src/app/layout.tsx` — remove Fraunces.
- Modify `src/lib/requests/status.ts` — recolor `TONE_BADGE`/`TONE_DOT`, reassign `STATUS_META.tone` to the design map.
- Create `src/lib/requests/display.ts` — pure presentation helpers (rail progress, escrow caption, deadline chip, condition label).
- Create `src/lib/requests/display.test.ts` — unit tests.
- Modify `CLAUDE.md` — rewrite design-tokens section.

**Phase 0 re-skin (components/pages):**
- Create `src/components/ui/placeholder-thumb.tsx` — hatch placeholder image.
- Modify `src/components/requests/status-badge.tsx`, `escrow-badge.tsx`.
- Modify `src/components/dashboard/request-card.tsx`, `stats.tsx`, `empty-state.tsx`.
- Modify `src/components/requests/lifecycle-rail.tsx`, `price-breakdown.tsx`.
- Modify `src/components/layout/sidebar.tsx`, `src/app/(app)/layout.tsx`.
- Modify `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/requests/[id]/page.tsx`.
- Modify `src/components/requests/request-form.tsx`, `src/app/(app)/requests/new/page.tsx`.

---

## Task 0: Add the Vitest test runner (+ backfill pricing tests)

No test runner exists yet. Add Vitest so the money/state cross-cutting rule is satisfied, and backfill the existing untested `pricing.ts`.

**Files:**
- Modify: `package.json` (devDependency + `test` script)
- Create: `vitest.config.ts`
- Create: `src/lib/pricing.test.ts`

- [ ] **Step 1: Install Vitest.** Run: `npm install -D vitest`. Expected: adds `vitest` to `devDependencies`.

- [ ] **Step 2: Add the `test` script** to `package.json` scripts: `"test": "vitest run"` (and optionally `"test:watch": "vitest"`).

- [ ] **Step 3: Create `vitest.config.ts`** so the `@/` alias resolves like Next:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 4: Write `src/lib/pricing.test.ts`** (backfill — locks the four-line agency model):

```ts
import { describe, expect, it } from "vitest";
import {
  computeFinderFee,
  computeQuote,
  totalJpy,
  FINDER_FEE_MIN_JPY,
} from "./pricing";

describe("computeFinderFee", () => {
  it("is 10% of item cost above the floor", () => {
    expect(computeFinderFee(100_000)).toBe(10_000);
  });
  it("applies the minimum on small items", () => {
    expect(computeFinderFee(1_000)).toBe(FINDER_FEE_MIN_JPY);
  });
  it("surcharges the fee by the rush multiplier", () => {
    expect(computeFinderFee(100_000, "priority")).toBe(15_000); // ×1.5
    expect(computeFinderFee(100_000, "express")).toBe(20_000); // ×2
  });
});

describe("computeQuote + totalJpy", () => {
  it("keeps four distinct lines and taxes the service fee only", () => {
    const q = computeQuote({ itemCostJpy: 100_000, shippingJpy: 4_200 });
    expect(q).toEqual({
      itemCostJpy: 100_000,
      finderFeeJpy: 10_000,
      shippingJpy: 4_200,
      taxJpy: 1_000, // 10% of the finder's fee
    });
    expect(totalJpy(q)).toBe(115_200);
  });
});
```

- [ ] **Step 5: Run the tests.** Run: `npm test`. Expected: PASS (these assert current `pricing.ts` behavior; if any fail, the test is wrong — fix the test to match the implemented model, do not change `pricing.ts`).

- [ ] **Step 6: Commit.**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/pricing.test.ts
git commit -m "test: add Vitest + backfill four-line pricing tests"
```

---

## Task 1: Replace design tokens in globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Read the current file** to see the full `@theme inline`, `:root`, and `.dark` blocks and any utilities below them.

Run: open `src/app/globals.css`.

- [ ] **Step 2: Add the semantic color slots to `@theme inline`.**

Inside the `@theme inline { … }` block, after the `--color-card: var(--card);` line, add:

```css
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-success-muted: var(--success-muted);
  --color-success-border: var(--success-border);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-warning-muted: var(--warning-muted);
  --color-warning-border: var(--warning-border);
```

Remove the `--font-heading: var(--font-fraunces);` line (Fraunces is dropped).

- [ ] **Step 3: Replace the `:root` block** with the handoff palette (clean white ground, blue-700 primary, emerald success, amber warning). Replace the entire existing `:root { … }`:

```css
:root {
  --radius: 0.7rem;

  /* Clean near-white ground, near-black ink */
  --background: oklch(0.992 0.001 286);   /* #FCFCFD */
  --foreground: oklch(0.18 0.006 277);    /* #0F1115 */

  --card: oklch(1 0 0);
  --card-foreground: var(--foreground);
  --popover: oklch(1 0 0);
  --popover-foreground: var(--foreground);

  /* blue-700 indigo — single trust accent */
  --primary: oklch(0.488 0.217 264.4);    /* #1D4ED8 */
  --primary-foreground: oklch(1 0 0);

  --secondary: oklch(0.968 0.002 286);
  --secondary-foreground: oklch(0.37 0.03 264);

  --muted: oklch(0.97 0.002 286);
  --muted-foreground: oklch(0.55 0.02 264);  /* ~#6B7280 */

  --accent: oklch(0.962 0.013 264);          /* #EEF3FF-ish */
  --accent-foreground: oklch(0.488 0.217 264.4);

  --destructive: oklch(0.55 0.214 26);       /* ~#DC2626 */

  --border: oklch(0.93 0.003 286);           /* #EAECEF */
  --input: oklch(0.91 0.004 286);            /* #E5E7EB */
  --ring: oklch(0.488 0.217 264.4);

  /* escrow / trust green */
  --success: oklch(0.52 0.12 162);           /* #047857 */
  --success-foreground: oklch(1 0 0);
  --success-muted: oklch(0.965 0.03 162);    /* #E8F6EF */
  --success-border: oklch(0.92 0.03 162);    /* #DDEEE3 */

  /* action-needed amber */
  --warning: oklch(0.55 0.13 64);            /* #B45309 */
  --warning-foreground: oklch(1 0 0);
  --warning-muted: oklch(0.96 0.04 80);      /* #FDF4E7 */
  --warning-border: oklch(0.89 0.06 80);     /* #F2DEB4 */

  --chart-1: oklch(0.488 0.217 264.4);
  --chart-2: oklch(0.52 0.12 162);
  --chart-3: oklch(0.55 0.13 64);
  --chart-4: oklch(0.55 0.214 26);
  --chart-5: oklch(0.55 0.04 264);

  --sidebar: oklch(1 0 0);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: oklch(0.962 0.013 264);  /* #F4F6FB */
  --sidebar-accent-foreground: oklch(0.488 0.217 264.4);
  --sidebar-border: oklch(0.945 0.002 286);  /* #EEF0F3 */
  --sidebar-ring: var(--primary);
}
```

- [ ] **Step 4: Update the `.dark` block** so it stays cohesive: set `--primary` to a lighter blue (`oklch(0.62 0.17 264)`), `--success` to `oklch(0.66 0.12 162)`, `--warning` to `oklch(0.7 0.12 75)`, and add the matching `*-foreground`/`*-muted`/`*-border` dark values (muted = a translucent-feeling dark tint, border = `oklch(0.3 0.01 264)`). Keep existing dark `--background`/`--card` etc.

- [ ] **Step 5: Add keyframes + hatch utility** at the end of the file:

```css
@keyframes fkpulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
@keyframes fkfade { from { opacity: 0; transform: translateY(7px) } to { opacity: 1; transform: none } }

@utility pulse-dot { animation: fkpulse 2s infinite; }

@media (prefers-reduced-motion: reduce) {
  .pulse-dot { animation: none; }
}

/* Diagonal-hatch placeholder for not-yet-real imagery */
@utility hatch {
  background: repeating-linear-gradient(135deg, #F5F6F8, #F5F6F8 7px, #EEF0F3 7px, #EEF0F3 14px);
}
```

Confirm a `.tnum { font-variant-numeric: tabular-nums; }` utility exists in the file; if not, add `@utility tnum { font-variant-numeric: tabular-nums; }`.

- [ ] **Step 6: Verify build.** Run: `npm run build`. Expected: compiles with no CSS/token errors.

- [ ] **Step 7: Commit.**

```bash
git add src/app/globals.css
git commit -m "feat(design): adopt handoff palette + success/warning tokens"
```

---

## Task 2: Drop Fraunces from layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Read** `src/app/layout.tsx`.

- [ ] **Step 2: Remove Fraunces.** Change the font import line `import { Geist, Geist_Mono, Fraunces } from "next/font/google";` to `import { Geist, Geist_Mono } from "next/font/google";`. Delete the `const fraunces = Fraunces({ … });` block. Remove `fraunces.variable` from the `<html>`/`<body>` `className` list. Keep `geistSans` and `geistMono`.

- [ ] **Step 3: Verify.** Run: `npx tsc --noEmit && npm run build`. Expected: no unused-import error, builds clean.

- [ ] **Step 4: Replace lingering `font-heading` usages.** Run: `grep -rn "font-heading" src/`. For each hit, replace `font-heading` with `font-sans` (Geist is now the only display face). Re-run `grep -rn "font-heading" src/` — expect no results.

- [ ] **Step 5: Commit.**

```bash
git add src/app/layout.tsx src/
git commit -m "feat(design): drop Fraunces, Geist-only type"
```

---

## Task 3: Recolor tone maps to the design system

**Files:**
- Modify: `src/lib/requests/status.ts`

- [ ] **Step 1: Reassign `STATUS_META[*].tone`** to the design's pill map. In `STATUS_META`, set these `tone` values (leave `label`/`blurb`/`bucket`/`rail` unchanged):
  - `open` → `"slate"` (unchanged)
  - `sourcing` → `"blue"`
  - `candidate_sent` → `"amber"`
  - `approved` → `"blue"`
  - `purchased` → `"blue"`
  - `received` → `"amber"`
  - `shipped` → `"blue"`
  - `released` → `"emerald"` (unchanged)
  - `refunded` → `"slate"`
  - `cancelled` → `"slate"`

- [ ] **Step 2: Replace `TONE_BADGE`** with the design tints (collapsed onto the slate/blue/amber/emerald/red families; the design uses exactly these):

```ts
export const TONE_BADGE: Record<Tone, string> = {
  slate:   "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
  zinc:    "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
  blue:    "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25",
  indigo:  "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25",
  cyan:    "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25",
  amber:   "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  teal:    "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  rose:    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/25",
};
```

- [ ] **Step 3: Replace `TONE_DOT`** with the design dot colors:

```ts
export const TONE_DOT: Record<Tone, string> = {
  slate: "bg-slate-400",
  zinc: "bg-slate-400",
  blue: "bg-blue-700",
  indigo: "bg-blue-700",
  cyan: "bg-blue-700",
  amber: "bg-amber-600",
  emerald: "bg-emerald-600",
  teal: "bg-emerald-600",
  rose: "bg-red-600",
};
```

- [ ] **Step 4: Verify.** Run: `npx tsc --noEmit`. Expected: passes (the `Tone` union is unchanged, so `escrow/display.ts` still type-checks; its `indigo`/`emerald`/`rose` escrow tones now render in the design families automatically).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/requests/status.ts
git commit -m "feat(design): recolor status/escrow tones to handoff palette"
```

---

## Task 4: Presentation helpers (rail progress, escrow caption, deadline chip)

These power the dashboard card progress bar, money captions, and deadline chips. Pure functions → TDD.

**Files:**
- Create: `src/lib/requests/display.ts`
- Test: `src/lib/requests/display.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npx vitest run src/lib/requests/display.test.ts`
Expected: FAIL — `display.ts` does not export these.

- [ ] **Step 3: Implement `display.ts`.**

```ts
import type { MinCondition, RequestStatus } from "@/lib/db/types";
import { LIFECYCLE_RAIL, STATUS_META } from "@/lib/requests/status";

export interface RailProgress {
  total: number;
  filled: number;
  tone: "primary" | "success" | "muted";
}

/** Segmented progress for a request, matching the dashboard card bar. */
export function railProgress(status: RequestStatus): RailProgress {
  const total = LIFECYCLE_RAIL.length;
  const rail = STATUS_META[status].rail;
  if (rail === null) return { total, filled: 0, tone: "muted" };
  return {
    total,
    filled: rail + 1,
    tone: status === "released" ? "success" : "primary",
  };
}

export function escrowCaption(status: RequestStatus): string {
  switch (status) {
    case "released":
      return "Released";
    case "shipped":
      return "Held · releasing";
    case "refunded":
      return "Refunding to you";
    case "cancelled":
      return "Closed";
    default:
      return "Held in escrow";
  }
}

export interface DeadlineChip {
  label: string;
  tone: "warning" | "neutral";
}

export function deadlineChip(
  deadlineAt: string | null,
  status: RequestStatus,
  now: Date = new Date(),
): DeadlineChip | null {
  if (!deadlineAt) return null;
  if (STATUS_META[status].rail === null) return null;
  if (status === "shipped" || status === "released") return null;
  const ms = new Date(deadlineAt).getTime() - now.getTime();
  const days = Math.ceil(ms / 86_400_000);
  if (days <= 0) return { label: "Deadline passed", tone: "warning" };
  return {
    label: `${days} ${days === 1 ? "day" : "days"} left`,
    tone: days <= 4 ? "warning" : "neutral",
  };
}

const CONDITION_LABELS: Record<MinCondition, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  acceptable: "Acceptable",
  any: "Any condition",
};

export function conditionLabel(c: MinCondition): string {
  return CONDITION_LABELS[c];
}
```

Note: confirm the `MinCondition` type name in `src/lib/db/types.ts` (it may be `MinCondition` or a string-literal union on `Request`). If the exported name differs, import the correct one; if there is no named export, define the union inline from `Request["min_condition"]`.

- [ ] **Step 4: Run the test to verify it passes.**

Run: `npx vitest run src/lib/requests/display.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/requests/display.ts src/lib/requests/display.test.ts
git commit -m "feat(design): request presentation helpers + tests"
```

---

## Task 5: Update CLAUDE.md design-tokens section

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Locate** the "**Design tokens**" bullet under `## Conventions`.

- [ ] **Step 2: Replace** it with text describing the real system:

```md
- **Design tokens** (handoff system) live in `src/app/globals.css`: clean
  near-white ground (`#FCFCFD`), white cards, near-black ink, blue-700 indigo
  (`#1D4ED8`) as the single trust accent, emerald (`#047857`) for escrow/trust
  and amber (`#B45309`/`#D97706`) for action-needed — exposed as `--success`
  and `--warning` token families alongside the stock shadcn slots. Type is
  **Geist** (UI) + **Geist Mono** (ledger figures/codes/tracking) with the
  `.tnum` utility; there is no serif face. Status/escrow colors flow through
  the tone maps in `src/lib/requests/status.ts`. The locked reference prototype
  is `design/handoff/Finders Keepers.dc.html`.
```

- [ ] **Step 3: Commit.**

```bash
git add CLAUDE.md
git commit -m "docs: update design-tokens section for handoff system"
```

---

## Task 6: PlaceholderThumb component

A reusable diagonal-hatch placeholder for not-yet-real imagery (card fronts, proof photos, listing photos).

**Files:**
- Create: `src/components/ui/placeholder-thumb.tsx`

- [ ] **Step 1: Implement.**

```tsx
import { cn } from "@/lib/utils";

/**
 * Diagonal-hatch placeholder standing in for real imagery until Storage
 * uploads land. Matches the design prototype's thumbnails.
 */
export function PlaceholderThumb({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hatch flex items-end justify-center rounded-[10px] border border-input p-1.5",
        className,
      )}
    >
      {label ? (
        <span className="font-mono text-[8px] text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Verify.** Run: `npx tsc --noEmit`. Expected: passes.

- [ ] **Step 3: Commit.**

```bash
git add src/components/ui/placeholder-thumb.tsx
git commit -m "feat(design): hatch placeholder-thumb component"
```

---

## Task 7: Re-skin StatusBadge + EscrowBadge

Both already consume `TONE_BADGE`/`TONE_DOT` (recolored in Task 3). The design pill is `rounded-full px-2.5 py-1 text-[11px] font-medium` with a 6px dot. Only minor sizing tweaks needed.

**Files:**
- Modify: `src/components/requests/status-badge.tsx`
- Modify: `src/components/requests/escrow-badge.tsx`

- [ ] **Step 1: StatusBadge** — change the text size class from `text-xs` to `text-[11px]` and the dot from `size-1.5` to `size-1.5` (keep). Add `whitespace-nowrap`. Leave the tone wiring intact.

- [ ] **Step 2: EscrowBadge** — same `text-[11px]` + `whitespace-nowrap` tweak; keep the `Icon` + "Escrow · {label}" content.

- [ ] **Step 3: Verify.** Run: `npx tsc --noEmit && npm run lint`. Expected: passes.

- [ ] **Step 4: Commit.**

```bash
git add src/components/requests/status-badge.tsx src/components/requests/escrow-badge.tsx
git commit -m "feat(design): badge sizing to handoff spec"
```

---

## Task 8: Re-skin RequestCard to horizontal anatomy

Design "Horizontal" card (the prototype's "Currently live" option): thumb (62×84) · name + status pill · `set · grade` in mono · 8-segment progress bar · stage caption + "updated Xago" · money block pinned right (escrow caption / ¥ figure / local / deadline chip). Action-needed cards get an amber border.

**Files:**
- Modify: `src/components/dashboard/request-card.tsx`

- [ ] **Step 1: Replace the component** with the horizontal layout below. (`DashboardRequest` already carries `headline`, `escrowState`, `status`, `min_condition`, `rush_tier`, `updated_at`, `deadline_at`, `title`.)

```tsx
import Link from "next/link";
import type { DashboardRequest } from "@/lib/requests/queries";
import { STATUS_META } from "@/lib/requests/status";
import { formatJpy } from "@/lib/pricing";
import { formatRelativeTime } from "@/lib/dates";
import {
  railProgress,
  escrowCaption,
  deadlineChip,
} from "@/lib/requests/display";
import { StatusBadge } from "@/components/requests/status-badge";
import { PlaceholderThumb } from "@/components/ui/placeholder-thumb";
import { cn } from "@/lib/utils";

export function RequestCard({ request }: { request: DashboardRequest }) {
  const meta = STATUS_META[request.status];
  const needsAction = meta.bucket === "action_needed";
  const progress = railProgress(request.status);
  const chip = deadlineChip(request.deadline_at, request.status);

  return (
    <Link
      href={`/requests/${request.id}`}
      className={cn(
        "group flex items-center gap-[18px] rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(15,17,21,.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,17,21,.07)]",
        needsAction ? "border-warning-border" : "border-border",
      )}
    >
      <PlaceholderThumb label="card" className="h-[84px] w-[62px] shrink-0" />

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="min-w-0 flex-[0_1_auto] truncate text-[15px] font-[560] tracking-tight">
            {request.title}
          </span>
          <StatusBadge status={request.status} className="shrink-0" />
        </div>

        <div className="flex flex-wrap gap-1">
          {Array.from({ length: progress.total }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 max-w-[42px] flex-1 rounded-full",
                i < progress.filled
                  ? progress.tone === "success"
                    ? "bg-success"
                    : "bg-primary"
                  : "bg-border",
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{meta.blurb}</span>
          <span>·</span>
          <span>updated {formatRelativeTime(request.updated_at)}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[11.5px] text-muted-foreground">
          {escrowCaption(request.status)}
        </div>
        <div className="tnum mt-0.5 text-lg font-[600] tracking-tight">
          {formatJpy(request.headline.amountJpy)}
        </div>
        {chip && (
          <div
            className={cn(
              "tnum mt-2 inline-block rounded-md px-2 py-0.5 text-[11.5px] font-[540]",
              chip.tone === "warning"
                ? "bg-warning-muted text-warning"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {chip.label}
          </div>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Verify.** Run: `npx tsc --noEmit && npm run lint`. Expected: passes. If `bg-success`/`bg-warning-muted`/`text-warning` are not recognized, confirm the `--color-success*`/`--color-warning*` theme entries from Task 1 Step 2 exist.

- [ ] **Step 3: Visual check.** `npm run dev` → dashboard. Confirm horizontal cards with thumb, pill, progress bar, right-aligned money, deadline chips on urgent ones; action-needed cards show the amber border.

- [ ] **Step 4: Commit.**

```bash
git add src/components/dashboard/request-card.tsx
git commit -m "feat(design): horizontal request card"
```

---

## Task 9: Re-skin the dashboard page

Design order: page header → **escrow trust banner** (emerald, "¥X held safely across N hunts" + "Escrow active" chip) → **action-needed strip** (amber pulse dot + heading + count, action cards) → **all hunts** (heading + count, list of `RequestCard`). Keep the existing empty state.

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/dashboard/stats.tsx` (repurpose into the trust banner, or replace its usage)
- Modify: `src/components/dashboard/empty-state.tsx`

- [ ] **Step 1: Read** all three files and note how the page currently groups requests (it uses `BUCKET_META`/buckets from `status.ts`).

- [ ] **Step 2: Compute banner + strip data** in the page (server component). Total escrow = sum of `headline.amountJpy` for non-terminal requests whose `escrowState` is `held`/`pending` (use `STATUS_META[status].rail !== null`). Active count = those requests' length. Action requests = `requests.filter(r => STATUS_META[r.status].bucket === "action_needed")`.

- [ ] **Step 3: Build the trust banner** (replace `stats.tsx`'s body or inline it):

```tsx
// Escrow trust banner — emerald, sentence-led (design "Reassurance banner")
<div className="mb-3.5 flex items-center gap-[18px] rounded-2xl border border-success-border bg-card p-[18px_22px] shadow-[0_1px_2px_rgba(15,17,21,.04)]">
  <span className="grid size-[46px] shrink-0 place-items-center rounded-xl bg-success-muted">
    <ShieldCheck className="size-[22px] text-success" />
  </span>
  <div className="flex-1">
    <div className="text-[15px] font-[560] tracking-tight">
      <span className="tnum">{formatJpy(totalEscrow)}</span> held safely across{" "}
      {activeCount} {activeCount === 1 ? "hunt" : "hunts"}
    </div>
    <div className="mt-0.5 text-[13px] text-muted-foreground">
      Released only when each item ships. Refunded in full if we can&apos;t find it by the deadline.
    </div>
  </div>
  <span className="shrink-0 rounded-full bg-success-muted px-2.5 py-1 text-xs font-[540] text-success">
    Escrow active
  </span>
</div>
```

- [ ] **Step 4: Build the action-needed strip** above "All hunts" (only when `actionReqs.length > 0`):

```tsx
<div className="mb-3.5 mt-6 flex items-center gap-2.5">
  <span className="pulse-dot size-[7px] rounded-full bg-amber-600" />
  <h2 className="m-0 text-[13px] font-[600] uppercase tracking-[.02em] text-warning">
    Your action needed
  </h2>
  <span className="tnum text-xs text-muted-foreground">{actionReqs.length}</span>
</div>
<div className="mb-7 flex flex-col gap-3">
  {actionReqs.map((r) => (
    <RequestCard key={r.id} request={r} />
  ))}
</div>
```

- [ ] **Step 5: Build the "All hunts" header + list.**

```tsx
<div className="mb-3.5 mt-2 flex items-center gap-2.5">
  <h2 className="m-0 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">All hunts</h2>
  <span className="tnum text-xs text-muted-foreground">{requests.length}</span>
</div>
<div className="flex flex-col gap-3">
  {requests.map((r) => <RequestCard key={r.id} request={r} />)}
</div>
```

Keep the page header (`<h1>Your hunts</h1>` + sub + "New request" button styled as the primary button) and the existing empty-state branch when `requests.length === 0`.

- [ ] **Step 6: Re-skin `empty-state.tsx`** to the design: centered dashed-border panel (`border border-dashed border-input rounded-[18px] bg-secondary p-16`), search icon in a white rounded square, "Start your first hunt" heading, blurb, "Make a request" primary button → `/requests/new`. Use tokens only.

- [ ] **Step 7: Verify.** Run: `npx tsc --noEmit && npm run lint && npm run build`. Expected: passes.

- [ ] **Step 8: Visual check.** `npm run dev` → dashboard: trust banner, action strip with pulsing dot, all-hunts list; toggle to empty state by viewing a fresh account or temporarily returning `[]`.

- [ ] **Step 9: Commit.**

```bash
git add src/app/(app)/dashboard/page.tsx src/components/dashboard/
git commit -m "feat(design): dashboard trust banner, action strip, hunts list"
```

---

## Task 10: Re-skin the lifecycle rail

Design rail: vertical timeline, 14px dot + 2px connector, label left + timestamp right; done = filled primary, current = ring, todo = muted. The existing component is close — align colors to tokens and add a right-aligned timestamp slot.

**Files:**
- Modify: `src/components/requests/lifecycle-rail.tsx`

- [ ] **Step 1: Accept optional timestamps.** Change the signature to `LifecycleRail({ status, timestamps }: { status: RequestStatus; timestamps?: Partial<Record<RequestStatus, string>> })`.

- [ ] **Step 2: Recolor nodes/connectors to tokens** (already mostly `border-primary`/`bg-primary`) and ensure `released` uses success: when `status === "released"`, render done/current nodes with `bg-success border-success`. Off-rail banner: refunded → `border-warning-border bg-warning-muted text-warning`; cancelled → `bg-slate-100 text-slate-600 border-border`.

- [ ] **Step 3: Add the timestamp** to the right of each label row: `<span className="tnum whitespace-nowrap text-xs text-muted-foreground">{timestamps?.[step] ?? (done || current ? "" : "pending")}</span>` inside a `flex items-start justify-between gap-2.5` wrapper around the label.

- [ ] **Step 4: Verify.** Run: `npx tsc --noEmit && npm run lint`. Expected: passes.

- [ ] **Step 5: Commit.**

```bash
git add src/components/requests/lifecycle-rail.tsx
git commit -m "feat(design): lifecycle rail timestamps + token colors"
```

---

## Task 11: Re-skin the four-line price breakdown

Design "What you'll pay" card: white card, four rows (label + sub on left, ¥ + local on right), divider, "Total held" row. Keep the four-line constraint and `Order` keys exactly.

**Files:**
- Modify: `src/components/requests/price-breakdown.tsx`

- [ ] **Step 1: Update layout** to the card style: wrap in `rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,17,21,.04)]` with a `text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground` heading "What you'll pay". Rows: `flex items-baseline justify-between py-2.5 border-b border-[#F4F5F7]`; left `text-[13.5px]` label + `text-[11px] text-muted-foreground` note; right `tnum text-[13.5px] font-[540]`. Total row: `pt-3` `Total held` + `tnum text-[17px] font-[600]`.

- [ ] **Step 2: (Optional local currency)** keep JPY-only for now (per-line local-currency display is a Plan 2 / checkout concern); the `formatJpy` values stay.

- [ ] **Step 3: Verify.** Run: `npx tsc --noEmit && npm run lint`. Expected: passes.

- [ ] **Step 4: Commit.**

```bash
git add src/components/requests/price-breakdown.tsx
git commit -m "feat(design): four-line pricing card"
```

---

## Task 12: Re-skin the request detail page

Design: back link → header (thumb, name + pill, set·grade, progress bar, escrow figure right) → action banner (when attention needed) → two-column grid. LEFT: lifecycle card (rail), proof-photos grid (PlaceholderThumb ×3), hunter updates feed + "Message your hunter". RIGHT: four-line pricing card, escrow-status card (emerald), tracking card (when `shipped`), review/over-cap CTA.

**Files:**
- Modify: `src/app/(app)/requests/[id]/page.tsx`

- [ ] **Step 1: Read** the current detail page to see what data (`RequestDetail`) and components it already renders.

- [ ] **Step 2: Header block** — flex row: `PlaceholderThumb` (88×120), then name (`text-[25px] font-[600] tracking-tight truncate`) + `StatusBadge`, `set · grade` mono line (use `formatRelativeTime`/condition where applicable), the 8-segment progress bar (`railProgress`), and a right-aligned escrow figure (`escrowCaption` + `formatJpy(headline)` from the request's latest order/candidate/budget — reuse the same precedence as `queries.ts`).

- [ ] **Step 3: Action banner** — when `STATUS_META[status].bucket === "action_needed"`, show `border-warning-border bg-warning-muted` banner with an alert icon, message ("Candidate found — review it" for `candidate_sent`; "It arrived — final check" for `received`) and a primary "Review it" button linking to the (Plan 2) candidate/received route — for now link to `#` or the detail anchor and leave a `TODO(plan-2)` comment is NOT allowed; instead link to the request detail itself and render the button only when those routes exist. Since Plan 2 builds those routes, in THIS plan render the banner text without the CTA button (informational only).

- [ ] **Step 4: Two-column grid** `grid-cols-[1.55fr_1fr] gap-6` (stack on mobile). LEFT column cards (each `rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,17,21,.04)]`): "Lifecycle" (render `<LifecycleRail status={...} timestamps={...} />` deriving timestamps from candidate/order/shipment `created_at` where available), "Proof photos" (3 `PlaceholderThumb` in `grid-cols-3`, only when an order exists), "Updates from your hunter" (render real `messages` where `sender === "team"`, newest first, each as avatar + body + relative time; if none, hide the card). RIGHT column: `<PriceBreakdown order={latestOrder} />` when an order exists else a budget-cap summary, escrow-status card (emerald, "Your ¥X is held … released only when your item ships"), and a tracking card when `status === "shipped"` and a shipment with `tracking_number` exists (`font-mono` tracking + ETA + "Track package" button).

- [ ] **Step 5: Verify.** Run: `npx tsc --noEmit && npm run lint && npm run build`. Expected: passes.

- [ ] **Step 6: Visual check.** `npm run dev` → open a seeded request in each state (sourcing, candidate_sent, shipped). Confirm header, rail, pricing, escrow card, tracking card on shipped.

- [ ] **Step 7: Commit.**

```bash
git add src/app/(app)/requests/[id]/page.tsx
git commit -m "feat(design): request detail reskin"
```

---

## Task 13: Re-skin the sidebar + app shell

Design sidebar (256px): logo, primary "New request" button, nav (Dashboard, Messages, Order history, Account — Messages/History/Account route to Plan-2 pages, so render them but point at `/dashboard` until those routes exist OR omit until Plan 2), escrow-mini card (total held / N active hunts) pinned to bottom, "View public site" link. App shell main area scrolls.

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Read** `(app)/layout.tsx` to see the current shell (sidebar + main, topbar).

- [ ] **Step 2: Sidebar nav** — keep only routes that exist in this plan: "Dashboard" (`/dashboard`) and "New request" rendered as the top primary button (not a nav row). Add Messages / Order history / Account as **disabled-looking placeholder rows** ONLY if Plan 2 is being executed in the same branch; otherwise leave them out. Recommended for this plan: nav = `[{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }]` plus the primary "New request" button at top. (Plan 2 adds Messages/History/Account.)

- [ ] **Step 3: Primary "New request" button** at the top under the logo: full-width `h-10 rounded-[10px] bg-primary text-primary-foreground text-[13.5px] font-[540]` with a plus icon, linking to `/requests/new` (use `buttonVariants()` on a `<Link>` per the base-ui convention — NOT `asChild`).

- [ ] **Step 4: Escrow-mini card** pinned bottom (`mt-auto`): `rounded-xl border border-success-border bg-secondary p-3.5` showing a small shield + "Held in escrow", the total (`tnum text-lg font-[600]`), and "across N active hunts". The total needs data — make `Sidebar` accept `escrowTotal`/`activeCount` props and pass them from `(app)/layout.tsx` (which can call `getDashboardRequests()` and compute the same totals as Task 9). If the layout is a server component, fetch there and pass props into the client `Sidebar`.

- [ ] **Step 5: "View public site" link** below the escrow-mini → `/` (the landing arrives in Plan 2; the link is harmless now and 200s once `/` exists — currently `/` redirects to `/dashboard`, acceptable).

- [ ] **Step 6: Verify.** Run: `npx tsc --noEmit && npm run lint && npm run build`. Expected: passes.

- [ ] **Step 7: Commit.**

```bash
git add src/components/layout/sidebar.tsx src/app/(app)/layout.tsx
git commit -m "feat(design): sidebar with escrow mini + app shell"
```

---

## Task 14: Re-skin the create flow (6-step wizard)

Design: segmented step indicator + "Step N of 6", per-step content (0 item+refs, 1 condition ladder, 2 must/nice chips, 3 budget cap with live finder-fee preview, 4 rush tier, 5 review), footer nav (Back / Cancel / Continue, last step → "Continue to escrow deposit"). Keep the server action + prohibited-items checkpoint.

**Files:**
- Modify: `src/components/requests/request-form.tsx`
- Modify: `src/app/(app)/requests/new/page.tsx` (header/container only if needed)

- [ ] **Step 1: Read** `request-form.tsx` to see the current form (it may be single-page rather than a wizard) and the server action it calls.

- [ ] **Step 2: Wizard state** — client component with `step` state (0–5), the existing form fields preserved. Segmented indicator: 6 bars, filled `bg-primary` up to `step`, mono "Step {step+1} of 6" on the right. Titles array per design: `["What are you after?","Minimum condition you'll accept","Must-haves & nice-to-haves","Your budget cap","How fast do you need it?","Review your request"]`.

- [ ] **Step 3: Steps** — render each step's controls to the design (condition ladder as radio cards using `conditionLabel`; budget cap big numeric input with live finder-fee preview using `computeFinderFee(cap, rush)` and `formatJpy`; rush tier as radio cards using `RUSH_LABEL`). Reuse existing inputs/labels where present; restyle to tokens (`border-input`, focus ring `ring-primary/10`).

- [ ] **Step 4: Footer nav** — Back (hidden on step 0), Cancel (→ `/dashboard`), Continue (advances; on step 5 submits the existing server action). Per the four-line constraint, the budget step's preview shows the **finder's fee from `computeFinderFee`** (10%/¥1,500 min, rush multiplier) — NOT "12%".

- [ ] **Step 5: Keep the submit path** — final submit calls the existing create-request server action unchanged (prohibited-items `screenRequest()` checkpoint stays). After success it routes to `/dashboard` for now (Plan 2 introduces the checkout deposit route).

- [ ] **Step 6: Verify.** Run: `npx tsc --noEmit && npm run lint && npm run build`. Expected: passes. Submit a test request in dev; confirm it appears on the dashboard and a prohibited term is still blocked.

- [ ] **Step 7: Commit.**

```bash
git add src/components/requests/request-form.tsx src/app/(app)/requests/new/page.tsx
git commit -m "feat(design): create-flow wizard reskin"
```

---

## Task 15: Re-skin login + footer + remaining tokens

**Files:**
- Modify: `src/components/auth/login-form.tsx`
- Modify: `src/components/layout/footer.tsx`
- Modify: `src/components/brand/logo.tsx`
- Modify: `src/components/dashboard/stats.tsx` (if not already folded into Task 9)

- [ ] **Step 1: Logo** — match the design mark: a 26px circle (`stroke #1D4ED8`) with a 3.6r filled center dot + "Finders Keepers" wordmark (`font-[600] tracking-tight`). Render via inline SVG using `currentColor`/`text-primary`.

- [ ] **Step 2: Footer** — restyle to tokens (`border-t border-[#EEF0F3] bg-card`), keep the 特商法 (`/legal/tokushoho`), Terms, Privacy links. Constraint #3: footer stays on every page.

- [ ] **Step 3: Login form** — restyle inputs/buttons to tokens (primary button, `border-input` inputs, focus ring). No behavior change.

- [ ] **Step 4: Grep for stale tokens.** Run: `grep -rn "washi\|fraunces\|font-heading\|oklch(0.408" src/`. Expected: no results (washi/fraunces references gone).

- [ ] **Step 5: Verify.** Run: `npx tsc --noEmit && npm run lint && npm run build`. Expected: passes.

- [ ] **Step 6: Commit.**

```bash
git add src/components/auth/login-form.tsx src/components/layout/footer.tsx src/components/brand/logo.tsx src/components/dashboard/stats.tsx
git commit -m "feat(design): logo, footer, login reskin + token cleanup"
```

---

## Final verification

- [ ] **Step 1: Full check.** Run: `npm run lint && npx tsc --noEmit && npx vitest run && npm run build`. Expected: all pass.
- [ ] **Step 2: Walkthrough.** `npm run dev`: dashboard (trust banner, action strip, horizontal cards) → detail (rail, four-line pricing, escrow card, tracking on shipped) → create wizard (6 steps, fee preview) → login. Confirm Geist everywhere, no serif, blue-700/emerald/amber semantics, money is tabular.
- [ ] **Step 3:** Confirm the five constraints intact: four-line pricing present; escrow seam untouched; footer 特商法 link on every page; prohibited-items checkpoint still blocks; escrow + lifecycle visible on dashboard and detail.

---

## Notes for the executor

- **Base-ui, not Radix:** link-styled buttons use `buttonVariants()` on a `<Link>`; menu/button use the `render` prop, never `asChild`.
- **Custom font weights** (540/560) are valid against the Geist variable font — use arbitrary values like `font-[560]`.
- **`bg-success`/`text-warning` etc.** only work if Task 1 Step 2's `@theme inline` color slots were added. If a class is purged/unknown, that's the cause.
- **No state-machine or escrow changes** in this plan — purely presentational. Plan 2 wires checkout/approvals/messages/history/account and the public landing.
