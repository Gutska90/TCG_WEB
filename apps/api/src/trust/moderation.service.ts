import { HttpStatus, Injectable } from "@nestjs/common";
import { ERROR_CODES } from "@tcg/config";
import type { ListingView, SellerSuspensionView } from "@tcg/types";
import type { AdminModerationReasonInput } from "@tcg/validation";
import type { RequestUser } from "../auth/request-user";
import { AppError } from "../common/errors/app-error";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { listingInclude, toListingView } from "../listings/listing.mapper";
import { MarketService } from "../listings/market.service";
import { PrismaService } from "../prisma/prisma.service";
import { ListingRevisionService } from "./listing-revision.service";
import { ModerationLogService } from "./moderation-log.service";
import { sanitizePlainText } from "./sanitize";
import { findActiveSuspension } from "./seller-suspension";
import { assertAdminOps, assertModerationStaff } from "./trust-access";

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revisions: ListingRevisionService,
    private readonly log: ModerationLogService,
    private readonly market: MarketService,
    private readonly flags: FeatureFlagsService,
  ) {}

  async pauseListing(actor: RequestUser, listingId: string, input: AdminModerationReasonInput): Promise<ListingView> {
    assertModerationStaff(actor);
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Publicación no encontrada");
    }
    if (listing.status !== "ACTIVE") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.LISTING_NOT_ACTIVE, "Solo se pausan publicaciones activas");
    }
    const before = this.revisions.snapshot(listing);
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.listing.update({
        where: { id: listingId },
        data: { status: "PAUSED" },
        include: listingInclude,
      });
      await this.revisions.record(tx, {
        listingId,
        actorId: actor.id,
        source: "ADMIN",
        reason: input.reason,
        before,
        after: this.revisions.snapshot(updated),
      });
      if (updated.variantId) await this.market.snapshotVariant(tx, updated.variantId);
      return updated;
    });
    await this.log.record(actor, {
      targetType: "Listing",
      targetId: listingId,
      actionType: "LISTING_PAUSED",
      reason: input.reason,
    });
    return toListingView(row);
  }

  async restoreListing(actor: RequestUser, listingId: string, input: AdminModerationReasonInput): Promise<ListingView> {
    assertModerationStaff(actor);
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Publicación no encontrada");
    }
    if (listing.status !== "PAUSED") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, "Solo se restauran publicaciones pausadas");
    }
    this.flags.assertNewListingsAllowed();
    const suspension = await findActiveSuspension(this.prisma, listing.sellerId);
    if (suspension) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.SELLER_SUSPENDED,
        "El vendedor está suspendido; no se puede restaurar",
      );
    }
    const before = this.revisions.snapshot(listing);
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.listing.update({
        where: { id: listingId },
        data: { status: "ACTIVE" },
        include: listingInclude,
      });
      await this.revisions.record(tx, {
        listingId,
        actorId: actor.id,
        source: "ADMIN",
        reason: input.reason,
        before,
        after: this.revisions.snapshot(updated),
      });
      if (updated.variantId) await this.market.snapshotVariant(tx, updated.variantId);
      return updated;
    });
    await this.log.record(actor, {
      targetType: "Listing",
      targetId: listingId,
      actionType: "LISTING_RESTORED",
      reason: input.reason,
    });
    return toListingView(row);
  }

  async warnUser(actor: RequestUser, userId: string, input: AdminModerationReasonInput): Promise<void> {
    assertModerationStaff(actor);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Usuario no encontrado");
    await this.log.record(actor, {
      targetType: "User",
      targetId: userId,
      actionType: "USER_WARNED",
      reason: input.reason,
    });
  }

  async suspendSeller(actor: RequestUser, sellerId: string, input: AdminModerationReasonInput): Promise<SellerSuspensionView> {
    assertAdminOps(actor);
    const seller = await this.prisma.user.findUnique({ where: { id: sellerId }, select: { id: true } });
    if (!seller) throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Usuario no encontrado");
    const existing = await findActiveSuspension(this.prisma, sellerId);
    if (existing) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, "El vendedor ya está suspendido");
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sellerSuspension.create({
        data: {
          sellerId,
          reason: sanitizePlainText(input.reason, 1000),
          createdById: actor.id,
        },
      });
      const active = await tx.listing.findMany({
        where: { sellerId, status: "ACTIVE" },
        include: listingInclude,
      });
      for (const listing of active) {
        const before = this.revisions.snapshot(listing);
        const updated = await tx.listing.update({
          where: { id: listing.id },
          data: { status: "PAUSED" },
          include: listingInclude,
        });
        await this.revisions.record(tx, {
          listingId: listing.id,
          actorId: actor.id,
          source: "ADMIN",
          reason: "seller.suspended",
          before,
          after: this.revisions.snapshot(updated),
        });
        if (updated.variantId) await this.market.snapshotVariant(tx, updated.variantId);
      }
      return { created, pausedIds: active.map((row) => row.id) };
    });
    await this.log.record(actor, {
      targetType: "Seller",
      targetId: sellerId,
      actionType: "SELLER_SUSPENDED",
      reason: input.reason,
      metadata: { pausedListingIds: row.pausedIds },
    });
    for (const listingId of row.pausedIds) {
      await this.log.record(actor, {
        targetType: "Listing",
        targetId: listingId,
        actionType: "LISTING_PAUSED",
        reason: "seller.suspended",
      });
    }
    return {
      id: row.created.id,
      sellerId: row.created.sellerId,
      reason: row.created.reason,
      createdAt: row.created.createdAt.toISOString(),
      liftedAt: null,
    };
  }

  async restoreSeller(actor: RequestUser, sellerId: string, input: AdminModerationReasonInput): Promise<SellerSuspensionView> {
    assertAdminOps(actor);
    const row = await findActiveSuspension(this.prisma, sellerId);
    if (!row) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, "El vendedor no está suspendido");
    }
    const updated = await this.prisma.sellerSuspension.update({
      where: { id: row.id },
      data: { liftedAt: new Date(), liftedById: actor.id },
    });
    await this.log.record(actor, {
      targetType: "Seller",
      targetId: sellerId,
      actionType: "SELLER_RESTORED",
      reason: input.reason,
    });
    return {
      id: updated.id,
      sellerId: updated.sellerId,
      reason: updated.reason,
      createdAt: updated.createdAt.toISOString(),
      liftedAt: updated.liftedAt?.toISOString() ?? null,
    };
  }
}
