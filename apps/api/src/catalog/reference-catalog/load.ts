import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assertFixtureProvenance, type ReferenceFixture } from "./types";

export function loadReferenceFixtures(gameSlug?: string): ReferenceFixture[] {
  const fixturesDir = join(__dirname, "fixtures");
  const files = readdirSync(fixturesDir).filter((name) => name.endsWith(".json"));
  const fixtures = files.map((name) => {
    const parsed = JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as ReferenceFixture;
    assertFixtureProvenance(parsed);
    return parsed;
  });
  return gameSlug ? fixtures.filter((row) => row.gameSlug === gameSlug) : fixtures;
}
