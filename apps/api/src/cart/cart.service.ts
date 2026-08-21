import { HttpStatus, Injectable } from "@nestjs/common";
import { ERROR_CODES } from "@tcg/config";
import type { CartView } from "@tcg/types";
import type { PutCartItemInput } from "@tcg/validation";
import { randomToken } from "../common/crypto/tokens";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { availableQty, cartItemInclude, toCartView } from "./cart.mapper";
import { listingInclude } from "../listings/listing.mapper";

export type CartActor = {
  userId?: string;
  guestToken?: string;
};

export type CartResult = {
  view: CartView;
  issuedGuestToken?: string;
  clearGuestCookie?: boolean;
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async get(actor: CartActor): Promise<CartResult> {
    const session = await this.ensureCart(actor);
    return this.load(session);
  }

  async putItem(actor: CartActor, input: PutCartItemInput): Promise<CartResult> {
    const session = await this.ensureCart(actor);
    const listing = await this.prisma.listing.findUnique({
      where: { id: input.listingId },
      include: listingInclude,
    });
    if (!listing) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Publicación no encontrada");
    }
    if (actor.userId && listing.sellerId === actor.userId) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FORBIDDEN, "No puedes agregar tu propia publicación");
    }
    if (listing.status !== "ACTIVE") {
      throw new AppError(
        HttpStatus.CONFLICT,
        ERROR_CODES.LISTING_NOT_ACTIVE,
        "La publicación no está activa",
      );
    }
    const available = availableQty(listing);
    if (input.quantity > available) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ERROR_CODES.LISTING_INSUFFICIENT_STOCK,
        "No hay stock suficiente",
      );
    }
    await this.prisma.cartItem.upsert({
      where: { cartId_listingId: { cartId: session.cartId, listingId: listing.id } },
      create: { cartId: session.cartId, listingId: listing.id, quantity: input.quantity },
      update: { quantity: input.quantity },
    });
    return this.load(session);
  }

  async removeItem(actor: CartActor, listingId: string): Promise<CartResult> {
    const session = await this.ensureCart(actor);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: session.cartId, listingId },
    });
    return this.load(session);
  }

  async clearItems(userId: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) return;
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  private async load(session: EnsuredCart): Promise<CartResult> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: session.cartId },
      include: {
        items: { orderBy: { createdAt: "asc" }, include: cartItemInclude },
      },
    });
    if (!cart) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Carrito no encontrado");
    }
    return {
      view: toCartView(cart.id, cart.items, session.userId),
      issuedGuestToken: session.issuedGuestToken,
      clearGuestCookie: session.clearGuestCookie,
    };
  }

  private async ensureCart(actor: CartActor): Promise<EnsuredCart> {
    if (actor.userId) {
      if (actor.guestToken) {
        await this.mergeGuestIntoUser(actor.userId, actor.guestToken);
      }
      const existing = await this.prisma.cart.findUnique({ where: { userId: actor.userId } });
      if (existing) {
        return {
          cartId: existing.id,
          userId: actor.userId,
          clearGuestCookie: Boolean(actor.guestToken),
        };
      }
      const created = await this.prisma.cart.create({ data: { userId: actor.userId } });
      return {
        cartId: created.id,
        userId: actor.userId,
        clearGuestCookie: Boolean(actor.guestToken),
      };
    }

    const guestToken = actor.guestToken ?? randomToken();
    const existing = await this.prisma.cart.findUnique({ where: { guestToken } });
    if (existing) {
      return { cartId: existing.id, issuedGuestToken: guestToken };
    }
    const created = await this.prisma.cart.create({ data: { guestToken } });
    return { cartId: created.id, issuedGuestToken: guestToken };
  }

  private async mergeGuestIntoUser(userId: string, guestToken: string): Promise<void> {
    const guest = await this.prisma.cart.findUnique({
      where: { guestToken },
      include: { items: { include: { listing: true } } },
    });
    if (!guest || guest.userId === userId) {
      if (guest?.userId === userId) {
        await this.prisma.cart.update({ where: { id: guest.id }, data: { guestToken: null } });
      }
      return;
    }
    const userCart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (!userCart) {
        await tx.cart.update({
          where: { id: guest.id },
          data: { userId, guestToken: null },
        });
        await tx.cartItem.deleteMany({
          where: {
            cartId: guest.id,
            listing: { sellerId: userId },
          },
        });
        return;
      }
      if (userCart.id === guest.id) {
        await tx.cart.update({ where: { id: guest.id }, data: { guestToken: null } });
        return;
      }
      for (const item of guest.items) {
        if (item.listing.sellerId === userId) continue;
        if (item.listing.status !== "ACTIVE") continue;
        const available = availableQty(item.listing);
        if (available <= 0) continue;
        const current = userCart.items.find((row) => row.listingId === item.listingId);
        const nextQty = Math.min((current?.quantity ?? 0) + item.quantity, available);
        if (nextQty < 1) continue;
        if (current) {
          await tx.cartItem.update({
            where: { id: current.id },
            data: { quantity: nextQty },
          });
        } else {
          await tx.cartItem.create({
            data: { cartId: userCart.id, listingId: item.listingId, quantity: nextQty },
          });
        }
      }
      await tx.cart.delete({ where: { id: guest.id } });
    });
  }
}

type EnsuredCart = {
  cartId: string;
  userId?: string;
  issuedGuestToken?: string;
  clearGuestCookie?: boolean;
};
