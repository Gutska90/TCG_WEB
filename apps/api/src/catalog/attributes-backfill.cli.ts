import { resolve } from "node:path";
import { config } from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";

config({ path: resolve(__dirname, "../../../../.env") });

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

function normalize(gameSlug: string, attributes: Record<string, unknown>, supertype: string): Record<string, unknown> {
  const next = { ...attributes };
  if (gameSlug === "pokemon") {
    if (Array.isArray(next.pokemonType) && !next.pokemonTypes) next.pokemonTypes = next.pokemonType;
    if (!next.cardType && /pokémon|pokemon/i.test(supertype)) next.cardType = "POKEMON";
  }
  if (gameSlug === "magic") {
    if (next.manaValue == null && typeof next.cmc === "number") next.manaValue = next.cmc;
    if (!next.cardTypes && typeof next.cardType === "string") next.cardTypes = [String(next.cardType).toUpperCase()];
    if (typeof next.power === "string" && next.powerText == null) next.powerText = next.power;
    if (typeof next.toughness === "string" && next.toughnessText == null) next.toughnessText = next.toughness;
    if (next.powerNumeric == null && typeof next.power === "string") {
      const numeric = Number(next.power);
      if (Number.isFinite(numeric)) next.powerNumeric = numeric;
    }
    if (next.toughnessNumeric == null && typeof next.toughness === "string") {
      const numeric = Number(next.toughness);
      if (Number.isFinite(numeric)) next.toughnessNumeric = numeric;
    }
    if (!next.colorIdentity && Array.isArray(next.colors)) next.colorIdentity = next.colors;
  }
  if (gameSlug === "yugioh") {
    if (!next.category) {
      const map: Record<string, string> = { Monster: "MONSTER", Spell: "SPELL", Trap: "TRAP" };
      if (map[supertype]) next.category = map[supertype];
    }
    if (Array.isArray(next.cardTypes) && !next.mechanics) next.mechanics = next.cardTypes;
  }
  if (gameSlug === "one-piece" && typeof next.color === "string" && !next.colors) {
    next.colors = [next.color];
  }
  if (gameSlug === "mitos-y-leyendas" && !next.cardType) {
    const map: Record<string, string> = {
      Aliado: "ALIADO",
      Talismán: "TALISMAN",
      Tótem: "TOTEM",
      Arma: "ARMA",
      Oro: "ORO",
      Monumento: "MONUMENTO",
    };
    if (map[supertype]) next.cardType = map[supertype];
  }
  if (gameSlug === "one-piece" && !next.cardType && supertype.toUpperCase() === "CHARACTER") {
    next.cardType = "CHARACTER";
  }
  return next;
}

async function main() {
  const game = argValue("--game");
  const dryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();
  try {
    const cards = await prisma.card.findMany({
      where: {
        set: {
          game: {
            isActive: true,
            ...(game ? { slug: game } : {}),
            NOT: { slug: { startsWith: "it-game-" } },
          },
        },
      },
      include: { set: { include: { game: true } } },
    });
    let updated = 0;
    for (const card of cards) {
      const current = asRecord(card.attributes);
      const next = normalize(card.set.game.slug, current, card.supertype);
      if (JSON.stringify(current) === JSON.stringify(next)) continue;
      updated += 1;
      if (!dryRun) {
        await prisma.card.update({ where: { id: card.id }, data: { attributes: next as Prisma.InputJsonValue } });
      }
    }
    console.log(`${dryRun ? "dry-run" : "updated"} ${updated}/${cards.length}${game ? ` game=${game}` : ""}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
