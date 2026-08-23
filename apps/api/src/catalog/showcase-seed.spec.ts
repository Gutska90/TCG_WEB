import { describe, expect, it } from "vitest";
import { SHOWCASE_GAMES } from "./showcase-seed";

const BANNED = [/pikachu/i, /charizard/i, /black lotus/i, /blue[- ]eyes/i, /luffy/i, /test mon/i];

describe("showcase catalog", () => {
  it("uses original demo names and includes Yu-Gi-Oh as vitrina only", () => {
    const names = SHOWCASE_GAMES.flatMap((game) => game.cards.map((card) => card.name));
    expect(SHOWCASE_GAMES.map((game) => game.slug)).toEqual(["pokemon", "magic", "one-piece", "yugioh"]);
    expect(names).toHaveLength(24);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      for (const banned of BANNED) {
        expect(name).not.toMatch(banned);
      }
    }
  });
});
