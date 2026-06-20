/**
 * In-hand inventory — sealed boxes & cases we already hold and can ship now.
 * Mirrors design/available-inventory source. Prices are USD (pass-through item
 * price); claiming an item still runs through the normal request flow.
 */
export type InventoryItem = {
  name: string;
  qty: number;
  priceUsd: number;
  /** Pricing unit, e.g. "ea" or "case of 20". */
  unit: string;
};

export type InventoryCategory = {
  key: string;
  label: string;
  emoji: string;
  /** Accent color from the source inventory sheet. */
  color: string;
  items: InventoryItem[];
};

export const INVENTORY: InventoryCategory[] = [
  {
    key: "baseball",
    label: "Baseball",
    emoji: "⚾",
    color: "#B8860B",
    items: [
      {
        name: "2026 Topps Series 1 Japan Edition — Sealed Case",
        qty: 2,
        priceUsd: 1500,
        unit: "ea",
      },
    ],
  },
  {
    key: "football",
    label: "Football",
    emoji: "🏈",
    color: "#16A34A",
    items: [
      {
        name: "2025 Topps Chrome Football — Fanatics Exclusive Mega Box",
        qty: 19,
        priceUsd: 120,
        unit: "ea",
      },
      {
        name: "2025 Topps Finest Football — Hobby Box (Fanatics)",
        qty: 18,
        priceUsd: 700,
        unit: "ea",
      },
    ],
  },
  {
    key: "basketball",
    label: "Basketball",
    emoji: "🏀",
    color: "#9333EA",
    items: [
      {
        name: "2025 Bowman NBA — Blaster Box",
        qty: 30,
        priceUsd: 30,
        unit: "ea",
      },
      {
        name: "2025-26 Topps Signature Class Basketball — Mega Case",
        qty: 20,
        priceUsd: 1600,
        unit: "case of 20",
      },
    ],
  },
  {
    key: "pokemon",
    label: "Pokémon",
    emoji: "🎴",
    color: "#2563EB",
    items: [
      {
        name: "Chaos Rising — Pokémon Center ETB",
        qty: 2,
        priceUsd: 180,
        unit: "ea",
      },
      {
        name: "Chaos Rising — Booster Box",
        qty: 1,
        priceUsd: 230,
        unit: "ea",
      },
    ],
  },
];

export const INVENTORY_COUNT = INVENTORY.reduce(
  (n, c) => n + c.items.length,
  0,
);

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}
