import type { CardFinish, CardLanguage } from "@tcg/config";

export type ReferenceFixture = {
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  externalId: string;
  verified: boolean;
  sourceQuality: "VERIFIED_PROVIDER" | "CURATED_VERIFIED" | "SYNTHETIC";
  gameSlug: string;
  data: {
    set: { code: string; slug: string; name: string };
    card: {
      name: string;
      number: string;
      rarity: string;
      supertype: string;
      imageUrl: string | null;
      attributes: Record<string, unknown>;
    };
    variant: {
      language: CardLanguage;
      finish: CardFinish;
      externalIds: Record<string, string | boolean>;
    };
  };
};

export function assertFixtureProvenance(fixture: ReferenceFixture): void {
  if (!fixture.sourceUrl) throw new Error("sourceUrl required");
  if (!fixture.retrievedAt) throw new Error("retrievedAt required");
  if (!fixture.externalId) throw new Error("externalId required");
}
