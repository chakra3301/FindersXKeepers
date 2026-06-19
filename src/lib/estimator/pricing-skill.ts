import type {
  ItemValueEstimateInput,
  ShippingEstimateInput,
} from "./types";

/**
 * The pricing "skill" the DeepSeek estimator is given.
 *
 * Two jobs:
 *  1. Classify the item into a category from its title/description.
 *  2. Inject the TRUSTED reference marketplaces + valuation method for that
 *     category (cards → TCGplayer / PriceCharting, clothing → Grailed, sneakers
 *     → StockX, shipping → DHL / FedEx / EMS, …) so the model anchors its
 *     estimate on how those sites actually price, not a vague guess.
 *
 * Note on "the web": deepseek-chat has no live browsing, so this grounds the
 * model on its knowledge of these sources. A real-time search step can be added
 * later behind `groundWithWeb()` (see deepseek.ts) without touching this skill.
 */
export type ItemCategory =
  | "trading_card"
  | "sneakers"
  | "apparel"
  | "watch"
  | "camera"
  | "video_game"
  | "figure"
  | "general";

interface CategorySpec {
  /** Lower-cased keywords that map an item into this category. */
  keywords: string[];
  /** Trusted reference marketplaces, most authoritative first. */
  sources: string[];
  /** Domains to restrict the live Exa web search to (the same trusted sites). */
  domains: string[];
  /** How to price in this category — fed to the model as guidance. */
  method: string;
  /** Typical shipped weight band from Japan, for the shipping estimate. */
  weight: string;
}

const CATEGORIES: Record<Exclude<ItemCategory, "general">, CategorySpec> = {
  trading_card: {
    keywords: [
      "pokemon", "ポケモン", "charizard", "リザードン", "tcg", "psa", "bgs", "cgc",
      "graded", "mtg", "magic the gathering", "yugioh", "yu-gi-oh", "遊戯王",
      "vmax", "vstar", " ex ", "sar", "holo", "card", "カード", "sports card",
      "topps", "panini",
    ],
    sources: [
      "TCGplayer (market price)", "PriceCharting", "eBay sold/completed listings",
      "Cardmarket", "PSA Price Guide", "Yahoo! Auctions Japan", "Mercari Japan",
    ],
    domains: [
      "tcgplayer.com", "pricecharting.com", "cardmarket.com",
      "psacard.com",
    ],
    method:
      "Price from recent SOLD listings, not asking prices. Grade (PSA/BGS/CGC) and set/rarity (e.g. SAR, 1st edition) dominate value; raw vs graded differs hugely.",
    weight: "very light, ~0.1–0.5 kg (toploader/graded slab in a small box)",
  },
  sneakers: {
    keywords: [
      "nike", "jordan", "air force", "dunk", "yeezy", "adidas", "new balance",
      "asics", "sneaker", "sneakers", "スニーカー", "sb ", "samba", "salomon",
    ],
    sources: [
      "StockX (last sale)", "GOAT", "SNKRDUNK (Japan)", "Grailed", "Mercari Japan",
    ],
    domains: ["stockx.com", "goat.com", "snkrdunk.com", "grailed.com"],
    method:
      "Use last-sale prices for the exact style code + size. Deadstock (DS) vs used and size rarity move price; Japan-exclusive colorways trade higher locally.",
    weight: "boxed, ~1.5–3 kg",
  },
  apparel: {
    keywords: [
      "supreme", "comme des garcons", "cdg", "wtaps", "neighborhood", "kapital",
      "visvim", "archive", "vintage", "denim", "jeans", "jacket", "hoodie",
      "tee", "shirt", "coat", "knit", "size m", "size l", "size xl", "服",
    ],
    sources: [
      "Grailed (sold)", "Mercari Japan", "Yahoo! Auctions Japan", "Rakuma", "Vinted/Depop",
    ],
    domains: ["grailed.com", "mercari.com", "vinted.com", "depop.com"],
    method:
      "Match brand + exact piece + size + condition against sold comps. Archive/collab pieces and Japanese-market sizing affect price; flaws reduce sharply.",
    weight: "~0.4–2 kg depending on garment",
  },
  watch: {
    keywords: [
      "watch", "時計", "seiko", "grand seiko", "casio", "g-shock", "gshock",
      "citizen", "rolex", "omega", "tissot", "chronograph", "diver", "automatic",
    ],
    sources: [
      "Chrono24", "WatchCharts", "Yahoo! Auctions Japan", "Rakuten", "Mercari Japan",
    ],
    domains: ["chrono24.com", "watchcharts.com"],
    method:
      "Reference, box/papers, and condition drive value. Use Chrono24/WatchCharts market data; JDM models often cheaper in Japan. Price insured.",
    weight: "~0.4–1 kg, insured",
  },
  camera: {
    keywords: [
      "camera", "lens", "nikon", "canon", "sony", "fujifilm", "fuji", "leica",
      "olympus", "pentax", "ricoh", "contax", "カメラ", "レンズ",
    ],
    sources: [
      "Map Camera (Japan)", "Kakaku.com", "eBay sold listings", "Mercari Japan", "Suruga-ya",
    ],
    domains: ["mapcamera.com", "kakaku.com"],
    method:
      "Grade on cosmetic + optical condition (haze/fungus/dust). Map Camera grades are the JDM benchmark; bodies and lenses priced separately.",
    weight: "~0.8–3 kg, padded",
  },
  video_game: {
    keywords: [
      "famicom", "super famicom", "nintendo", "game boy", "gameboy", "sega",
      "saturn", "ps1", "ps2", "playstation", "cartridge", "ソフト", "retro game",
      "switch", "amiibo",
    ],
    sources: [
      "PriceCharting", "Suruga-ya (Japan)", "Mercari Japan", "Yahoo! Auctions Japan", "eBay sold",
    ],
    domains: ["pricecharting.com", "suruga-ya.jp"],
    method:
      "Use PriceCharting loose/CIB/new columns. Complete-in-box and region (JP/NTSC-J) matter; manuals and spine cards add value.",
    weight: "~0.3–1.2 kg",
  },
  figure: {
    keywords: [
      "figure", "figma", "nendoroid", "gundam", "gunpla", "plush", "statue",
      "フィギュア", "プラモ", "amiibo", "scale figure", "prize figure",
    ],
    sources: [
      "Mandarake", "Suruga-ya", "Mercari Japan", "Yahoo! Auctions Japan", "AmiAmi",
    ],
    domains: ["mandarake.co.jp", "suruga-ya.jp", "amiami.com"],
    method:
      "Sealed vs opened and exclusivity drive price. Mandarake/Suruga-ya are the JDM benchmarks; limited/event editions trade higher.",
    weight: "~0.5–2 kg, boxed and padded",
  },
};

