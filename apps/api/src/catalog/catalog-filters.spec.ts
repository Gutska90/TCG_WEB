import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import {
  GAME_FILTER_DEFINITIONS,
  getGameFilterDefinition,
  isFilterVisible,
  isSyntheticCardAttributes,
  normalizeCatalogCode,
  presentAttributeFields,
  resolveAttrFilterKey,
  sortAllowedForGame,
} from "@tcg/config";
import { inspectCardAttributes } from "@tcg/validation";
import { assertSearchFilters } from "../search/search-filters";
import { AppError } from "../common/errors/app-error";

describe("CATALOG.1/2 filter definitions", () => {
  it("does not mark any game FULL without a complete importer", () => {
    for (const definition of Object.values(GAME_FILTER_DEFINITIONS)) {
      expect(definition.support).toBe("PARTIAL");
    }
  });

  it("normalizes fire aliases", () => {
    expect(normalizeCatalogCode("Fuego")).toBe("FIRE");
    expect(normalizeCatalogCode("fire")).toBe("FIRE");
  });

  it("hides HP unless Pokémon card type is selected, including Energy", () => {
    const hp = getGameFilterDefinition("pokemon").filters.find((filter) => filter.key === "hp");
    expect(hp).toBeTruthy();
    expect(isFilterVisible(hp!, {})).toBe(false);
    expect(isFilterVisible(hp!, { cardType: ["POKEMON"] })).toBe(true);
    expect(isFilterVisible(hp!, { cardType: ["TRAINER"] })).toBe(false);
    expect(isFilterVisible(hp!, { cardType: ["ENERGY"] })).toBe(false);
  });

  it("does not invent MyL demo races as labels", () => {
    const raza = getGameFilterDefinition("mitos-y-leyendas").filters.find((filter) => filter.key === "raza");
    expect(raza?.labels).toBeUndefined();
  });

  it("rejects a Pokémon filter on Magic", () => {
    expect(() =>
      assertSearchFilters({
        page: 1,
        pageSize: 20,
        sort: "relevance",
        game: "magic",
        attrs: { pokemonType: ["FIRE"] },
      }),
    ).toThrow(AppError);
    try {
      assertSearchFilters({
        page: 1,
        pageSize: 20,
        sort: "relevance",
        game: "magic",
        attrs: { pokemonType: ["FIRE"] },
      });
    } catch (error) {
      expect(error).toMatchObject({ code: ERROR_CODES.FILTER_NOT_SUPPORTED_FOR_GAME });
    }
  });

  it("rejects unknown attr keys", () => {
    try {
      assertSearchFilters({
        page: 1,
        pageSize: 20,
        sort: "relevance",
        game: "pokemon",
        attrs: { banana: ["x"] },
      });
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toMatchObject({ code: ERROR_CODES.INVALID_FILTER });
    }
  });

  it("accepts Pokémon type, rarity and HP range", () => {
    expect(() =>
      assertSearchFilters({
        page: 1,
        pageSize: 20,
        sort: "relevance",
        game: "pokemon",
        rarity: "Rare",
        attrs: { pokemonType: ["FIRE"], hpMin: ["50"], hpMax: ["200"] },
      }),
    ).not.toThrow();
  });

  it("accepts Yu-Gi-Oh Monster + DARK + Dragon + ATK", () => {
    expect(() =>
      assertSearchFilters({
        page: 1,
        pageSize: 20,
        sort: "relevance",
        game: "yugioh",
        attrs: { category: ["MONSTER"], attribute: ["DARK"], monsterType: ["DRAGON"], atkMin: ["2000"] },
      }),
    ).not.toThrow();
  });

  it("accepts Magic color + type + mana value", () => {
    expect(() =>
      assertSearchFilters({
        page: 1,
        pageSize: 20,
        sort: "relevance",
        game: "magic",
        attrs: { colors: ["U"], cardType: ["Instant"], manaValueMax: ["3"] },
      }),
    ).not.toThrow();
  });

  it("accepts MyL Aliado + raza + coste", () => {
    expect(() =>
      assertSearchFilters({
        page: 1,
        pageSize: 20,
        sort: "relevance",
        game: "mitos-y-leyendas",
        attrs: { cardType: ["ALIADO"], raza: ["ANCESTRAL"], costeMax: ["3"] },
      }),
    ).not.toThrow();
  });

  it("accepts Digimon color + level and Gundam type + color + level without inventing options", () => {
    expect(() =>
      assertSearchFilters({
        page: 1,
        pageSize: 20,
        sort: "relevance",
        game: "digimon",
        attrs: { color: ["RED"], levelMin: ["3"] },
      }),
    ).not.toThrow();
    expect(() =>
      assertSearchFilters({
        page: 1,
        pageSize: 20,
        sort: "relevance",
        game: "gundam",
        attrs: { cardType: ["UNIT"], color: ["BLUE"], levelMin: ["4"] },
      }),
    ).not.toThrow();
    expect(getGameFilterDefinition("digimon").support).toBe("PARTIAL");
    expect(getGameFilterDefinition("gundam").support).toBe("PARTIAL");
  });

  it("hides Yu-Gi-Oh ATK unless Monster is selected", () => {
    const atk = getGameFilterDefinition("yugioh").filters.find((filter) => filter.key === "atk");
    expect(isFilterVisible(atk!, {})).toBe(false);
    expect(isFilterVisible(atk!, { category: ["SPELL"] })).toBe(false);
    expect(isFilterVisible(atk!, { category: ["MONSTER"] })).toBe(true);
  });

  it("hides DEF for Link and Rank unless XYZ", () => {
    const def = getGameFilterDefinition("yugioh").filters.find((filter) => filter.key === "def");
    const rank = getGameFilterDefinition("yugioh").filters.find((filter) => filter.key === "rank");
    const level = getGameFilterDefinition("yugioh").filters.find((filter) => filter.key === "level");
    expect(isFilterVisible(def!, { category: ["MONSTER"], mechanics: ["LINK"] })).toBe(false);
    expect(isFilterVisible(rank!, { category: ["MONSTER"] })).toBe(false);
    expect(isFilterVisible(rank!, { category: ["MONSTER"], mechanics: ["XYZ"] })).toBe(true);
    expect(isFilterVisible(level!, { category: ["MONSTER"], mechanics: ["XYZ"] })).toBe(false);
  });

  it("maps hpMin to the hp range filter", () => {
    const def = getGameFilterDefinition("pokemon");
    expect(resolveAttrFilterKey(def, "hpMin")?.key).toBe("hp");
  });

  it("allows HP sort only for Pokémon", () => {
    expect(sortAllowedForGame("hp", "pokemon")).toBe(true);
    expect(sortAllowedForGame("hp", "magic")).toBe(false);
  });

  it("presents Pokémon fields and skips empty JSON", () => {
    expect(
      presentAttributeFields("pokemon", {
        cardType: "POKEMON",
        pokemonType: ["FIRE"],
        hp: 60,
        source: "synthetic-showcase",
      }),
    ).toEqual([
      { key: "cardType", label: "Tipo de carta", value: "Pokémon" },
      { key: "pokemonTypes", label: "Tipo", value: "Fuego" },
      { key: "hp", label: "HP", value: "60" },
    ]);
  });

  it("marks showcase attributes as synthetic", () => {
    expect(isSyntheticCardAttributes({ source: "synthetic-showcase" })).toBe(true);
    expect(isSyntheticCardAttributes({ sourceQuality: "SYNTHETIC" })).toBe(true);
    expect(isSyntheticCardAttributes({ source: "pokemon-tcg-api", sourceQuality: "VERIFIED_PROVIDER" })).toBe(false);
  });

  it("inspects attributes without inventing unknown keys", () => {
    const inspected = inspectCardAttributes("yugioh", {
      source: "showcase-seed",
      category: "MONSTER",
      attribute: "DARK",
      extra: 1,
    });
    expect(inspected.valid).toBe(true);
    expect(inspected.unknownKeys).toContain("extra");
  });
});
