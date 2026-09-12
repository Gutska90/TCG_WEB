import { describe, expect, it } from "vitest";
import { completenessFromMapped } from "./completeness";
import { mapTorEditionCards, titleCaseEs, type TorEditionPayload } from "./map-card";

const PAYLOAD: TorEditionPayload = {
  status: "OK",
  edition: {
    id: "19",
    slug: "espada-sagrada",
    title: "Espada Sagrada",
    image: "https://api.myl.cl/static/espada_sagrada.png",
  },
  races: [
    { id: "0", slug: "noraza", name: "Sin Raza" },
    { id: "1", slug: "caballero", name: "Caballero" },
  ],
  types: [
    { id: "1", slug: "aliado", name: "Aliado" },
    { id: "5", slug: "oro", name: "Oro" },
  ],
  rarities: [
    { id: "4", slug: "ultra-real", name: "Ultra Real" },
    { id: "2", slug: "cortesano", name: "Cortesano" },
  ],
  keywords: [{ id: "1", flag: "1", slug: "unica", title: "Única", name: "Única" }],
  cards: [
    {
      id: "1277",
      edid: "001",
      slug: "rey-arturo-pendragon",
      name: "rey arturo pendragon",
      rarity: "4",
      race: "1",
      type: "1",
      keywords: "1",
      cost: "5",
      damage: "2",
      ability: "Solo puedes tener en juego a un Rey Arturo Pendragón.",
      flavour: "Un rey, una espada, una corona.",
    },
    {
      id: "1300",
      edid: "220",
      slug: "oro",
      name: "oro",
      rarity: "2",
      race: "0",
      type: "5",
      keywords: "0",
      cost: "",
      damage: "",
      ability: "",
      flavour: "",
    },
  ],
};

describe("mapTorEditionCards", () => {
  it("title-cases Spanish names without inventing lore", () => {
    expect(titleCaseEs("rey arturo pendragon")).toBe("Rey Arturo Pendragon");
  });

  it("maps official Fénix fields including empty historia", () => {
    const [arturo, oro] = mapTorEditionCards(PAYLOAD, {
      requestSlug: "espada-sagrada",
      format: "pb",
      retrievedAt: "2026-09-11T00:00:00.000Z",
    });
    expect(arturo?.name).toBe("Rey Arturo Pendragon");
    expect(arturo?.number).toBe("001");
    expect(arturo?.imageUrl).toBe("https://api.myl.cl/static/cards/19/001.png");
    expect(arturo?.attributes.source).toBe("tor.myl.cl");
    expect(arturo?.attributes.sourceQuality).toBe("VERIFIED_PROVIDER");
    expect(arturo?.attributes.verified).toBe(true);
    expect(arturo?.attributes.rulesText).toBe("Solo puedes tener en juego a un Rey Arturo Pendragón.");
    expect(arturo?.attributes.flavorText).toBe("Un rey, una espada, una corona.");
    expect(arturo?.attributes.raza).toBe("CABALLERO");
    expect(arturo?.attributes.coste).toBe(5);
    expect(arturo?.attributes.fuerza).toBe(2);
    expect(arturo?.attributes.keywords).toEqual(["Única"]);
    expect(arturo?.missing).toEqual([]);

    expect(oro?.attributes.cardType).toBe("ORO");
    expect(oro?.attributes.flavorTextStatus).toBe("NO_OFFICIAL_FLAVOR_TEXT");
    expect(oro?.attributes.rulesText).toBe("");
    expect(oro?.missing).toEqual([]);
    expect(oro?.imageUrl).toBe("https://api.myl.cl/static/cards/19/220.png");
  });

  it("tags FX editions with era FX", () => {
    const [card] = mapTorEditionCards(
      {
        ...PAYLOAD,
        edition: { id: "80", slug: "excalibur", title: "Excalibur FX" },
      },
      {
        requestSlug: "excalibur",
        format: "fx",
        retrievedAt: "2026-09-11T00:00:00.000Z",
      },
    );
    expect(card?.attributes.era).toBe("FX");
  });

  it("tags Imperio editions with era IMPERIO", () => {
    const [card] = mapTorEditionCards(
      {
        ...PAYLOAD,
        edition: { id: "13", slug: "aguila-imperial", title: "Águila Imperial" },
      },
      {
        requestSlug: "aguila-imperial",
        format: "imperio",
        retrievedAt: "2026-09-11T00:00:00.000Z",
      },
    );
    expect(card?.attributes.era).toBe("IMPERIO");
    expect(card?.imageUrl).toBe("https://api.myl.cl/static/cards/13/001.png");
  });

  it("reports incomplete cards instead of inventing text", () => {
    const incomplete: TorEditionPayload = {
      ...PAYLOAD,
      cards: [
        {
          ...PAYLOAD.cards![0]!,
          ability: "",
          flavour: "",
          edid: "",
          id: "",
        },
      ],
    };
    const [card] = mapTorEditionCards(incomplete, {
      requestSlug: "espada-sagrada",
      format: "pb",
      retrievedAt: "2026-09-11T00:00:00.000Z",
    });
    expect(card?.missing).toContain("image");
    expect(card?.attributes.verified).toBe(false);
    expect(card?.attributes.flavorTextStatus).toBe("NO_OFFICIAL_FLAVOR_TEXT");
    const report = completenessFromMapped(card ? [card] : []);
    expect(report.incomplete).toBe(1);
  });
});
