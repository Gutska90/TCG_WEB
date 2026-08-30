import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { importScryfallSet } from "./importers/scryfall.importer";
import { importPokemonTcgSet } from "./importers/pokemon-tcg.importer";
import { seedCatalog, seedShippingRates } from "./seed";
import { seedReferenceCatalog } from "./reference-catalog/seed";
import { refreshReferenceCatalog } from "./reference-catalog/refresh";

config({ path: resolve(__dirname, "../../../../.env") });

function flag(name: string): boolean {
  return process.argv.includes(name);
}

function argAfter(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  const prisma = new PrismaClient();
  try {
    if (command === "seed") {
      const result = await seedCatalog(prisma);
      const rates = await seedShippingRates(prisma);
      console.log(`Seed listo: ${result.games} juegos, ${result.cards} cartas de prueba, ${rates} tarifas de envío.`);
      return;
    }
    if (command === "seed-reference") {
      const result = await seedReferenceCatalog(prisma);
      console.log(`Reference catalog: ${result.games} juegos, ${result.cards} cartas verificadas.`);
      return;
    }
    if (command === "import-scryfall") {
      if (!arg) {
        throw new Error("Uso: catalog:import-scryfall <codigo-set>  (ej. mh3)");
      }
      const result = await importScryfallSet(prisma, arg);
      console.log(`Import Scryfall ${arg}: ${result.cards} cartas.`);
      return;
    }
    if (command === "import-pokemon") {
      if (!arg) {
        throw new Error("Uso: catalog:import-pokemon <set-id>  (ej. xy1)");
      }
      const result = await importPokemonTcgSet(prisma, arg);
      console.log(`Import Pokémon TCG API ${arg}: ${result.cards} cartas.`);
      return;
    }
    if (command === "reference-refresh") {
      const game = argAfter("--game") ?? (arg?.startsWith("--") ? undefined : arg);
      if (!game) {
        throw new Error("Uso: catalog:reference:refresh --game pokemon|magic [--write]");
      }
      await refreshReferenceCatalog({ game, write: flag("--write") });
      return;
    }
    throw new Error("Comandos: seed | seed-reference | import-scryfall <set> | import-pokemon <set> | reference-refresh --game <slug>");
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
