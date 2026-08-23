import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ERROR_CODES } from "@tcg/config";
import type {
  CollectionItemView,
  CollectionSetDetailView,
  CollectionSetProgressView,
  CollectionSummaryView,
  CollectionView,
  Paginated,
} from "@tcg/types";
import type {
  BulkDeleteCollectionItemsInput,
  CreateCollectionInput,
  CreateCollectionItemInput,
  ListCollectionItemsQuery,
  PatchCollectionInput,
  PatchCollectionItemInput,
} from "@tcg/validation";
import { AppError } from "../common/errors/app-error";
import { AuditService } from "../audit/audit.service";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  COLLECTION_PL_DISCLAIMER,
  COLLECTION_VALUE_DISCLAIMER,
  duplicateStats,
  estimateUnitClp,
  lotEstimatedPlClp,
  lotEstimatedValueClp,
  lotRegisteredCostClp,
  setProgressPercent,
  summarizeLots,
} from "./collection-value";
import { addUtcDays, utcDateOnly } from "../prices/price-index";

const itemInclude = {
  variant: { include: { card: { include: { set: { include: { game: true } } } } } },
} as const;

type ItemRow = Prisma.CollectionItemGetPayload<{ include: typeof itemInclude }>;

type PriceBucket = { comparable: number[]; anyCondition: number[] };

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
    private readonly audit: AuditService,
  ) {}

  async listCollections(userId: string): Promise<CollectionView[]> {
    const row = await this.ensureDefault(userId);
    return [toCollectionView(row)];
  }

  async createCollection(userId: string, input: CreateCollectionInput): Promise<CollectionView> {
    const row = await this.ensureDefault(userId);
    if (input.name && input.name !== row.name) {
      const updated = await this.prisma.collection.update({
        where: { id: row.id },
        data: { name: input.name },
      });
      return toCollectionView(updated);
    }
    return toCollectionView(row);
  }

  async getCollection(userId: string, id: string): Promise<CollectionView> {
    assertUuid(id);
    const row = await this.requireOwnedCollection(userId, id);
    return toCollectionView(row);
  }

  async patchCollection(userId: string, id: string, input: PatchCollectionInput): Promise<CollectionView> {
    assertUuid(id);
    await this.requireOwnedCollection(userId, id);
    const updated = await this.prisma.collection.update({
      where: { id },
      data: { name: input.name },
    });
    return toCollectionView(updated);
  }

  async summary(userId: string): Promise<CollectionSummaryView> {
    const collection = await this.ensureDefault(userId);
    const lots = await this.prisma.collectionItem.findMany({
      where: { collectionId: collection.id },
      select: { variantId: true, condition: true, quantity: true, purchasePriceClp: true, variant: { select: { cardId: true } } },
    });
    const estimates = await this.estimatesFor(
      lots.map((lot) => ({ variantId: lot.variantId, condition: lot.condition })),
    );
    const valued = lots.map((lot) => ({
      quantity: lot.quantity,
      purchasePriceClp: lot.purchasePriceClp,
      estimatedUnitClp: estimates.get(priceKey(lot.variantId, lot.condition)) ?? null,
    }));
    const totals = summarizeLots(valued);
    const qtyByCard = new Map<string, number>();
    for (const lot of lots) {
      qtyByCard.set(lot.variant.cardId, (qtyByCard.get(lot.variant.cardId) ?? 0) + lot.quantity);
    }
    const dups = duplicateStats(qtyByCard.values());
    const change30dClp = await this.change30d(collection.id, totals.estimatedValueClp);
    return {
      collectionId: collection.id,
      uniqueCards: qtyByCard.size,
      duplicateCards: dups.duplicateCards,
      extraCopies: dups.extraCopies,
      change30dClp,
      disclaimer: `${COLLECTION_VALUE_DISCLAIMER} ${COLLECTION_PL_DISCLAIMER}`,
      ...totals,
    };
  }

  async captureDailyValues(now = new Date()): Promise<{ collections: number }> {
    const day = utcDateOnly(now);
    const collections = await this.prisma.collection.findMany({ select: { id: true, userId: true } });
    let captured = 0;
    for (const row of collections) {
      const summary = await this.summary(row.userId);
      const valueClp = summary.estimatedValueClp ?? 0;
      await this.prisma.collectionValueSnapshot.upsert({
        where: { collectionId_capturedOn: { collectionId: row.id, capturedOn: day } },
        update: {
          valueClp,
          breakdown: {
            estimatedValueClp: summary.estimatedValueClp,
            itemsWithoutEstimate: summary.itemsWithoutEstimate,
            totalCards: summary.totalCards,
          },
        },
        create: {
          collectionId: row.id,
          capturedOn: day,
          valueClp,
          breakdown: {
            estimatedValueClp: summary.estimatedValueClp,
            itemsWithoutEstimate: summary.itemsWithoutEstimate,
            totalCards: summary.totalCards,
          },
        },
      });
      captured += 1;
    }
    return { collections: captured };
  }

  async applySaleDeduction(
    orderId: string,
    sellerId: string,
    items: Array<{ listingId: string; quantity: number }>,
    client?: Prisma.TransactionClient,
  ): Promise<void> {
    if (!this.flags.current().enableCollections) return;
    const db = client ?? this.prisma;
    const already = await db.auditLog.findFirst({
      where: { action: "collection.sold", entityType: "Order", entityId: orderId },
    });
    if (already) return;
    const listings = await db.listing.findMany({
      where: { id: { in: items.map((item) => item.listingId) } },
      select: { id: true, sourceCollectionItemId: true },
    });
    const sourceByListing = new Map(listings.map((row) => [row.id, row.sourceCollectionItemId]));
    for (const item of items) {
      const lotId = sourceByListing.get(item.listingId);
      if (!lotId) continue;
      await db.$queryRaw`SELECT id FROM collection_items WHERE id = ${lotId}::uuid FOR UPDATE`;
      const lot = await db.collectionItem.findFirst({
        where: { id: lotId, collection: { userId: sellerId } },
      });
      if (!lot) continue;
      if (lot.quantity <= item.quantity) {
        await db.collectionItem.delete({ where: { id: lot.id } });
      } else {
        await db.collectionItem.update({
          where: { id: lot.id },
          data: { quantity: lot.quantity - item.quantity },
        });
      }
    }
    await this.audit.log(
      {
        actorId: sellerId,
        action: "collection.sold",
        entityType: "Order",
        entityId: orderId,
      },
      client,
    );
  }

  async listItems(userId: string, query: ListCollectionItemsQuery): Promise<Paginated<CollectionItemView>> {
    const collection = await this.ensureDefault(userId);
    const where = await this.itemWhere(collection.id, query);

    if (query.sort === "estimatedValue") {
      const [total, keys] = await Promise.all([
        this.prisma.collectionItem.count({ where }),
        this.prisma.collectionItem.groupBy({
          by: ["variantId", "condition"],
          where,
        }),
      ]);
      const estimates = await this.estimatesFor(keys);
      const pageIds = total === 0 ? [] : await this.estimatedValuePageIds(collection.id, query, estimates);
      const rows = pageIds.length
        ? await this.prisma.collectionItem.findMany({
            where: { id: { in: pageIds } },
            include: itemInclude,
          })
        : [];
      const byId = new Map(rows.map((row) => [row.id, row]));
      return {
        items: pageIds.flatMap((id) => {
          const row = byId.get(id);
          return row ? [this.toItemView(row, estimates)] : [];
        }),
        page: query.page,
        pageSize: query.pageSize,
        total,
      };
    }

    const orderBy = this.orderBy(query.sort);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.collectionItem.count({ where }),
      this.prisma.collectionItem.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: itemInclude,
      }),
    ]);
    const estimates = await this.estimatesFor(rows);
    return {
      items: rows.map((row) => this.toItemView(row, estimates)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async addItem(userId: string, input: CreateCollectionItemInput): Promise<CollectionItemView> {
    const collection = await this.ensureDefault(userId);
    const variant = await this.prisma.cardVariant.findUnique({
      where: { id: input.variantId },
      include: { card: { include: { set: { include: { game: true } } } } },
    });
    if (!variant) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Variante no encontrada");
    }
    const row = await this.prisma.collectionItem.create({
      data: {
        collectionId: collection.id,
        variantId: variant.id,
        condition: input.condition,
        quantity: input.quantity,
        purchasePriceClp: input.purchasePriceClp,
        purchasedAt: parseDateOnly(input.purchasedAt),
        notes: input.notes,
      },
      include: itemInclude,
    });
    const estimates = await this.estimatesFor([row]);
    return this.toItemView(row, estimates);
  }

  async getItem(userId: string, id: string): Promise<CollectionItemView> {
    assertUuid(id);
    const row = await this.requireOwnedItem(userId, id);
    const estimates = await this.estimatesFor([row]);
    return this.toItemView(row, estimates);
  }

  async patchItem(userId: string, id: string, input: PatchCollectionItemInput): Promise<CollectionItemView> {
    assertUuid(id);
    await this.requireOwnedItem(userId, id);
    const row = await this.prisma.collectionItem.update({
      where: { id },
      data: {
        ...(input.condition ? { condition: input.condition } : {}),
        ...(input.quantity != null ? { quantity: input.quantity } : {}),
        ...(input.purchasePriceClp !== undefined ? { purchasePriceClp: input.purchasePriceClp } : {}),
        ...(input.purchasedAt !== undefined ? { purchasedAt: parseDateOnly(input.purchasedAt) } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: itemInclude,
    });
    const estimates = await this.estimatesFor([row]);
    return this.toItemView(row, estimates);
  }

  async deleteItem(userId: string, id: string): Promise<void> {
    assertUuid(id);
    await this.requireOwnedItem(userId, id);
    await this.prisma.collectionItem.delete({ where: { id } });
  }

  async bulkDelete(userId: string, input: BulkDeleteCollectionItemsInput): Promise<{ deleted: number }> {
    const collection = await this.ensureDefault(userId);
    const result = await this.prisma.collectionItem.deleteMany({
      where: { collectionId: collection.id, id: { in: input.ids } },
    });
    return { deleted: result.count };
  }

  async listSetProgress(userId: string): Promise<CollectionSetProgressView[]> {
    const collection = await this.ensureDefault(userId);
    const lots = await this.prisma.collectionItem.findMany({
      where: { collectionId: collection.id },
      select: {
        quantity: true,
        variant: { select: { cardId: true, card: { select: { setId: true } } } },
      },
    });
    const setIds = [...new Set(lots.map((lot) => lot.variant.card.setId))];
    if (setIds.length === 0) return [];
    const sets = await this.prisma.tcgSet.findMany({
      where: { id: { in: setIds } },
      include: { game: true, _count: { select: { cards: true } } },
    });
    const bySet = new Map(sets.map((row) => [row.id, row]));
    const ownedBySet = new Map<string, Set<string>>();
    const qtyByCardInSet = new Map<string, Map<string, number>>();
    for (const lot of lots) {
      const setId = lot.variant.card.setId;
      const cardId = lot.variant.cardId;
      const owned = ownedBySet.get(setId) ?? new Set<string>();
      owned.add(cardId);
      ownedBySet.set(setId, owned);
      const qtyMap = qtyByCardInSet.get(setId) ?? new Map<string, number>();
      qtyMap.set(cardId, (qtyMap.get(cardId) ?? 0) + lot.quantity);
      qtyByCardInSet.set(setId, qtyMap);
    }

    const missingActive = await this.missingWithListingsBySet(setIds, ownedBySet);

    return setIds
      .map((setId) => {
        const set = bySet.get(setId);
        if (!set) return null;
        const owned = ownedBySet.get(setId) ?? new Set<string>();
        const extra = duplicateStats((qtyByCardInSet.get(setId) ?? new Map()).values()).extraCopies;
        return toSetProgress(set, owned.size, extra, missingActive.get(setId) ?? 0);
      })
      .filter((row): row is CollectionSetProgressView => row != null)
      .sort((a, b) => a.setName.localeCompare(b.setName, "es"));
  }

  async setDetail(userId: string, setId: string, page: number, pageSize: number): Promise<CollectionSetDetailView> {
    assertUuid(setId);
    await this.ensureDefault(userId);
    const set = await this.prisma.tcgSet.findUnique({
      where: { id: setId },
      include: { game: true, _count: { select: { cards: true } } },
    });
    if (!set) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Set no encontrado");
    }
    const collection = await this.ensureDefault(userId);
    const ownedRows = await this.prisma.collectionItem.findMany({
      where: { collectionId: collection.id, variant: { card: { setId } } },
      select: { quantity: true, variant: { select: { cardId: true } } },
    });
    const qtyByCard = new Map<string, number>();
    for (const row of ownedRows) {
      qtyByCard.set(row.variant.cardId, (qtyByCard.get(row.variant.cardId) ?? 0) + row.quantity);
    }
    const ownedIds = [...qtyByCard.keys()];
    const extraCopies = duplicateStats(qtyByCard.values()).extraCopies;

    const missingWhere: Prisma.CardWhereInput = {
      setId,
      ...(ownedIds.length ? { id: { notIn: ownedIds } } : {}),
    };
    const [missingTotal, missingCards] = await this.prisma.$transaction([
      this.prisma.card.count({ where: missingWhere }),
      this.prisma.card.findMany({
        where: missingWhere,
        orderBy: [{ number: "asc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, name: true, number: true, slug: true, imageUrl: true },
      }),
    ]);
    const activeCardIds = await this.cardsWithActiveListings(missingCards.map((card) => card.id));
    const missingWithActive = await this.countMissingWithActiveListings(setId, ownedIds);

    return {
      progress: toSetProgress(set, qtyByCard.size, extraCopies, missingWithActive),
      missing: {
        items: missingCards.map((card) => ({
          cardId: card.id,
          name: card.name,
          number: card.number,
          slug: card.slug,
          imageUrl: card.imageUrl,
          gameSlug: set.game.slug,
          setSlug: set.slug,
          hasActiveListing: activeCardIds.has(card.id),
        })),
        page,
        pageSize,
        total: missingTotal,
      },
      disclaimer: COLLECTION_VALUE_DISCLAIMER,
    };
  }

  async assertOwnedItemId(userId: string, itemId: string): Promise<void> {
    await this.requireOwnedItem(userId, itemId);
  }

  private async ensureDefault(userId: string) {
    this.flags.assertCollectionsAllowed();
    const existing = await this.prisma.collection.findUnique({ where: { userId } });
    if (existing) return existing;
    try {
      return await this.prisma.collection.create({
        data: { userId, name: "Default", isDefault: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await this.prisma.collection.findUnique({ where: { userId } });
        if (raced) return raced;
      }
      throw error;
    }
  }

  private async requireOwnedCollection(userId: string, id: string) {
    this.flags.assertCollectionsAllowed();
    const row = await this.prisma.collection.findFirst({ where: { id, userId } });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Colección no encontrada");
    }
    return row;
  }

  private async requireOwnedItem(userId: string, id: string) {
    this.flags.assertCollectionsAllowed();
    const row = await this.prisma.collectionItem.findFirst({
      where: { id, collection: { userId } },
      include: itemInclude,
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Ítem no encontrado");
    }
    return row;
  }

  private async itemWhere(collectionId: string, query: ListCollectionItemsQuery): Promise<Prisma.CollectionItemWhereInput> {
    const duplicateIds = query.duplicates ? await this.duplicateCardIds(collectionId) : null;
    const q = query.q?.trim();
    return {
      collectionId,
      ...(query.condition ? { condition: query.condition } : {}),
      variant: {
        ...(duplicateIds
          ? { cardId: { in: duplicateIds.length ? duplicateIds : ["00000000-0000-0000-0000-000000000000"] } }
          : {}),
        card: {
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { number: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
          ...((query.game || query.set)
            ? {
                set: {
                  ...(query.set ? { slug: query.set } : {}),
                  ...(query.game ? { game: { slug: query.game } } : {}),
                },
              }
            : {}),
        },
      },
    };
  }

  private orderBy(sort: ListCollectionItemsQuery["sort"]): Prisma.CollectionItemOrderByWithRelationInput[] {
    if (sort === "name") return [{ variant: { card: { name: "asc" } } }, { createdAt: "desc" }];
    if (sort === "quantity") return [{ quantity: "desc" }, { createdAt: "desc" }];
    return [{ createdAt: "desc" }];
  }

  private async estimatedValuePageIds(
    collectionId: string,
    query: ListCollectionItemsQuery,
    estimates: Map<string, number>,
  ): Promise<string[]> {
    const estimateJoin =
      estimates.size === 0
        ? Prisma.sql`LEFT JOIN (SELECT NULL::uuid AS variant_id, NULL::"CardCondition" AS condition, NULL::int AS unit_clp WHERE false) AS est ON false`
        : Prisma.sql`LEFT JOIN (
            VALUES ${Prisma.join(
              [...estimates.entries()].map(([key, unit]) => {
                const cut = key.lastIndexOf(":");
                return Prisma.sql`(${key.slice(0, cut)}::uuid, ${key.slice(cut + 1)}::"CardCondition", ${unit}::int)`;
              }),
            )}
          ) AS est(variant_id, condition, unit_clp)
            ON est.variant_id = ci.variant_id AND est.condition = ci.condition`;

    const filters: Prisma.Sql[] = [Prisma.sql`ci.collection_id = ${collectionId}::uuid`];
    if (query.condition) {
      filters.push(Prisma.sql`ci.condition = ${query.condition}::"CardCondition"`);
    }
    const q = query.q?.trim();
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
      filters.push(Prisma.sql`(c.name ILIKE ${like} ESCAPE chr(92) OR c.number ILIKE ${like} ESCAPE chr(92))`);
    }
    if (query.game) filters.push(Prisma.sql`g.slug = ${query.game}`);
    if (query.set) filters.push(Prisma.sql`s.slug = ${query.set}`);
    if (query.duplicates) {
      const dupIds = await this.duplicateCardIds(collectionId);
      if (dupIds.length === 0) return [];
      filters.push(Prisma.sql`c.id IN (${Prisma.join(dupIds.map((id) => Prisma.sql`${id}::uuid`))})`);
    }

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT ci.id
      FROM collection_items ci
      INNER JOIN card_variants cv ON cv.id = ci.variant_id
      INNER JOIN cards c ON c.id = cv.card_id
      INNER JOIN sets s ON s.id = c.set_id
      INNER JOIN tcg_games g ON g.id = s.game_id
      ${estimateJoin}
      WHERE ${Prisma.join(filters, " AND ")}
      ORDER BY (CASE WHEN est.unit_clp IS NULL THEN -1 ELSE ci.quantity * est.unit_clp END) DESC,
               ci.created_at DESC
      LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
    `);
    return rows.map((row) => row.id);
  }

  private async duplicateCardIds(collectionId: string): Promise<string[]> {
    const rows = await this.prisma.collectionItem.findMany({
      where: { collectionId },
      select: { quantity: true, variant: { select: { cardId: true } } },
    });
    const qty = new Map<string, number>();
    for (const row of rows) {
      qty.set(row.variant.cardId, (qty.get(row.variant.cardId) ?? 0) + row.quantity);
    }
    return [...qty.entries()].filter(([, total]) => total > 1).map(([cardId]) => cardId);
  }

  private async estimatesFor(
    lots: Array<{ variantId: string; condition: string }>,
  ): Promise<Map<string, number>> {
    const variantIds = [...new Set(lots.map((lot) => lot.variantId))];
    const out = new Map<string, number>();
    if (variantIds.length === 0) return out;
    const listings = await this.prisma.listing.findMany({
      where: { status: "ACTIVE", quantity: { gt: 0 }, variantId: { in: variantIds } },
      select: { variantId: true, condition: true, priceClp: true, quantity: true, quantityReserved: true },
    });
    const buckets = new Map<string, PriceBucket>();
    for (const listing of listings) {
      if (!listing.variantId || listing.quantity - listing.quantityReserved <= 0) continue;
      const anyKey = listing.variantId;
      const condKey = `${listing.variantId}:${listing.condition ?? ""}`;
      const any = buckets.get(anyKey) ?? { comparable: [], anyCondition: [] };
      any.anyCondition.push(listing.priceClp);
      buckets.set(anyKey, any);
      const cond = buckets.get(condKey) ?? { comparable: [], anyCondition: [] };
      cond.comparable.push(listing.priceClp);
      buckets.set(condKey, cond);
    }
    for (const lot of lots) {
      const key = priceKey(lot.variantId, lot.condition);
      if (out.has(key)) continue;
      const comparable = buckets.get(key)?.comparable ?? [];
      const fallback = buckets.get(lot.variantId)?.anyCondition ?? [];
      const unit = estimateUnitClp(comparable, fallback);
      if (unit != null) out.set(key, unit);
    }
    return out;
  }

  private async missingWithListingsBySet(
    setIds: string[],
    ownedBySet: Map<string, Set<string>>,
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    for (const setId of setIds) {
      const owned = [...(ownedBySet.get(setId) ?? [])];
      result.set(setId, await this.countMissingWithActiveListings(setId, owned));
    }
    return result;
  }

  private async countMissingWithActiveListings(setId: string, ownedCardIds: string[]): Promise<number> {
    const missing = await this.prisma.card.findMany({
      where: { setId, ...(ownedCardIds.length ? { id: { notIn: ownedCardIds } } : {}) },
      select: { id: true },
    });
    if (missing.length === 0) return 0;
    const active = await this.cardsWithActiveListings(missing.map((card) => card.id));
    return active.size;
  }

  private async cardsWithActiveListings(cardIds: string[]): Promise<Set<string>> {
    if (cardIds.length === 0) return new Set();
    const rows = await this.prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        quantity: { gt: 0 },
        variant: { cardId: { in: cardIds } },
      },
      select: { variant: { select: { cardId: true } }, quantity: true, quantityReserved: true },
    });
    const out = new Set<string>();
    for (const row of rows) {
      if (row.quantity - row.quantityReserved > 0 && row.variant) out.add(row.variant.cardId);
    }
    return out;
  }

  private async change30d(collectionId: string, current: number | null): Promise<number | null> {
    if (current == null) return null;
    const target = addUtcDays(utcDateOnly(), -30);
    const exact = await this.prisma.collectionValueSnapshot.findUnique({
      where: { collectionId_capturedOn: { collectionId, capturedOn: target } },
    });
    const past =
      exact ??
      (await this.prisma.collectionValueSnapshot.findFirst({
        where: { collectionId, capturedOn: { lte: target } },
        orderBy: { capturedOn: "desc" },
      }));
    if (!past) return null;
    return current - past.valueClp;
  }

  private toItemView(row: ItemRow, estimates: Map<string, number>): CollectionItemView {
    const estimatedUnitClp = estimates.get(priceKey(row.variantId, row.condition)) ?? null;
    return {
      id: row.id,
      collectionId: row.collectionId,
      variantId: row.variantId,
      condition: row.condition,
      quantity: row.quantity,
      purchasePriceClp: row.purchasePriceClp,
      purchasedAt: dateOnly(row.purchasedAt),
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      estimatedUnitClp,
      estimatedValueClp: lotEstimatedValueClp(row.quantity, estimatedUnitClp),
      registeredCostClp: lotRegisteredCostClp(row.quantity, row.purchasePriceClp),
      estimatedPlClp: lotEstimatedPlClp(row.quantity, estimatedUnitClp, row.purchasePriceClp),
      variant: {
        id: row.variant.id,
        language: row.variant.language,
        finish: row.variant.finish,
        finishDetail: row.variant.finishDetail,
        isDefault: row.variant.isDefault,
        card: {
          id: row.variant.card.id,
          slug: row.variant.card.slug,
          name: row.variant.card.name,
          number: row.variant.card.number,
          rarity: row.variant.card.rarity,
          imageUrl: row.variant.card.imageUrl,
          gameSlug: row.variant.card.set.game.slug,
          setSlug: row.variant.card.set.slug,
        },
      },
    };
  }
}

function assertUuid(id: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "No encontrado");
  }
}

function priceKey(variantId: string, condition: string): string {
  return `${variantId}:${condition}`;
}

function toCollectionView(row: { id: string; name: string; isDefault: boolean; createdAt: Date; updatedAt: Date }): CollectionView {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSetProgress(
  set: {
    id: string;
    name: string;
    slug: string;
    game: { slug: string; name: string };
    _count: { cards: number };
  },
  ownedUnique: number,
  extraCopies: number,
  missingWithActiveListings: number,
): CollectionSetProgressView {
  const total = set._count.cards;
  return {
    setId: set.id,
    setName: set.name,
    setSlug: set.slug,
    gameSlug: set.game.slug,
    gameName: set.game.name,
    ownedUnique,
    total,
    percentage: setProgressPercent(ownedUnique, total),
    missing: Math.max(0, total - ownedUnique),
    extraCopies,
    missingWithActiveListings,
  };
}

function parseDateOnly(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function dateOnly(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}
