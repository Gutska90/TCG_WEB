import { describe, expect, it } from "vitest";
import { parseMylJsonDocument } from "./parse-myl-json";

describe("parseMylJsonDocument", () => {
  it("normalizes set names and skips invalid types", () => {
    const result = parseMylJsonDocument([
      { name: "Brunhild", set: "Espada Sagrada", attributes: { cardType: "ALIADO" } },
      { name: "Bad", set: "Espada Sagrada", attributes: { cardType: "TOKEN" } },
      { name: "Brunhild", set: "espada-sagrada", attributes: { cardType: "ALIADO" } },
    ]);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]?.set.slug).toBe("espada-sagrada");
    expect(result.duplicatesInFile).toBe(1);
    expect(result.skipped.some((row) => row.reason.includes("cardType"))).toBe(true);
  });
});
