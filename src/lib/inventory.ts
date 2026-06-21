/**
 * In-hand inventory — sealed boxes & cases we already hold and can ship now.
 * Mirrors design/available-inventory source. Prices are USD (pass-through item
 * price); claiming an item still runs through the normal request flow.
 */
export type InventoryItem = {
  /** Stable URL/lookup key. */
  slug: string;
  name: string;
  qty: number;
  priceUsd: number;
  /** Pricing unit, e.g. "ea" or "lot of 30". */
  unit: string;
  image: string;
  /** Sold only as a single lot/bundle (not per-unit). */
  bundle?: boolean;
};

export type InventoryCategory = {
  key: string;
  label: string;
  /** Accent color from the source inventory sheet. */
  color: string;
  items: InventoryItem[];
};

export const INVENTORY: InventoryCategory[] = [
  {
    key: "baseball",
    label: "Baseball",
    color: "#B8860B",
    items: [
      {
        slug: "topps-series1-japan-case",
        name: "2026 Topps Series 1 Japan Edition — Sealed Case",
        qty: 2,
        priceUsd: 1500,
        unit: "ea",
        image: "/inventory/topps-series1-japan-case.jpg",
      },
    ],
  },
  {
    key: "football",
    label: "Football",
    color: "#16A34A",
    items: [
      {
        slug: "topps-chrome-football",
        name: "2025 Topps Chrome Football — Fanatics Exclusive Mega Box",
        qty: 19,
        priceUsd: 120,
        unit: "ea",
        image: "/inventory/topps-chrome-football.jpg",
      },
      {
        slug: "topps-finest-football",
        name: "2025 Topps Finest Football — Hobby Box (Fanatics)",
        qty: 18,
        priceUsd: 700,
        unit: "ea",
        image: "/inventory/topps-finest-football.jpg",
      },
    ],
  },
  {
    key: "basketball",
    label: "Basketball",
    color: "#9333EA",
    items: [
      {
        slug: "bowman-nba-lot",
        name: "2025 Bowman NBA — Blaster Box (lot of 30)",
        qty: 30,
        priceUsd: 900,
        unit: "lot of 30",
        image: "/inventory/bowman-nba-blaster.jpg",
        bundle: true,
      },
      {
        slug: "signature-class-basketball",
        name: "2025-26 Topps Signature Class Basketball — Mega Case",
        qty: 20,
        priceUsd: 1600,
        unit: "case of 20",
        image: "/inventory/signature-class-basketball.jpg",
      },
    ],
  },
  {
    key: "pokemon",
    label: "Pokémon",
    color: "#2563EB",
    items: [
      {
        slug: "chaos-rising-etb",
        name: "Chaos Rising — Pokémon Center ETB",
        qty: 2,
        priceUsd: 180,
        unit: "ea",
        image: "/inventory/chaos-rising-etb.jpg",
      },
      {
        slug: "chaos-rising-booster-box",
        name: "Chaos Rising — Booster Box",
        qty: 1,
        priceUsd: 230,
        unit: "ea",
        image: "/inventory/chaos-rising-booster-box.jpg",
      },
    ],
  },
];

export const INVENTORY_COUNT = INVENTORY.reduce(
  (n, c) => n + c.items.length,
  0,
);

export function findInventoryItem(slug: string): InventoryItem | undefined {
  for (const cat of INVENTORY) {
    const hit = cat.items.find((i) => i.slug === slug);
    if (hit) return hit;
  }
  return undefined;
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}
