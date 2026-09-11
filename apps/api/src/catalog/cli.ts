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
    if (command === "import-myl") {
      const { readFile } = await import("node:fs/promises");
      const { importMylDemoCards, formatMylImportSummary } = await import("./myl-demo/import-myl");
      const { parseMylJsonDocument } = await import("./myl-demo/parse-myl-json");
      const { MYL_DEMO_CARDS } = await import("./myl-demo/cards");
      const file = argAfter("--file") ?? (arg && !arg.startsWith("-") ? arg : undefined);
      const dryRun = flag("--dry-run");
      const force = flag("--force");
      let cards = MYL_DEMO_CARDS;
      if (file) {
        const parsed = parseMylJsonDocument(JSON.parse(await readFile(file, "utf8")) as unknown);
        cards = parsed.cards;
        if (parsed.skipped.length > 0) {
          console.log(`Parser skipped: ${parsed.skipped.length}`);
        }
      }
      const result = await importMylDemoCards(prisma, cards, { dryRun, force });
      if (dryRun) console.log("Dry-run (no writes).");
      console.log(formatMylImportSummary(result));
      return;
    }
    if (command === "seed-myl-demo") {
      const { seedMylDemo } = await import("./myl-demo/seed-myl-demo");
      const result = await seedMylDemo(prisma);
      console.log(
        `MyL demo: ${result.cards} cartas, ${result.sellers} vendedores, ${result.listings} publicaciones.`,
      );
      return;
    }
    if (command === "import-scryfall") {
      if (!arg) {
        throw new Error("Uso: catalog:import-scryfall <codigo-set>  (staging: mh3 blb dsk fdn)");
      }
      const result = await importScryfallSet(prisma, arg);
      console.log(`Import Scryfall ${arg}: ${result.cards} cartas.`);
      return;
    }
    if (command === "import-pokemon") {
      if (!arg) {
        throw new Error("Uso: catalog:import-pokemon <set-id>  (staging: sv8 sv6 sv3 xy1)");
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
    if (command === "import-myl-tor" || command === "enrich-myl") {
      const { importMylTorCatalog, formatMylTorImportSummary } = await import("./myl-tor/import-myl-tor");
      const formatsRaw = argAfter("--formats") ?? "pe,pb";
      const formats = formatsRaw
        .split(",")
        .map((row) => row.trim())
        .filter((row): row is "pe" | "pb" => row === "pe" || row === "pb");
      const result = await importMylTorCatalog(prisma, {
        formats: formats.length ? formats : ["pe", "pb"],
        editionSlug: argAfter("--edition"),
        dryRun: flag("--dry-run"),
        force: flag("--force"),
        card: argAfter("--card"),
        missingOnly: flag("--missing-only"),
      });
      if (flag("--dry-run")) console.log("Dry-run (no writes).");
      console.log(formatMylTorImportSummary(result));
      if (result.completeness.incomplete > 0) {
        const { formatCompletenessReport } = await import("./myl-tor/completeness");
        console.log(formatCompletenessReport(result.completeness));
        if (flag("--strict")) process.exitCode = 1;
      }
      return;
    }
    throw new Error(
      "Comandos: seed | seed-reference | seed-myl-demo | import-myl [--file path] [--dry-run] [--force] | import-myl-tor|enrich-myl [--formats pe,pb] [--edition slug] [--card slug] [--dry-run] [--force] [--missing-only] [--strict] | import-scryfall <set> | import-pokemon <set> | reference-refresh --game <slug>",
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
