import { describe, expect, it } from "vitest";
import { classifyCategory, itemValueSkill, shippingSkill } from "./pricing-skill";

describe("classifyCategory", () => {
  it("routes graded Pokémon cards to trading_card", () => {
    expect(classifyCategory("PSA 10 Charizard SAR 110/080")).toBe("trading_card");
  });
  it("routes sneakers", () => {
    expect(classifyCategory("Nike Air Jordan 1 Dunk", "DS, size 27cm")).toBe("sneakers");
  });
  it("routes archive clothing to apparel", () => {
    expect(classifyCategory("WTAPS jacket", "vintage, size L")).toBe("apparel");
  });
  it("routes watches", () => {
    expect(classifyCategory("Grand Seiko automatic diver")).toBe("watch");
  });
  it("falls back to general for unknown items", () => {
    expect(classifyCategory("handmade ceramic mug")).toBe("general");
  });
});

describe("skills inject trusted sources", () => {
  it("item-value names category sources", () => {
    const s = itemValueSkill({ title: "Charizard PSA 10", minCondition: "good" });
    expect(s.category).toBe("trading_card");
    expect(s.system).toContain("TCGplayer");
    expect(s.sources.join(" ")).toMatch(/PriceCharting/);
  });
  it("shipping names real carriers + a weight band", () => {
    const s = shippingSkill({ title: "Nike Dunk", minCondition: "new", destinationCountry: "US" });
    expect(s.system).toContain("DHL");
    expect(s.user).toContain("1.5");
  });
});
