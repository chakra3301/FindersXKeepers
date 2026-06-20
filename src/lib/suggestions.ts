/**
 * Curated "popular hunts" shown as 3D suggestion cards on the dashboard.
 * `prefill` is passed to /requests/new?title=… so a click starts the request
 * with the title already filled in.
 */
export type Suggestion = {
  title: string;
  category: string;
  image: string;
  prefill: string;
};

export const SUGGESTIONS: Suggestion[] = [
  {
    title: "Nissan Skyline R34",
    category: "JDM · cars",
    image: "/suggestions/r34-skyline.png",
    prefill: "1998 Nissan Skyline R34 GT-R",
  },
  {
    title: "Canon Canonet QL17 GIII",
    category: "Film cameras",
    image: "/suggestions/canon-ql17.jpg",
    prefill: "Canon Canonet QL17 GIII rangefinder",
  },
  {
    title: "One Piece OP-05 Booster Box",
    category: "TCG · sealed",
    image: "/suggestions/op05-booster-box.png",
    prefill: "One Piece OP-05 Awakening of the New Era Booster Box (JP)",
  },
  {
    title: "Platinum 3776 Century",
    category: "Stationery",
    image: "/suggestions/platinum-3776.png",
    prefill: "Platinum 3776 Century fountain pen",
  },
  {
    title: "Kagayaki CarboNext Gyuto",
    category: "Kitchen · knives",
    image: "/suggestions/carbonext-gyuto.png",
    prefill: "JCK Original Kagayaki CarboNext Series Gyuto",
  },
  {
    title: "Sayaka / Ikuyo Matcha",
    category: "Matcha · food",
    image: "/suggestions/sayaka-ikuyo-matcha.png",
    prefill: "Sayaka-no-mukashi 100g / Ikuyo-no-mukashi 100g matcha",
  },
  {
    title: "Lion Pair Acne Cream W",
    category: "Beauty · health",
    image: "/suggestions/pair-acne-cream.png",
    prefill: "Lion Pair Acne Cream W 14g",
  },
  {
    title: "ILLIT — I Got Your Back",
    category: "K-pop · J-release",
    image: "/suggestions/illit-i-got-your-back.png",
    prefill:
      "ILLIT Japan 2nd Single: I Got Your Back × FRUITS Special Edition",
  },
  {
    title: "Sugar Cane × Hinoya Denim",
    category: "Denim · apparel",
    image: "/suggestions/sugar-cane-hinoya-denim.png",
    prefill: "Sugar Cane Hinoya 16.25oz denim",
  },
  {
    title: "Kinoko no Yama",
    category: "Snacks · food",
    image: "/suggestions/kinoko-no-yama.jpg",
    prefill: "Meiji Kinoko no Yama chocolate biscuits",
  },
  {
    title: "Black Thunder",
    category: "Snacks · food",
    image: "/suggestions/black-thunder.jpg",
    prefill: "Black Thunder chocolate bar (Japan)",
  },
  {
    title: "Jagarico",
    category: "Snacks · food",
    image: "/suggestions/jagarico.jpg",
    prefill: "Calbee Jagarico potato sticks",
  },
];
