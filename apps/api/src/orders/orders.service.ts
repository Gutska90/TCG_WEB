import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  COURIER_METHODS,
  ERROR_CODES,
  PLATFORM,
  commissionClp,
  type ShippingMethod,
} from "@tcg/config";
import type { CheckoutView, OrderView, Paginated } from "@tcg/types";
import type {
  CancelOrderInput,
  CheckoutInput,
  DisputeOrderInput,
  ListOrdersQuery,
  ShipOrderInput,
} from "@tcg/validation";
import { randomBytes } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import type { RequestUser } from "../auth/request-user";
import { cartItemInclude, toCartView } from "../cart/cart.mapper";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { ShippingService, shipmentCreateData } from "../shipping/shipping.service";
import { checkoutInclude, orderInclude, toCheckoutView, toOrderView } from "./order.mapper";
import { consumeReservedStock, releaseStock, reserveStock, restoreSoldStock } from "./stock";

const STAFF_ROLES = new Set(["MODERATOR", "ADMIN", "SUPER_ADMIN"]);

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly shipping: ShippingService,
  ) {}

  async createCheckout(
    actor: RequestUser,
    input: CheckoutInput,
    idempotencyKey: string | undefined,
    mp: CheckoutView["mercadopago"],
  ): Promise<CheckoutView> {
    if (!actor.emailVerified) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.EMAIL_NOT_VERIFIED, "Verifica tu email para comprar");
    }
    const key = idempotencyKey?.trim() || null;
    if (key) {
      const existing = await this.prisma.checkout.findFirst({
        where: { buyerId: actor.id, idempotencyKey: key },
        include: checkoutInclude,
      });
      if (existing) {
        await this.expireIfNeeded(existing.id);
        return this.getCheckout(actor, existing.id, mp);
      }
    }

    const checkoutId = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId: actor.id },
        include: { items: { include: cartItemInclude } },
      });
      if (!cart || cart.items.length === 0) {
        throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.CART_EMPTY, "El carrito está vacío");
      }
      const view = toCartView(cart.id, cart.items, actor.id);
      const purchasable = view.items.filter((item) => item.purchasable);
      if (purchasable.length === 0) {
        throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.CART_EMPTY, "El carrito está vacío");
      }
      if (purchasable.length !== view.items.length) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.LISTING_NOT_ACTIVE,
          "Hay publicaciones no disponibles en el carrito",
        );
      }

      const groups = view.groups.filter((group) => group.items.every((item) => item.purchasable));
      const selectionBySeller = new Map(input.shippingSelections.map((row) => [row.sellerId, row]));
      if (groups.length !== input.shippingSelections.length) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          "Elige un método de envío por vendedor",
        );
      }

      const expiresAt = new Date(Date.now() + PLATFORM.checkoutReservationMinutes * 60_000);
      let checkoutTotal = 0;
      const created = await tx.checkout.create({
        data: {
          buyerId: actor.id,
          status: "PENDING_PAYMENT",
          totalClp: 0,
          idempotencyKey: key,
          expiresAt,
        },
      });

      for (const group of groups) {
        const selection = selectionBySeller.get(group.seller.id);
        if (!selection) {
          throw new AppError(
            HttpStatus.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR,
            "Elige un método de envío por vendedor",
          );
        }
        this.assertShipping(group.items.map((item) => item.listing), selection.method, selection.addressId);
        const sellerProfile = await tx.profile.findUnique({ where: { userId: group.seller.id } });
        let destComuna = sellerProfile?.comuna?.trim() || "Santiago";
        let destRegion = sellerProfile?.region ?? null;
        if (selection.addressId) {
          const address = await tx.address.findFirst({
            where: { id: selection.addressId, userId: actor.id },
          });
          if (!address) {
            throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Dirección no encontrada");
          }
          if (COURIER_METHODS.has(selection.method) && address.phone.trim().length < 8) {
            throw new AppError(
              HttpStatus.BAD_REQUEST,
              ERROR_CODES.VALIDATION_ERROR,
              "El envío requiere teléfono en la dirección",
            );
          }
          destComuna = address.comuna;
          destRegion = address.region;
        }
        const quote = await this.shipping.quoteFromPlaces({
          sellerId: group.seller.id,
          method: selection.method,
          originComuna: sellerProfile?.comuna ?? "",
          originRegion: sellerProfile?.region ?? null,
          destComuna,
          destRegion,
        });
        const subtotalClp = group.subtotalClp;
        const shippingClp = quote.priceClp;
        const totalClp = subtotalClp + shippingClp;
        checkoutTotal += totalClp;
        for (const item of group.items) {
          await reserveStock(tx, item.listingId, item.quantity);
        }
        await tx.order.create({
          data: {
            orderNumber: this.newOrderNumber(),
            checkoutId: created.id,
            buyerId: actor.id,
            sellerId: group.seller.id,
            status: "PENDING_PAYMENT",
            subtotalClp,
            shippingClp,
            commissionClp: commissionClp(subtotalClp),
            totalClp,
            shippingMethod: selection.method,
            shippingAddressId: selection.addressId ?? null,
            items: {
              create: group.items.map((item) => ({
                listingId: item.listingId,
                variantId: item.listing.variant.id,
                titleSnapshot: item.listing.title,
                condition: item.listing.condition,
                quantity: item.quantity,
                unitPriceClp: item.listing.priceClp,
              })),
            },
            shipment: { create: shipmentCreateData(selection.method) },
          },
        });
      }

      await tx.checkout.update({ where: { id: created.id }, data: { totalClp: checkoutTotal } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created.id;
    });

    await this.audit.log({
      actorId: actor.id,
      action: "checkout.created",
      entityType: "Checkout",
      entityId: checkoutId,
    });
    return this.getCheckout(actor, checkoutId, mp);
  }

  async getCheckout(
    actor: RequestUser,
    id: string,
    mp: CheckoutView["mercadopago"],
  ): Promise<CheckoutView> {
    await this.expireIfNeeded(id);
    const row = await this.prisma.checkout.findUnique({ where: { id }, include: checkoutInclude });
    if (!row || (row.buyerId !== actor.id && !this.isStaff(actor))) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Checkout no encontrado");
    }
    return toCheckoutView(row, mp);
  }

  async list(actor: RequestUser, query: ListOrdersQuery): Promise<Paginated<OrderView>> {
    const where = query.as === "buyer" ? { buyerId: actor.id } : { sellerId: actor.id };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: items.map(toOrderView),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async get(actor: RequestUser, id: string): Promise<OrderView> {
    const order = await this.requireVisible(actor, id);
    await this.expireIfNeeded(order.checkoutId);
    const fresh = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!fresh) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
    }
    return toOrderView(fresh);
  }

  async prepare(actor: RequestUser, id: string): Promise<OrderView> {
    const order = await this.requireSeller(actor, id);
    this.assertStatus(order.status, ["PAID"]);
    return this.transition(actor, id, { status: "PREPARING" }, "order.prepared");
  }

  async ship(actor: RequestUser, id: string, input: ShipOrderInput): Promise<OrderView> {
    const order = await this.requireSeller(actor, id);
    this.assertStatus(order.status, ["PREPARING"]);
    if (order.shippingMethod === "MEETUP") {
      if (!input.meetupPlace) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          "Indica lugar del encuentro",
        );
      }
      const updated = await this.prisma.$transaction(async (tx) => {
        if (order.shipment) {
          await tx.shipment.update({
            where: { id: order.shipment.id },
            data: {
              meetupPlace: input.meetupPlace,
              meetupAt: input.meetupAt ? new Date(input.meetupAt) : null,
            },
          });
        }
        return tx.order.update({
          where: { id },
          data: { status: "READY_FOR_MEETUP", shippedAt: new Date() },
          include: orderInclude,
        });
      });
      await this.audit.log({ actorId: actor.id, action: "order.ready_for_meetup", entityType: "Order", entityId: id });
      if (order.shipment) {
        await this.audit.log({
          actorId: actor.id,
          action: "shipment.meetup_set",
          entityType: "Shipment",
          entityId: order.shipment.id,
        });
      }
      return toOrderView(updated);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      if (order.shipment) {
        await tx.shipment.update({
          where: { id: order.shipment.id },
          data: {
            trackingCode: input.trackingCode ?? null,
            status: "IN_TRANSIT",
          },
        });
      }
      return tx.order.update({
        where: { id },
        data: { status: "SHIPPED", shippedAt: new Date() },
        include: orderInclude,
      });
    });
    await this.audit.log({ actorId: actor.id, action: "order.shipped", entityType: "Order", entityId: id });
    if (order.shipment) {
      await this.audit.log({
        actorId: actor.id,
        action: "shipment.in_transit",
        entityType: "Shipment",
        entityId: order.shipment.id,
        metadata: { trackingCode: input.trackingCode ?? null },
      });
    }
    return toOrderView(updated);
  }

  async deliver(actor: RequestUser, id: string): Promise<OrderView> {
    const order = await this.requireSeller(actor, id);
    this.assertStatus(order.status, ["SHIPPED", "READY_FOR_MEETUP"]);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (order.shipment) {
        await tx.shipment.update({
          where: { id: order.shipment.id },
          data: { status: "DELIVERED" },
        });
      }
      return tx.order.update({
        where: { id },
        data: { status: "DELIVERED", deliveredAt: new Date() },
        include: orderInclude,
      });
    });
    await this.audit.log({ actorId: actor.id, action: "order.delivered", entityType: "Order", entityId: id });
    if (order.shipment) {
      await this.audit.log({
        actorId: actor.id,
        action: "shipment.delivered",
        entityType: "Shipment",
        entityId: order.shipment.id,
      });
    }
    return toOrderView(updated);
  }

  async confirm(actor: RequestUser, id: string): Promise<OrderView> {
    const order = await this.requireBuyer(actor, id);
    this.assertStatus(order.status, ["DELIVERED"]);
    const payment = await this.prisma.payment.findUnique({ where: { orderId: id } });
    if (!payment || payment.status !== "HELD") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.PAYMENT_NOT_HELD, "El pago no está retenido");
    }
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "RELEASED", releasedAt: now },
      });
      return tx.order.update({
        where: { id },
        data: { status: "COMPLETED", confirmedAt: now, completedAt: now },
        include: orderInclude,
      });
    });
    await this.audit.log({
      actorId: actor.id,
      action: "order.confirmed",
      entityType: "Order",
      entityId: id,
      metadata: { paymentId: payment.id },
    });
    await this.audit.log({
      actorId: actor.id,
      action: "payment.released",
      entityType: "Payment",
      entityId: payment.id,
    });
    return toOrderView(updated);
  }

  async cancel(actor: RequestUser, id: string, input: CancelOrderInput): Promise<OrderView> {
    const order = await this.requireVisible(actor, id);
    const isBuyer = order.buyerId === actor.id;
    const isSeller = order.sellerId === actor.id;
    if (!isBuyer && !isSeller && !this.isStaff(actor)) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
    }
    if (order.status === "PENDING_PAYMENT") {
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await releaseStock(tx, item.listingId, item.quantity);
        }
        await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
        await tx.shipment.updateMany({ where: { orderId: id }, data: { status: "CANCELLED" } });
        const pending = await tx.order.count({
          where: { checkoutId: order.checkoutId, status: "PENDING_PAYMENT" },
        });
        if (pending === 0) {
          await tx.checkout.update({
            where: { id: order.checkoutId },
            data: { status: "CANCELLED" },
          });
        }
      });
      await this.audit.log({
        actorId: actor.id,
        action: "order.cancelled",
        entityType: "Order",
        entityId: id,
        metadata: { reason: input.reason ?? null, stage: "PENDING_PAYMENT" },
      });
      return this.get(actor, id);
    }
    if (order.status === "PAID" || order.status === "PREPARING") {
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await restoreSoldStock(tx, item.listingId, item.quantity);
        }
        const payment = await tx.payment.findUnique({ where: { orderId: id } });
        if (payment) {
          await tx.refund.create({
            data: {
              paymentId: payment.id,
              amountClp: payment.amountClp,
              reason: input.reason ?? "cancelacion",
              status: "PENDING",
            },
          });
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "REFUNDED", refundedAt: new Date() },
          });
        }
        await tx.order.update({ where: { id }, data: { status: "REFUNDED" } });
        await tx.shipment.updateMany({ where: { orderId: id }, data: { status: "CANCELLED" } });
      });
      await this.audit.log({
        actorId: actor.id,
        action: "order.refunded",
        entityType: "Order",
        entityId: id,
        metadata: { reason: input.reason ?? null },
      });
      return this.get(actor, id);
    }
    throw new AppError(
      HttpStatus.CONFLICT,
      ERROR_CODES.ORDER_ILLEGAL_TRANSITION,
      "No se puede cancelar en este estado",
    );
  }

  async dispute(actor: RequestUser, id: string, input: DisputeOrderInput): Promise<OrderView> {
    const order = await this.requireVisible(actor, id);
    if (order.buyerId !== actor.id && order.sellerId !== actor.id) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
    }
    this.assertStatus(order.status, ["PAID", "PREPARING", "SHIPPED", "READY_FOR_MEETUP", "DELIVERED"]);
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: "DISPUTED", notes: input.reason },
      include: orderInclude,
    });
    await this.audit.log({
      actorId: actor.id,
      action: "order.disputed",
      entityType: "Order",
      entityId: id,
      metadata: { reason: input.reason },
    });
    return toOrderView(updated);
  }

  async applyApproved(
    checkoutId: string,
    providerPaymentId: string,
    payload: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.expireIfNeeded(checkoutId);
    const checkout = await this.prisma.checkout.findUnique({
      where: { id: checkoutId },
      include: { orders: { include: { items: true, payment: true } } },
    });
    if (!checkout) return;
    if (checkout.status === "PAID") return;
    if (checkout.status !== "PENDING_PAYMENT") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CHECKOUT_EXPIRED, "El checkout ya no admite pago");
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      for (const order of checkout.orders) {
        if (order.status !== "PENDING_PAYMENT") continue;
        for (const item of order.items) {
          await consumeReservedStock(tx, item.listingId, item.quantity);
        }
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              status: "HELD",
              providerPaymentId,
              heldAt: now,
              rawPayload: payload,
            },
          });
        } else {
          await tx.payment.create({
            data: {
              orderId: order.id,
              provider: "MERCADOPAGO",
              providerPaymentId,
              status: "HELD",
              amountClp: order.totalClp,
              heldAt: now,
              rawPayload: payload,
            },
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: { status: "PAID", paidAt: now },
        });
      }
      await tx.checkout.update({ where: { id: checkoutId }, data: { status: "PAID" } });
    });
    await this.audit.log({
      action: "checkout.paid",
      entityType: "Checkout",
      entityId: checkoutId,
      metadata: { providerPaymentId, paymentStatus: "HELD" },
    });
  }

  async applyRejected(checkoutId: string, payload: Prisma.InputJsonValue): Promise<void> {
    const checkout = await this.prisma.checkout.findUnique({
      where: { id: checkoutId },
      include: { orders: { include: { items: true, payment: true } } },
    });
    if (!checkout || checkout.status !== "PENDING_PAYMENT") return;
    await this.prisma.$transaction(async (tx) => {
      for (const order of checkout.orders) {
        for (const item of order.items) {
          await releaseStock(tx, item.listingId, item.quantity);
        }
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: "REJECTED", rawPayload: payload },
          });
        }
        await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
        await tx.shipment.updateMany({ where: { orderId: order.id }, data: { status: "CANCELLED" } });
      }
      await tx.checkout.update({ where: { id: checkoutId }, data: { status: "CANCELLED" } });
    });
    await this.audit.log({
      action: "checkout.payment_rejected",
      entityType: "Checkout",
      entityId: checkoutId,
    });
  }

  async attachPreference(checkoutId: string, preferenceId: string): Promise<void> {
    await this.prisma.checkout.update({
      where: { id: checkoutId },
      data: { mercadoPagoPreferenceId: preferenceId },
    });
  }

  async findByPreferenceId(preferenceId: string): Promise<string | null> {
    const row = await this.prisma.checkout.findUnique({
      where: { mercadoPagoPreferenceId: preferenceId },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async getCheckoutRecord(id: string) {
    return this.prisma.checkout.findUnique({
      where: { id },
      include: checkoutInclude,
    });
  }

  async ensurePendingPayments(checkoutId: string): Promise<void> {
    const checkout = await this.prisma.checkout.findUnique({
      where: { id: checkoutId },
      include: { orders: { include: { payment: true } } },
    });
    if (!checkout) return;
    for (const order of checkout.orders) {
      if (order.payment) continue;
      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "MERCADOPAGO",
          status: "PENDING",
          amountClp: order.totalClp,
        },
      });
    }
  }

  private async expireIfNeeded(checkoutId: string): Promise<void> {
    const checkout = await this.prisma.checkout.findUnique({
      where: { id: checkoutId },
      include: { orders: { include: { items: true } } },
    });
    if (!checkout || checkout.status !== "PENDING_PAYMENT") return;
    if (checkout.expiresAt > new Date()) return;
    await this.prisma.$transaction(async (tx) => {
      for (const order of checkout.orders) {
        if (order.status !== "PENDING_PAYMENT") continue;
        for (const item of order.items) {
          await releaseStock(tx, item.listingId, item.quantity);
        }
        await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
        await tx.shipment.updateMany({ where: { orderId: order.id }, data: { status: "CANCELLED" } });
      }
      await tx.checkout.update({ where: { id: checkoutId }, data: { status: "EXPIRED" } });
    });
    await this.audit.log({
      action: "checkout.expired",
      entityType: "Checkout",
      entityId: checkoutId,
    });
  }

  private assertShipping(
    listings: Array<{ allowsMeetup: boolean; allowsShipping: boolean }>,
    method: ShippingMethod,
    addressId: string | undefined,
  ): void {
    if (method === "STORE_PICKUP") {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.SHIPPING_METHOD_UNAVAILABLE,
        "El retiro en tienda no está disponible",
      );
    }
    if (method === "MEETUP") {
      if (listings.some((row) => !row.allowsMeetup)) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ERROR_CODES.SHIPPING_METHOD_UNAVAILABLE,
          "Este vendedor no ofrece encuentro",
        );
      }
      return;
    }
    if (COURIER_METHODS.has(method)) {
      if (!addressId) {
        throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "El envío requiere dirección");
      }
      if (listings.some((row) => !row.allowsShipping)) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ERROR_CODES.SHIPPING_METHOD_UNAVAILABLE,
          "Este vendedor no ofrece envío",
        );
      }
    }
  }

  private async transition(
    actor: RequestUser,
    id: string,
    data: Prisma.OrderUpdateInput,
    action: string,
  ): Promise<OrderView> {
    const updated = await this.prisma.order.update({ where: { id }, data, include: orderInclude });
    await this.audit.log({ actorId: actor.id, action, entityType: "Order", entityId: id });
    return toOrderView(updated);
  }

  private assertStatus(current: string, allowed: string[]): void {
    if (!allowed.includes(current)) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ERROR_CODES.ORDER_ILLEGAL_TRANSITION,
        "Transición de orden no permitida",
      );
    }
  }

  private async requireVisible(actor: RequestUser, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
    }
    if (order.buyerId !== actor.id && order.sellerId !== actor.id && !this.isStaff(actor)) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
    }
    return order;
  }

  private async requireSeller(actor: RequestUser, id: string) {
    const order = await this.requireVisible(actor, id);
    if (order.sellerId !== actor.id && !this.isStaff(actor)) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
    }
    return order;
  }

  private async requireBuyer(actor: RequestUser, id: string) {
    const order = await this.requireVisible(actor, id);
    if (order.buyerId !== actor.id && !this.isStaff(actor)) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
    }
    return order;
  }

  private isStaff(actor: RequestUser): boolean {
    return actor.roles.some((role) => STAFF_ROLES.has(role));
  }

  private newOrderNumber(): string {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `TCG-${stamp}-${randomBytes(3).toString("hex").toUpperCase()}`;
  }
}
