import { describe, expect, it } from "vitest";
import { mapPokemonTcgCard } from "./pokemon-tcg.mapper";

describe("pokemon tcg mapper", () => {
  it("maps Venusaur-EX xy1-1 provider shape without inventing regulationMark", () => {
    const mapped = mapPokemonTcgCard(
      {
        id: "xy1-1",
        name: "Venusaur-EX",
        supertype: "Pokémon",
        subtypes: ["Basic", "EX"],
        hp: "180",
        types: ["Grass"],
        evolvesTo: ["M Venusaur-EX"],
        convertedRetreatCost: 4,
        weaknesses: [{ type: "Fire", value: "×2" }],
        attacks: [
          { cost: ["Grass", "Colorless", "Colorless"], convertedEnergyCost: 3 },
          { cost: ["Grass", "Grass", "Colorless", "Colorless"], convertedEnergyCost: 4 },
        ],
        artist: "Eske Yoshinob",
        rarity: "Rare Holo EX",
        number: "1",
        legalities: { unlimited: "Legal", expanded: "Legal" },
        images: { large: "https://images.pokemontcg.io/xy1/1_hires.png" },
      },
      "2026-08-30T20:00:00.000Z",
    );
    expect(mapped.attributes.cardType).toBe("POKEMON");
    expect(mapped.attributes.subtypes).toEqual(["BASIC", "EX"]);
    expect(mapped.attributes.pokemonTypes).toEqual(["GRASS"]);
    expect(mapped.attributes.hp).toBe(180);
    expect(mapped.attributes.retreatCost).toBe(4);
    expect(mapped.attributes.weaknessTypes).toEqual(["FIRE"]);
    expect(mapped.attributes.regulationMark).toBeUndefined();
    expect(mapped.variants[0]?.externalIds.pokemonTcgApiId).toBe("xy1-1");
  });
});
