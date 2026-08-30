import { inspectCardAttributes, REQUIRED_FILTER_PATHS } from "@tcg/validation";
import { isSyntheticCardAttributes } from "@tcg/config";
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(__dirname, "../../../../.env") });

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function populated(raw: Record<string, unknown>, path: string): boolean {
  const value = raw[path];
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const games = await prisma.tcgGame.findMany({
      where: { isActive: true, NOT: { slug: { startsWith: "it-game-" } } },
      orderBy: { sortOrder: "asc" },
      include: { sets: { include: { cards: { select: { id: true, attributes: true } } } } },
    });
    for (const game of games) {
      const cards = game.sets.flatMap((set) => set.cards);
      let valid = 0;
      let missing = 0;
      let unknown = 0;
      let real = 0;
      let synthetic = 0;
      let invalid = 0;
      const coverage: Record<string, { filled: number; total: number }> = {};
      const paths = REQUIRED_FILTER_PATHS[game.slug] ?? [];
      for (const path of paths) coverage[path] = { filled: 0, total: cards.length };
      for (const card of cards) {
        const raw = asRecord(card.attributes);
        const inspected = inspectCardAttributes(game.slug, raw);
        if (inspected.valid) valid += 1;
        else invalid += 1;
        if (Object.keys(raw).filter((key) => key !== "source" && key !== "sourceQuality").length === 0) missing += 1;
        if (inspected.unknownKeys.length > 0) unknown += 1;
        if (isSyntheticCardAttributes(raw)) synthetic += 1;
        else real += 1;
        for (const path of paths) {
          if (populated(raw, path) && coverage[path]) coverage[path].filled += 1;
        }
      }
      console.log(
        `${game.slug}\ttotal ${cards.length}\treal ${real}\tsynthetic ${synthetic}\tvalid ${valid}\tinvalid ${invalid}\tmissing ${missing}\tunknown ${unknown}`,
      );
      for (const [path, row] of Object.entries(coverage)) {
        const pct = row.total === 0 ? 0 : Math.round((row.filled / row.total) * 100);
        console.log(`  ${game.slug}.${path}\t${pct}% populated (${row.filled}/${row.total})`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
