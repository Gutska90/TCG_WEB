import { describe, expect, it } from "vitest";
import { loadReferenceFixtures } from "./reference-catalog/load";

function fixture(game: string, name: string) {
  const row = loadReferenceFixtures(game).find((item) => item.data.card.name === name);
  if (!row) throw new Error(`missing fixture ${game} ${name}`);
  return row.data.card.attributes;
}

describe("CATALOG.2 real taxonomy fixtures", () => {
  it("Pokémon Venusaur-EX Grass Basic HP 180", () => {
    const attrs = fixture("pokemon", "Venusaur-EX");
    expect(attrs.pokemonTypes).toEqual(["GRASS"]);
    expect(attrs.subtypes).toEqual(expect.arrayContaining(["BASIC", "EX"]));
    expect(attrs.hp).toBe(180);
  });

  it("Yu-Gi-Oh Blue-Eyes LIGHT Dragon Normal Level 8 ATK/DEF", () => {
    const attrs = fixture("yugioh", "Blue-Eyes White Dragon");
    expect(attrs.attribute).toBe("LIGHT");
    expect(attrs.monsterType).toEqual(["DRAGON"]);
    expect(attrs.mechanics).toEqual(["NORMAL"]);
    expect(attrs.level).toBe(8);
    expect(attrs.atk).toBe(3000);
    expect(attrs.def).toBe(2500);
  });

  it("MyL Mitra Ancestral Aliado coste 4 fuerza 2", () => {
    const attrs = fixture("mitos-y-leyendas", "Mitra");
    expect(attrs.cardType).toBe("ALIADO");
    expect(attrs.raza).toBe("ANCESTRAL");
    expect(attrs.coste).toBe(4);
    expect(attrs.fuerza).toBe(2);
  });

  it("One Piece Shanks Red Leader Power 5000 Life 5", () => {
    const attrs = fixture("one-piece", "Shanks");
    expect(attrs.colors).toEqual(["RED"]);
    expect(attrs.cardType).toBe("LEADER");
    expect(attrs.power).toBe(5000);
    expect(attrs.life).toBe(5);
  });

  it("Digimon Agumon Red Digimon Lv3 DP1000 Rookie Vaccine Reptile", () => {
    const attrs = fixture("digimon", "Agumon");
    expect(attrs.colors).toEqual(["RED"]);
    expect(attrs.cardType).toBe("DIGIMON");
    expect(attrs.level).toBe(3);
    expect(attrs.dp).toBe(1000);
    expect(attrs.form).toBe("ROOKIE");
    expect(attrs.attribute).toBe("VACCINE");
    expect(attrs.traits).toEqual(["REPTILE"]);
  });

  it("Gundam GD01-001 Blue Unit Lv4 Cost3 AP3 HP3 Earth Federation Mobile Suit Gundam", () => {
    const row = loadReferenceFixtures("gundam").find((item) => item.data.card.number === "GD01-001");
    expect(row).toBeTruthy();
    const attrs = row!.data.card.attributes;
    expect(attrs.color).toBe("BLUE");
    expect(attrs.cardType).toBe("UNIT");
    expect(attrs.level).toBe(4);
    expect(attrs.cost).toBe(3);
    expect(attrs.ap).toBe(3);
    expect(attrs.hp).toBe(3);
    expect(attrs.traits).toEqual(expect.arrayContaining(["Earth Federation"]));
    expect(attrs.sourceTitle).toBe("Mobile Suit Gundam");
  });

  it("Magic snapshots come from Scryfall ids, not invented names", () => {
    const bears = loadReferenceFixtures("magic").find((item) => item.data.card.name === "Grizzly Bears");
    expect(bears?.externalId).toBe("409f9b88-f03e-40b6-9883-68c14c37c0de");
    expect(bears?.data.card.attributes.cardTypes).toEqual(["CREATURE"]);
    expect(bears?.data.card.attributes.powerNumeric).toBe(2);
    const helix = loadReferenceFixtures("magic").find((item) => item.data.card.name === "Lightning Helix");
    expect(helix?.data.card.attributes.colors).toEqual(["R", "W"]);
    expect(helix?.data.card.attributes.cardTypes).toEqual(["INSTANT"]);
    const ring = loadReferenceFixtures("magic").find((item) => item.data.card.name === "Sol Ring");
    expect(ring?.data.card.attributes.cardTypes).toEqual(["ARTIFACT"]);
    expect(ring?.data.card.attributes.colors).toEqual([]);
  });
});
