import { describe, expect, it } from "vitest";
import { mapScryfallCard, parseScryfallTypeLine, scryfallNumericStat, type ScryfallCard } from "./scryfall.mapper";

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
  uri: "https://api.scryfall.com/cards/scry-1",
  scryfall_uri: "https://scryfall.com/card/mh3/123/lightning-sample",
};

describe("scryfall mapper", () => {
  it("keeps Artifact and Creature from a compound type line", () => {
    expect(parseScryfallTypeLine("Legendary Artifact Creature — Construct")).toEqual({
      cardTypes: ["ARTIFACT", "CREATURE"],
      supertypes: ["LEGENDARY"],
      subtypes: ["CONSTRUCT"],
    });
  });

  it("only numerizes finite power/toughness", () => {
    expect(scryfallNumericStat("3")).toBe(3);
    expect(scryfallNumericStat("*")).toBeNull();
    expect(scryfallNumericStat("1+*")).toBeNull();
  });

  it("maps instant attributes without treating type_line as a single cardType", () => {
    const mapped = mapScryfallCard(base);
    expect(mapped.attributes.cardTypes).toEqual(["INSTANT"]);
    expect(mapped.attributes.powerNumeric).toBeNull();
    expect(mapped.attributes.source).toBe("scryfall");
    expect(mapped.variants[0]?.externalIds.scryfallId).toBe("scry-1");
  });
});