const GENERAL: CategorySpec = {
  keywords: [],
  sources: [
    "Mercari Japan", "Yahoo! Auctions Japan", "Rakuten", "eBay sold listings",
  ],
  domains: ["mercari.com", "rakuten.co.jp"],
  method:
    "Match the exact item against recent sold comps on Japanese marketplaces; use eBay sold listings as an international cross-check.",
  weight: "~0.5–2 kg",
};

const CARRIERS =
  "DHL Express, FedEx International Priority, UPS, and Japan Post EMS";

/** Carrier domains for live shipping-rate grounding. */
export const SHIPPING_DOMAINS = [
  "dhl.com", "fedex.com", "ups.com", "post.japanpost.jp",
];

/** Heuristic category from the item text. Deterministic + cheap (no model call). */
export function classifyCategory(
  title: string,
  description?: string | null,
): ItemCategory {
  const hay = `${title} ${description ?? ""}`.toLowerCase();
  let best: ItemCategory = "general";
  let bestHits = 0;
  for (const [cat, spec] of Object.entries(CATEGORIES) as [
    Exclude<ItemCategory, "general">,
    CategorySpec,
  ][]) {
    const hits = spec.keywords.reduce(
      (n, k) => (hay.includes(k) ? n + 1 : n),
      0,
    );
    if (hits > bestHits) {
      bestHits = hits;
      best = cat;
    }
  }
  return best;
}

function specFor(category: ItemCategory): CategorySpec {
  return category === "general" ? GENERAL : CATEGORIES[category];
}

export interface SkillMessages {
  system: string;
  user: string;
  category: ItemCategory;
  sources: string[];
  /** Domains to restrict a live web search to for this estimate. */
  domains: string[];
}

/** Build the item-value prompt grounded in the category's trusted sources. */
export function itemValueSkill(input: ItemValueEstimateInput): SkillMessages {
  const category = classifyCategory(input.title, input.description);
  const spec = specFor(category);
  const system = [
    "You are a Japanese-market sourcing pricing analyst.",
    `Category: ${category.replace("_", " ")}.`,
    `Price the item the way these trusted sources do: ${spec.sources.join(", ")}.`,
    `Method: ${spec.method}`,
    "Base figures on recent SOLD prices, not asking prices. Output yen (JPY).",
    "If genuinely uncertain, widen the low/high range and lower confidence rather than guessing a point value.",
  ].join("\n");
  const user = [
    `Item: ${input.title}`,
    input.description ? `Details: ${input.description}` : null,
    `Minimum acceptable condition: ${input.minCondition}`,
    input.mustHaves?.length ? `Must have: ${input.mustHaves.join(", ")}` : null,
    input.niceToHaves?.length ? `Nice to have: ${input.niceToHaves.join(", ")}` : null,
    "",
    "Estimate the typical Japanese second-hand price and a plausible range.",
    "Respond as JSON:",
    '{"itemValueJpy": number, "lowJpy": number, "highJpy": number,',
    ' "confidence": number /*0..1*/, "sources": string[] /*which you reasoned from*/,',
    ' "rationale": string /*one sentence*/ }',
  ]
    .filter(Boolean)
    .join("\n");
  return { system, user, category, sources: spec.sources, domains: spec.domains };
}

/** Build the shipping prompt grounded in real carriers + a category weight band. */
export function shippingSkill(input: ShippingEstimateInput): SkillMessages {
  const category = classifyCategory(input.title, input.description);
  const spec = specFor(category);
  const system = [
    "You estimate international parcel shipping FROM JAPAN to an overseas buyer.",
    `Use the published international rates of ${CARRIERS} as your anchor.`,
    "Account for destination zone, a tracked + insured service, and protective packaging.",
    "Pick a realistic mid-market courier price (not the cheapest untracked option). Output yen (JPY).",
  ].join("\n");
  const user = [
    `Item: ${input.title}`,
    input.description ? `Details: ${input.description}` : null,
    `Category: ${category.replace("_", " ")} — typical shipped weight ${spec.weight}.`,
    `Minimum condition: ${input.minCondition}`,
    `Destination country: ${input.destinationCountry ?? "unknown (assume USA)"}`,
    "",
    "Estimate the all-in shipping cost including packaging.",
    "Respond as JSON:",
    '{"shippingJpy": number, "carrier": string, "sources": string[], "rationale": string}',
  ]
    .filter(Boolean)
    .join("\n");
  return { system, user, category, sources: [CARRIERS], domains: SHIPPING_DOMAINS };
}
