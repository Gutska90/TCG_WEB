import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ERROR_CODES, PLATFORM } from "@tcg/config";
import type { ListingView, Paginated } from "@tcg/types";
import type { CreateListingInput, ListListingsQuery, PatchListingInput } from "@tcg/validation";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { RequestUser } from "../auth/request-user";
import { listingInclude, toListingView } from "./listing.mapper";
import { MarketService } from "./market.service";
import { RatingsService } from "../ratings/ratings.service";
import { ListingRevisionService } from "../trust/listing-revision.service";
import { assertSellerNotSuspended } from "../trust/seller-suspension";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { WishlistService } from "../wishlist/wishlist.service";

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly audit: AuditService,
    private readonly ratings: RatingsService,
    private readonly revisions: ListingRevisionService,
    private readonly flags: FeatureFlagsService,
    private readonly wishlist: WishlistService,
  ) {}

  async listPublic(query: ListListingsQuery): Promise<Paginated<ListingView>> {
    const q = query.q?.trim();
    const cardWhere: Prisma.CardWhereInput = {
      ...(query.game || query.set
        ? {
            set: {
              ...(query.set ? { slug: query.set } : {}),
              ...(query.game ? { game: { slug: query.game } } : {}),
            },
          }
        : {}),
      ...(query.cardType || query.raza || query.coste != null
        ? {
            AND: [
              ...(query.cardType ? [{ attributes: { path: ["cardType"], equals: query.cardType } }] : []),
              ...(query.raza ? [{ attributes: { path: ["raza"], equals: query.raza } }] : []),
              ...(query.coste != null ? [{ attributes: { path: ["coste"], equals: query.coste } }] : []),
            ],
          }
        : {}),
    };
    const variantWhere: Prisma.CardVariantWhereInput = {
      ...(query.language ? { language: query.language } : {}),
      ...(query.finish ? { finish: query.finish } : {}),
      ...(Object.keys(cardWhere).length > 0 ? { card: cardWhere } : {}),
    };
    const where: Prisma.ListingWhereInput = {
      status: "ACTIVE",
      quantity: { gt: 0 },
      ...(query.variantId ? { variantId: query.variantId } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(query.condition ? { condition: query.condition } : {}),
      ...(query.allowsShipping === "true" ? { allowsShipping: true } : {}),
      ...(query.allowsShipping === "false" ? { allowsShipping: false } : {}),
      ...(query.allowsMeetup === "true" ? { allowsMeetup: true } : {}),
      ...(query.allowsMeetup === "false" ? { allowsMeetup: false } : {}),
      ...(query.minPrice || query.maxPrice
        ? { priceClp: { gte: query.minPrice, lte: query.maxPrice } }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { variant: { card: { name: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
      ...(Object.keys(variantWhere).length > 0 ? { variant: variantWhere } : {}),
    };
    const sort = query.sort ?? "priceAsc";
    const orderBy: Prisma.ListingOrderByWithRelationInput =
      sort === "newest" || sort === "relevance"
        ? { publishedAt: "desc" }
        : sort === "priceDesc"
          ? { priceClp: "desc" }
          : sort === "nameAsc"
            ? { title: "asc" }
            : { priceClp: "asc" };
    return this.page(where, query.page, query.pageSize, orderBy);
  }

  async listMine(userId: string, page: number, pageSize: number): Promise<Paginated<ListingView>> {
    return this.page({ sellerId: userId, status: { not: "CANCELLED" } }, page, pageSize, {
      createdAt: "desc",
    });
  }

  async getPublic(id: string, actorId?: string): Promise<ListingView> {
    const row = await this.prisma.listing.findUnique({ where: { id }, include: listingInclude });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Publicación no encontrada");
    }
    const isOwner = actorId != null && row.sellerId === actorId;
    if (!isOwner && (row.status !== "ACTIVE" || row.quantity - row.quantityReserved <= 0)) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Publicación no encontrada");
    }
    return this.attachReputation(toListingView(row));
  }

  async create(actor: RequestUser, input: CreateListingInput): Promise<ListingView> {
    this.assertCanSell(actor);
    this.flags.assertNewListingsAllowed();
    await assertSellerNotSuspended(this.prisma, actor.id);
    const profile = await this.prisma.profile.findUnique({ where: { userId: actor.id } });
    if (!profile?.sellerOnboardedAt) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.SELLER_ONBOARDING_REQUIRED,
        "Completa el onboarding de vendedor",
      );
    }
    const variant = await this.prisma.cardVariant.findUnique({
      where: { id: input.variantId },
      include: { card: true },
    });
    if (!variant) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Variante no encontrada");
    }
    await this.assertOwnedReadyFiles(actor.id, input.imageFileIds);
    let sourceCollectionItemId: string | undefined;
    if (input.sourceCollectionItemId) {
      const item = await this.prisma.collectionItem.findFirst({
        where: { id: input.sourceCollectionItemId, collection: { userId: actor.id } },
      });
      if (!item) {
        throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Ítem de colección no encontrado");
      }
      sourceCollectionItemId = item.id;
    }
    const now = new Date();
    const row = await this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          sellerId: actor.id,
          variantId: variant.id,
          productType: "SINGLE",
          title: variant.card.name,
          condition: input.condition,
          quantity: input.quantity,
          priceClp: input.priceClp,
          status: "ACTIVE",
          description: input.description ?? "",
          sourceCollectionItemId,
          allowsMeetup: input.allowsMeetup,
          allowsShipping: input.allowsShipping,
          graded: input.graded ?? false,
          grader: input.grader,
          grade: input.grade,
          publishedAt: now,
          images: {
            create: input.imageFileIds.map((fileId, sortOrder) => ({ fileId, sortOrder })),
          },
        },
        include: listingInclude,
      });
      await this.market.snapshotVariant(tx, variant.id);
      return listing;
    });
    await this.audit.log({
      actorId: actor.id,
      action: "listing.created",
      entityType: "Listing",
      entityId: row.id,
      metadata: { priceClp: input.priceClp, variantId: variant.id },
    });
    this.pingWishlist(variant.id);
    return this.attachReputation(toListingView(row));
  }

  async update(actor: RequestUser, id: string, input: PatchListingInput): Promise<ListingView> {
    const listing = await this.requireOwnedMutable(actor.id, id);
    if (input.quantity != null && input.quantity < listing.quantityReserved) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, "La cantidad no puede ser menor a la reservada");
    }
    const allowsMeetup = input.allowsMeetup ?? listing.allowsMeetup;
    const allowsShipping = input.allowsShipping ?? listing.allowsShipping;
    if (!allowsMeetup && !allowsShipping) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "Elige retiro, envío o ambos");
    }
    if (input.imageFileIds) {
      await this.assertOwnedReadyFiles(actor.id, input.imageFileIds);
    }
    const row = await this.prisma.$transaction(async (tx) => {
      if (input.imageFileIds) {
        await tx.listingImage.deleteMany({ where: { listingId: id } });
        await tx.listingImage.createMany({
          data: input.imageFileIds.map((fileId, sortOrder) => ({ listingId: id, fileId, sortOrder })),
        });
      }
      const updated = await tx.listing.update({
        where: { id },
        data: {
          ...(input.condition ? { condition: input.condition } : {}),
          ...(input.quantity != null ? { quantity: input.quantity } : {}),
          ...(input.priceClp != null ? { priceClp: input.priceClp } : {}),
          ...(input.description != null ? { description: input.description } : {}),
          ...(input.allowsMeetup != null ? { allowsMeetup: input.allowsMeetup } : {}),
          ...(input.allowsShipping != null ? { allowsShipping: input.allowsShipping } : {}),
          ...(input.graded != null ? { graded: input.graded } : {}),
          ...(input.grader !== undefined ? { grader: input.grader } : {}),
          ...(input.grade !== undefined ? { grade: input.grade } : {}),
        },
        include: listingInclude,
      });
      await this.revisions.record(tx, {
        listingId: id,
        actorId: actor.id,
        source: "SELLER",
        reason: "seller.edit",
        before: this.revisions.snapshot(listing),
        after: this.revisions.snapshot(updated),
      });
      if (updated.variantId) {
        await this.market.snapshotVariant(tx, updated.variantId);
      }
      return updated;
    });
    await this.audit.log({
      actorId: actor.id,
      action: "listing.updated",
      entityType: "Listing",
      entityId: id,
      metadata: { priceClp: row.priceClp },
    });
    if (row.variantId) this.pingWishlist(row.variantId);
    return this.attachReputation(toListingView(row));
  }

  async pause(actor: RequestUser, id: string): Promise<ListingView> {
    const listing = await this.requireOwnedMutable(actor.id, id);
    if (listing.status !== "ACTIVE") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.LISTING_NOT_ACTIVE, "Solo puedes pausar publicaciones activas");
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.listing.update({
        where: { id },
        data: { status: "PAUSED" },
        include: listingInclude,
      });
      await this.revisions.record(tx, {
        listingId: id,
        actorId: actor.id,
        source: "SELLER",
        reason: "seller.pause",
        before: this.revisions.snapshot(listing),
        after: this.revisions.snapshot(updated),
      });
      if (updated.variantId) {
        await this.market.snapshotVariant(tx, updated.variantId);
      }
      return updated;
    });
    await this.audit.log({ actorId: actor.id, action: "listing.paused", entityType: "Listing", entityId: id });
    return this.attachReputation(toListingView(row));
  }

  async activate(actor: RequestUser, id: string): Promise<ListingView> {
    const listing = await this.requireOwnedMutable(actor.id, id);
    if (listing.status !== "PAUSED") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, "Solo puedes activar publicaciones pausadas");
    }
    this.flags.assertNewListingsAllowed();
    await assertSellerNotSuspended(this.prisma, actor.id);
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.listing.update({
        where: { id },
        data: { status: "ACTIVE", publishedAt: listing.publishedAt ?? new Date() },
        include: listingInclude,
      });
      await this.revisions.record(tx, {
        listingId: id,
        actorId: actor.id,
        source: "SELLER",
        reason: "seller.activate",
        before: this.revisions.snapshot(listing),
        after: this.revisions.snapshot(updated),
      });
      if (updated.variantId) {
        await this.market.snapshotVariant(tx, updated.variantId);
      }
      return updated;
    });
    await this.audit.log({ actorId: actor.id, action: "listing.activated", entityType: "Listing", entityId: id });
    if (row.variantId) this.pingWishlist(row.variantId);
    return this.attachReputation(toListingView(row));
  }

  async cancel(actor: RequestUser, id: string): Promise<void> {
    const listing = await this.requireOwnedMutable(actor.id, id);
    await this.prisma.listing.update({ where: { id }, data: { status: "CANCELLED" } });
    if (listing.variantId) {
      await this.prisma.$transaction(async (tx) => {
        await this.market.snapshotVariant(tx, listing.variantId as string);
      });
    }
    await this.audit.log({ actorId: actor.id, action: "listing.cancelled", entityType: "Listing", entityId: id });
  }

  private pingWishlist(variantId: string): void {
    void this.wishlist.checkVariant(variantId).catch(() => undefined);
  }

  private async page(
    where: Prisma.ListingWhereInput,
    page: number,
    pageSize: number,
    orderBy: Prisma.ListingOrderByWithRelationInput,
  ): Promise<Paginated<ListingView>> {
    const size = pageSize ?? PLATFORM.searchPageSizeDefault;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        orderBy,
        skip: (page - 1) * size,
        take: size,
        include: listingInclude,
      }),
    ]);
    let items = await this.attachMany(rows.map(toListingView));
    if (orderBy.priceClp === "asc" || orderBy.priceClp === "desc") {
      const dir = orderBy.priceClp === "desc" ? -1 : 1;
      items = [...items].sort((a, b) => {
        if (a.priceClp !== b.priceClp) return (a.priceClp - b.priceClp) * dir;
        return (b.seller.reputation.averageStars ?? 0) - (a.seller.reputation.averageStars ?? 0);
      });
    }
    return { items, page, pageSize: size, total };
  }

  private async attachReputation(item: ListingView): Promise<ListingView> {
    const [next] = await this.attachMany([item]);
    return next ?? item;
  }

  private async attachMany(items: ListingView[]): Promise<ListingView[]> {
    const reputations = await this.ratings.summarizeForUsers(items.map((item) => item.seller.id));
    return items.map((item) => ({
      ...item,
      seller: {
        ...item.seller,
        reputation: reputations.get(item.seller.id) ?? item.seller.reputation,
      },
    }));
  }

  private assertCanSell(actor: RequestUser): void {
    if (!actor.emailVerified) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.EMAIL_NOT_VERIFIED,
        "Verifica tu email para vender",
      );
    }
    if (!actor.roles.includes("SELLER") && !actor.roles.includes("STORE") && !actor.roles.includes("ADMIN") && !actor.roles.includes("SUPER_ADMIN")) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.SELLER_ONBOARDING_REQUIRED,
        "Completa el onboarding de vendedor",
      );
    }
  }

  private async requireOwnedMutable(userId: string, id: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing || listing.sellerId !== userId) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Publicación no encontrada");
    }
    if (listing.status === "CANCELLED" || listing.status === "SOLD") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, "La publicación ya no se puede editar");
    }
    return listing;
  }

  private async assertOwnedReadyFiles(userId: string, fileIds: string[]): Promise<void> {
    const unique = [...new Set(fileIds)];
    if (unique.length !== fileIds.length) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "Fotos duplicadas");
    }
    const files = await this.prisma.file.findMany({ where: { id: { in: unique } } });
    if (files.length !== unique.length) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Archivo no encontrado");
    }
    for (const file of files) {
      if (file.uploadedById !== userId || file.status !== "READY") {
        throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "Foto no lista");
      }
    }
  }
}
