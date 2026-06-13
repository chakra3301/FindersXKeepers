/**
 * Prohibited-items checkpoint.
 *
 * This is a REAL gate, not a TODO: request creation runs every submission
 * through `screenRequest` and blocks anything that matches. The term list is a
 * stub — replace it with a maintained policy list / compliance service — but
 * the checkpoint itself is wired into the create flow from day one.
 */

export interface ProhibitedCategory {
  category: string;
  reason: string;
  terms: string[];
}

export const PROHIBITED_CATEGORIES: ProhibitedCategory[] = [
  {
    category: "Weapons & munitions",
    reason: "Firearms, ammunition, and weapons cannot be sourced or exported.",
    terms: [
      "gun",
      "firearm",
      "handgun",
      "rifle",
      "pistol",
      "ammunition",
      "ammo",
      "explosive",
      "grenade",
      "katana sword", // real blades are export-restricted; replicas handled by review
    ],
  },
  {
    category: "Drugs & controlled substances",
    reason: "Controlled substances and drug paraphernalia are prohibited.",
    terms: ["cocaine", "heroin", "cannabis", "marijuana", "mdma", "narcotic"],
  },
  {
    category: "Protected wildlife (CITES)",
    reason: "Ivory and protected-species products are export-prohibited.",
    terms: ["ivory", "rhino horn", "tortoiseshell", "pangolin", "whale meat"],
  },
  {
    category: "Counterfeit goods",
    reason: "We source authentic goods only — no replicas or counterfeits.",
    terms: ["counterfeit", "replica", "fake brand", "knockoff", "bootleg"],
  },
  {
    category: "Currency & financial instruments",
    reason: "Cash, cards, and monetary instruments cannot be shipped.",
    terms: ["cash", "banknote", "credit card", "gift card", "cryptocurrency wallet"],
  },
  {
    category: "Hazardous materials",
    reason: "Hazardous and flammable materials cannot be shipped by air.",
    terms: ["fireworks", "flammable", "corrosive", "radioactive", "toxic gas"],
  },
  {
    category: "Living things & perishables",
    reason: "Live animals, plants, and perishable foods are not shippable.",
    terms: ["live animal", "live plant", "seeds", "perishable food"],
  },
  {
    category: "Adult / illegal content",
    reason: "Illegal or exploitative content is strictly prohibited.",
    terms: ["child", "explicit minor"],
  },
];

export interface ScreenInput {
  title: string;
  description?: string | null;
  mustHaves?: string[];
  niceToHaves?: string[];
}

export interface ScreenMatch {
  term: string;
  category: string;
  reason: string;
}

export interface ScreenResult {
  allowed: boolean;
  matches: ScreenMatch[];
}

function matchesTerm(haystack: string, term: string): boolean {
  // Word-ish boundary match to limit false positives (e.g. "gun" not in "begun").
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i");
  return pattern.test(haystack);
}

/**
 * Screen a request against the blocklist. Returns every category it trips so
 * the UI can explain exactly why something was blocked.
 */
export function screenRequest(input: ScreenInput): ScreenResult {
  const haystack = [
    input.title,
    input.description ?? "",
    ...(input.mustHaves ?? []),
    ...(input.niceToHaves ?? []),
  ]
    .join(" \n ")
    .toLowerCase();

  const matches: ScreenMatch[] = [];
  for (const cat of PROHIBITED_CATEGORIES) {
    for (const term of cat.terms) {
      if (matchesTerm(haystack, term.toLowerCase())) {
        matches.push({ term, category: cat.category, reason: cat.reason });
      }
    }
  }

  return { allowed: matches.length === 0, matches };
}
