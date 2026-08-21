import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { importScryfallSet } from "./importers/scryfall.importer";
import { seedCatalog, seedShippingRates } from "./seed";

config({ path: resolve(__dirname, "../../../../.env") });

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
    if (command === "import-scryfall") {
      if (!arg) {
        throw new Error("Uso: catalog:import-scryfall <codigo-set>  (ej. mh3)");
      }
      const result = await importScryfallSet(prisma, arg);
      console.log(`Import Scryfall ${arg}: ${result.cards} cartas.`);
      return;
    }
    throw new Error("Comandos: seed | import-scryfall <set>");
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
