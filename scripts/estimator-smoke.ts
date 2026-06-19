/**
 * Live smoke test for the pricing estimator. Run:
 *   node --env-file=.env.local --import tsx scripts/estimator-smoke.ts
 *
 * Confirms the configured gateway (opencode / DeepSeek) + Exa grounding actually
 * return usable figures. `source: "deepseek"` = real model; `"fallback"`/`"stub"`
 * = the model call failed and you got the deterministic estimate instead.
 */
import { estimator } from "@/lib/estimator";

const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

async function run() {
  console.info(`Provider: ${estimator.name}\n`);

  const items = [
    {
      title: "PSA 10 Mega Charizard X ex — SAR 110/080",
      description: "Japanese SAR, gem mint graded",
      minCondition: "like_new" as const,
      budgetCapJpy: 80_000,
    },
    {
      title: "WTAPS jacket",
      description: "vintage archive, size L, good condition",
      minCondition: "good" as const,
      budgetCapJpy: 40_000,
    },
  ];

  for (const item of items) {
    console.info(`── ${item.title}`);
    const v = await estimator.estimateItemValue(item);
    console.info(
      `  value:    ${yen(v.itemValueJpy)}  (range ${yen(v.lowJpy)}–${yen(v.highJpy)})`,
    );
    console.info(`  source:   ${v.source}  ·  category: ${v.category ?? "—"}  ·  conf: ${v.confidence}`);
    if (v.sources?.length) console.info(`  sources:  ${v.sources.join(", ")}`);
    if (v.rationale) console.info(`  why:      ${v.rationale}`);

    const s = await estimator.estimateShipping({
      title: item.title,
      description: item.description,
      minCondition: item.minCondition,
      destinationCountry: "US",
    });
    console.info(`  shipping: ${yen(s.shippingJpy)}  (${s.source}${s.carrier ? `, ${s.carrier}` : ""})`);
    if (s.rationale) console.info(`  ship why: ${s.rationale}`);
    console.info("");
  }
}

run().catch((e) => {
  console.error("smoke failed:", e);
  process.exit(1);
});
