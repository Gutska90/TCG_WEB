import { describe, expect, it } from "vitest";
import { mapScryfallCard, mapScryfallFinishes, type ScryfallCard } from "./scryfall.mapper";

const base: ScryfallCard = {
  id: "scry-1",
  name: "Lightning Sample",
  lang: "en",
  set: "mh3",
  set_name: "Modern Horizons 3",
  collector_number: "123",
  rarity: "rare",
  type_line: "Instant",
  foil: true,
  nonfoil: true,
  finishes: ["nonfoil", "foil"],
  image_uris: { normal: "https://cards.scryfall.io/normal/front/sample.jpg" },
};

describe("scryfall mapper", () => {
  it("maps finishes from the finishes array", () => {
    expect(mapScryfallFinishes(base)).toEqual(["NORMAL", "FOIL"]);
  });

  it("creates EN variants and keeps game-specific data in attributes", () => {
    const mapped = mapScryfallCard(base);
    expect(mapped.slug).toBe("lightning-sample");
    expect(mapped.number).toBe("123");
    expect(mapped.variants).toHaveLength(2);
    expect(mapped.variants.some((row) => row.isDefault && row.finish === "NORMAL")).toBe(true);
    expect(mapped.attributes.source).toBe("scryfall");
    expect(mapped.attributes.manaValue).toBeNull();
    expect(mapped.attributes.cardType).toBe("Instant");
    expect(mapped.variants[0]?.externalIds.scryfallId).toBe("scry-1");
  });
});
