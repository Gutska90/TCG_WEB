import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { inspectCardAttributes } from "@tcg/validation";

config({ path: resolve(__dirname, "../../../../.env") });

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
      for (const card of cards) {
        const raw =
          card.attributes && typeof card.attributes === "object" && !Array.isArray(card.attributes)
            ? (card.attributes as Record<string, unknown>)
            : {};
        const inspected = inspectCardAttributes(game.slug, raw);
        if (inspected.valid) valid += 1;
        if (Object.keys(raw).filter((key) => key !== "source").length === 0) missing += 1;
        if (inspected.unknownKeys.length > 0) unknown += 1;
      }
      console.log(
        `${game.slug}\tcards ${cards.length}\tvalid ${valid}\tmissing ${missing}\tunknown ${unknown}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
