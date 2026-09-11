import type { PrismaClient } from "@prisma/client";

const GAME_SLUG = "mitos-y-leyendas";

export type PruneWithoutImagesSummary = {
  cards: number;
  listings: number;
  sets: number;
  skippedWithOrders: number;
};

export async function pruneMylCardsWithoutImages(
  prisma: PrismaClient,
): Promise<PruneWithoutImagesSummary> {
  const cards = await prisma.card.findMany({
    where: {
      set: { game: { slug: GAME_SLUG } },
      OR: [{ imageUrl: null }, { imageUrl: "" }],
    },
    select: { id: true },
  });
  if (cards.length === 0) {
    return { cards: 0, listings: 0, sets: 0, skippedWithOrders: 0 };
  }

  const variants = await prisma.cardVariant.findMany({
    where: { cardId: { in: cards.map((row) => row.id) } },
    select: { id: true, cardId: true },
  });
  const variantIds = variants.map((row) => row.id);
  const ordered = await prisma.orderItem.findMany({
    where: { variantId: { in: variantIds } },
    select: { variantId: true },
  });
  const blockedVariants = new Set(ordered.map((row) => row.variantId));
  const removableVariants = variants.filter((row) => !blockedVariants.has(row.id));
  const removableCardIds = [...new Set(removableVariants.map((row) => row.cardId))];
  const removableVariantIds = removableVariants.map((row) => row.id);
  const skippedWithOrders = new Set(ordered.map((row) => row.variantId)).size;

  if (removableCardIds.length === 0) {
    return { cards: 0, listings: 0, sets: 0, skippedWithOrders };
  }

  const listings = await prisma.listing.findMany({
    where: { variantId: { in: removableVariantIds } },
    select: { id: true },
  });
  const listingIds = listings.map((row) => row.id);

  await prisma.$transaction(async (tx) => {
    if (listingIds.length > 0) {
      await tx.listingRevision.deleteMany({ where: { listingId: { in: listingIds } } });
      await tx.cartItem.deleteMany({ where: { listingId: { in: listingIds } } });
      await tx.report.deleteMany({ where: { targetType: "LISTING", targetId: { in: listingIds } } });
      await tx.listing.deleteMany({ where: { id: { in: listingIds } } });
    }
    await tx.collectionItem.deleteMany({ where: { variantId: { in: removableVariantIds } } });
    await tx.card.deleteMany({ where: { id: { in: removableCardIds } } });
  });

  const emptySets = await prisma.tcgSet.findMany({
    where: { game: { slug: GAME_SLUG }, cards: { none: {} } },
    select: { id: true },
  });
  if (emptySets.length > 0) {
    await prisma.tcgSet.deleteMany({ where: { id: { in: emptySets.map((row) => row.id) } } });
  }

  return {
    cards: removableCardIds.length,
    listings: listingIds.length,
    sets: emptySets.length,
    skippedWithOrders,
  };
}

export function formatPruneWithoutImagesSummary(summary: PruneWithoutImagesSummary): string {
  return [
    `Prune MyL without image: ${summary.cards} cartas, ${summary.listings} listings, ${summary.sets} ediciones vacías.`,
    summary.skippedWithOrders > 0
      ? `Omitidas por órdenes existentes: ${summary.skippedWithOrders} variantes.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
