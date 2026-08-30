import { describe, expect, it } from "vitest";
import { loadReferenceFixtures } from "./load";
import { assertFixtureProvenance } from "./types";

describe("reference fixture provenance", () => {
  it("requires sourceUrl, retrievedAt and externalId on every fixture", () => {
    const fixtures = loadReferenceFixtures();
    expect(fixtures.length).toBeGreaterThan(10);
    for (const fixture of fixtures) {
      expect(fixture.sourceUrl).toMatch(/^https?:\/\//);
      expect(fixture.retrievedAt).toBeTruthy();
      expect(fixture.externalId).toBeTruthy();
      expect(fixture.verified).toBe(true);
      assertFixtureProvenance(fixture);
    }
  });
});
