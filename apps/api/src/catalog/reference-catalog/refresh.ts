import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { mapPokemonTcgCard } from "../importers/pokemon-tcg.mapper";
import { fetchPokemonTcgCard } from "../importers/pokemon-tcg.importer";
import { mapScryfallCard } from "../importers/scryfall.mapper";
import { fetchScryfallCard } from "../importers/scryfall.importer";
import { loadReferenceFixtures } from "./load";
import type { ReferenceFixture } from "./types";

type RefreshTarget = {
  game: string;
  file: string;
  fetch: () => Promise<ReferenceFixture["data"] & { sourceUrl: string; externalId: string; source: string }>;
};

const TARGETS: RefreshTarget[] = [
  {
    game: "pokemon",
    file: "pokemon-xy1-1-venusaur-ex.json",
    fetch: async () => {
      const remote = await fetchPokemonTcgCard("xy1-1");
      const mapped = mapPokemonTcgCard(remote, "2026-08-30T20:00:00.000Z");
      return {
        source: "pokemon-tcg-api",
        sourceUrl: `https://api.pokemontcg.io/v2/cards/${remote.id}`,
        externalId: remote.id,
        set: { code: (remote.set?.id ?? "xy1").toUpperCase(), slug: remote.set?.id ?? "xy1", name: remote.set?.name ?? "XY" },
        card: {
          name: mapped.name,
          number: mapped.number,
          rarity: mapped.rarity,
          supertype: mapped.supertype,
          imageUrl: mapped.imageUrl,
          attributes: { ...mapped.attributes, sourceRetrievedAt: "2026-08-30T20:00:00.000Z" },
        },
        variant: mapped.variants[0]!,
      };
    },
  },
  {
    game: "magic",
    file: "magic-10e-268-grizzly-bears.json",
    fetch: async () => {
      const remote = await fetchScryfallCard("10e", "268");
      const mapped = mapScryfallCard(remote);
      return {
        source: "scryfall",
        sourceUrl: remote.uri ?? `https://api.scryfall.com/cards/${remote.id}`,
        externalId: remote.id,
        set: { code: remote.set.toUpperCase(), slug: remote.set, name: remote.set_name },
        card: {
          name: mapped.name,
          number: mapped.number,
          rarity: mapped.rarity,
          supertype: mapped.supertype,
          imageUrl: mapped.imageUrl,
          attributes: { ...mapped.attributes, sourceRetrievedAt: "2026-08-30T20:00:00.000Z" },
        },
        variant: mapped.variants[0]!,
      };
    },
  },
];

export async function refreshReferenceCatalog(options: {
  game: string;
  write?: boolean;
}): Promise<void> {
  const targets = TARGETS.filter((row) => row.game === options.game);
  if (targets.length === 0) {
    throw new Error(`Refresh automático no disponible para ${options.game}. Actualizar fixtures a mano (ver docs/catalog/REAL-DATA-SOURCES.md).`);
  }
  const current = loadReferenceFixtures(options.game);
  for (const target of targets) {
    const nextData = await target.fetch();
    const existing = current.find((row) => row.data.card.number === nextData.card.number);
    const next: ReferenceFixture = {
      source: nextData.source,
      sourceUrl: nextData.sourceUrl,
      retrievedAt: "2026-08-30T20:00:00.000Z",
      externalId: nextData.externalId,
      verified: true,
      sourceQuality: "VERIFIED_PROVIDER",
      gameSlug: options.game,
      data: {
        set: nextData.set,
        card: nextData.card,
        variant: nextData.variant,
      },
    };
    const before = JSON.stringify(existing?.data.card.attributes ?? {}, null, 2);
    const after = JSON.stringify(next.data.card.attributes, null, 2);
    if (before === after) {
      console.log(`${target.file}: sin cambios de attributes`);
    } else {
      console.log(`${target.file}: DIFF attributes`);
      console.log("--- actual");
      console.log(before);
      console.log("+++ provider");
      console.log(after);
    }
    if (options.write) {
      writeFileSync(join(__dirname, "fixtures", target.file), `${JSON.stringify(next, null, 2)}\n`);
      console.log(`escrito ${target.file}`);
    } else {
      console.log("dry-run: pasar --write para sobrescribir el fixture");
    }
  }
}
