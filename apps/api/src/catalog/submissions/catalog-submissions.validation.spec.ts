import { describe, expect, it } from "vitest";
import { adminCatalogApproveSchema, createCatalogSubmissionSchema, patchMyCatalogSubmissionSchema } from "@tcg/validation";

describe("createCatalogSubmissionSchema", () => {
  it("accepts a MyL proposal mapped to attributes", () => {
    const parsed = createCatalogSubmissionSchema.parse({
      gameId: "11111111-1111-4111-8111-111111111111",
      name: "Brunhild",
      number: "123",
      attributes: { cardType: "ALIADO", raza: "CABALLERO", coste: 4, fuerza: 2 },
      sourceUrl: "https://example.test/brunhild",
    });
    expect(parsed.name).toBe("Brunhild");
    expect(parsed.attributes.cardType).toBe("ALIADO");
  });

  it("rejects http image URLs", () => {
    const parsed = createCatalogSubmissionSchema.safeParse({
      gameId: "11111111-1111-4111-8111-111111111111",
      name: "Brunhild",
      imageUrl: "http://example.test/card.png",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("adminCatalogApproveSchema", () => {
  const setId = "11111111-1111-4111-8111-111111111111";

  it("requires an explicit existing set or a new set", () => {
    expect(adminCatalogApproveSchema.safeParse({}).success).toBe(false);
    expect(adminCatalogApproveSchema.parse({ setId }).setId).toBe(setId);
    expect(adminCatalogApproveSchema.parse({ createNewSet: true, newSetName: "Águila Imperial" }).createNewSet).toBe(true);
    expect(adminCatalogApproveSchema.safeParse({ createNewSet: true, newSetName: "Águila Imperial", setId }).success).toBe(
      false,
    );
  });
});

describe("patchMyCatalogSubmissionSchema", () => {
  it("allows completing missing fields", () => {
    const parsed = patchMyCatalogSubmissionSchema.parse({
      number: "077",
      sourceUrl: "https://example.test/card",
    });
    expect(parsed.number).toBe("077");
  });
});
