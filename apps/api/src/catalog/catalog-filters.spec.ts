import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import {
  GAME_FILTER_DEFINITIONS,
  getGameFilterDefinition,
  isFilterVisible,
  isSyntheticCardAttributes,
  mylSetEra,
  MYL_TOR_EDITIONS,
  normalizeCatalogCode,
  presentAttributeFields,
  presentCardLore,
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
    expect(
      isSyntheticCardAttributes({ source: "myl-demo-pack", sourceQuality: "CURATED_VERIFIED", verified: false }),
    ).toBe(false);
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

  it("groups MyL sets by era", () => {
    expect(mylSetEra("el-reto")).toBe("pe");
    expect(mylSetEra("helenica")).toBe("pb");
    expect(mylSetEra("aguila-imperial")).toBe("imperio");
    expect(mylSetEra("onyria")).toBe("imperio");
    expect(mylSetEra("excalibur")).toBe("fx");
    expect(mylSetEra("guerrero-jaguar")).toBe("segundo");
    expect(mylSetEra("leyendas_bloque_furia")).toBe("lbf");
    expect(MYL_TOR_EDITIONS).toHaveLength(164);
    expect(new Set(MYL_TOR_EDITIONS.map((row) => row.slug)).size).toBe(164);
    expect(mylSetEra("unknown-edition")).toBe("other");
  });

  it("keeps marketplace language/finish/condition as advanced filters", () => {
    const language = getGameFilterDefinition("mitos-y-leyendas").filters.find((filter) => filter.key === "language");
    const finish = getGameFilterDefinition("mitos-y-leyendas").filters.find((filter) => filter.key === "finish");
    const coste = getGameFilterDefinition("mitos-y-leyendas").filters.find((filter) => filter.key === "coste");
    expect(language?.tier).toBe("ADVANCED");
    expect(finish?.tier).toBe("ADVANCED");
    expect(coste?.tier).toBe("ADVANCED");
  });

  it("presents official MyL lore or the empty-historia legend", () => {
    expect(
      presentCardLore({
        rulesText: "Única.",
        flavorText: "Historia oficial.",
        flavorTextStatus: "OFFICIAL",
        sourceUrl: "https://tor.myl.cl/carta/aguila-imperial/mitra",
      }).rulesText,
    ).toBe("Única.");
    expect(presentCardLore({ flavorTextStatus: "NO_OFFICIAL_FLAVOR_TEXT" }).flavorPlaceholder).toMatch(/texto histórico oficial/);
  });
});
