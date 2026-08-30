import { forwardRef, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  COURIER_METHODS,
  ERROR_CODES,
  PLATFORM,
  orderFeeSnapshotFromQuote,
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
import { lockCheckoutGraph, lockListings, MONEY_TX } from "./checkout.lock";
import { checkoutInclude, orderInclude, toCheckoutView, toOrderView } from "./order.mapper";
import { consumeReservedStock, releaseStock, reserveStock } from "./stock";
import { RefundsService } from "../payments/refunds.service";
import { LedgerService } from "../ledger/ledger.service";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { MetricsService } from "../observability/metrics.service";
import { CollectionsService } from "../collections/collections.service";
import { NotificationsService } from "../notifications/notifications.service";
import { formatClp, orderCardLabel } from "../notifications/order-notification-copy";
import { MarketplaceFeeService } from "../seller-plans/marketplace-fee.service";
import { SellerPlanService } from "../seller-plans/seller-plan.service";

const LATE_PAYMENT_NOTE =
  "[late_payment] Cobro Mercado Pago tras checkout terminal. Sin fulfillment. Reembolso pendiente.";
export const LATE_PAYMENT_REFUND_REASON = "late_payment_after_expiry";

export type ApplyApprovedResult =
  | { kind: "paid" }
  | { kind: "duplicate" }
  | { kind: "late_payment" }
  | { kind: "missing" };

const STAFF_ROLES = new Set(["MODERATOR", "ADMIN", "SUPER_ADMIN"]);

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly shipping: ShippingService,
    @Inject(forwardRef(() => RefundsService))
    private readonly refunds: RefundsService,
    private readonly ledger: LedgerService,
    private readonly flags: FeatureFlagsService,
    private readonly metrics: MetricsService,
    private readonly collections: CollectionsService,
    private readonly notifications: NotificationsService,
    private readonly sellerPlans: SellerPlanService,
    private readonly marketplaceFees: MarketplaceFeeService,
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
    this.flags.assertCheckoutAllowed();
    const started = Date.now();
    const key = idempotencyKey?.trim() || null;
    try {
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
      await lockListings(
        tx,
        purchasable.map((item) => item.listingId),
      );
      await this.sellerPlans.lockSellers(
        tx,
        groups.map((group) => group.seller.id),
      );
      const pricedAt = new Date();
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
        const feeQuote = await this.marketplaceFees.calculate(
          { sellerId: group.seller.id, orderSubtotalClp: subtotalClp, at: pricedAt },
          tx,
        );
        this.marketplaceFees.recordOrderQuote(feeQuote);
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
            ...orderFeeSnapshotFromQuote(feeQuote),
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
    }, MONEY_TX);

    await this.audit.log({
      actorId: actor.id,
      action: "checkout.created",
      entityType: "Checkout",
      entityId: checkoutId,
    });
    this.metrics.inc("checkout_created_total");
    this.metrics.observe("checkout_duration", Date.now() - started);
    return this.getCheckout(actor, checkoutId, mp);
    } catch (error) {
      this.metrics.inc("checkout_failed_total");
      if (error instanceof AppError && error.code === ERROR_CODES.LISTING_INSUFFICIENT_STOCK) {
        this.metrics.inc("stock_conflict_total");
      }
      throw error;
    }
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
    await this.assertNoBlockingRefund(id);
    return this.transition(actor, id, { status: "PREPARING" }, "order.prepared");
  }

  async ship(actor: RequestUser, id: string, input: ShipOrderInput): Promise<OrderView> {
    const order = await this.requireSeller(actor, id);
    this.assertStatus(order.status, ["PREPARING"]);
    await this.assertNoBlockingRefund(id);
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
      await this.notifyBuyerShipped(updated);
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
    await this.notifyBuyerShipped(updated);
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
    await this.notifications.safeEmit({
      userId: order.buyerId,
      type: "ORDER_DELIVERED",
      title: "Pedido entregado",
      body: `Marcaron como entregado el pedido ${order.orderNumber}.`,
      data: { orderId: id, orderNumber: order.orderNumber },
      dedupeKey: `ORDER_DELIVERED:${id}`,
    });
    return toOrderView(updated);
  }

  async confirm(actor: RequestUser, id: string): Promise<OrderView> {
    const order = await this.requireBuyer(actor, id);
    this.assertStatus(order.status, ["DELIVERED"]);
    const payment = await this.prisma.payment.findUnique({ where: { orderId: id } });
    if (!payment || payment.status !== "HELD") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.PAYMENT_NOT_HELD, "El pago aún no está listo para confirmar la recepción");
    }
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const graph = await lockCheckoutGraph(tx, order.checkoutId);
      const locked = graph?.orders.find((row) => row.id === id);
      if (!locked) {
        throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
      }
      this.assertStatus(locked.status, ["DELIVERED"]);
      if (!locked.payment || locked.payment.status !== "HELD") {
        throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.PAYMENT_NOT_HELD, "El pago aún no está listo para confirmar la recepción");
      }
      await tx.payment.update({
        where: { id: locked.payment.id },
        data: { status: "RELEASED", releasedAt: now },
      });
      const completed = await tx.order.update({
        where: { id },
        data: { status: "COMPLETED", confirmedAt: now, completedAt: now },
        include: orderInclude,
      });
      await this.ledger.recordRelease(tx, {
        sellerId: locked.seller.id,
        orderId: id,
        paymentId: locked.payment.id,
        totalClp: locked.totalClp,
        commissionClp: locked.commissionClp,
      });
      await this.collections.applySaleDeduction(
        id,
        locked.seller.id,
        locked.items.map((item) => ({ listingId: item.listingId, quantity: item.quantity })),
        tx,
      );
      return completed;
    }, MONEY_TX);
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
    await this.notifications.safeEmit({
      userId: order.sellerId,
      type: "ORDER_CONFIRMED",
      title: "Recepción confirmada",
      body: `El comprador confirmó la recepción de ${order.orderNumber}.`,
      data: { orderId: id, orderNumber: order.orderNumber },
      dedupeKey: `ORDER_CONFIRMED:${id}`,
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
    let refundId: string | null = null;
    const beforeStatus = order.status;
    await this.prisma.$transaction(async (tx) => {
      const graph = await lockCheckoutGraph(tx, order.checkoutId);
      const fresh = graph?.orders.find((row) => row.id === id);
      if (!graph || !fresh) {
        throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
      }
      if (fresh.status === "PENDING_PAYMENT") {
        for (const item of fresh.items) {
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
        await this.audit.log(
          {
            actorId: actor.id,
            action: "order.cancelled",
            entityType: "Order",
            entityId: id,
            metadata: { reason: input.reason ?? null, stage: "PENDING_PAYMENT" },
          },
          tx,
        );
        return;
      }
      if (fresh.status === "REFUNDED") {
        return;
      }
      if (fresh.status === "PAID" || fresh.status === "PREPARING") {
        const payment = await tx.payment.findUnique({ where: { orderId: id } });
        if (!payment) {
          throw new AppError(
            HttpStatus.CONFLICT,
            ERROR_CODES.ORDER_ILLEGAL_TRANSITION,
            "La orden no tiene pago para reembolsar",
          );
        }
        let refund = await tx.refund.findFirst({
          where: { paymentId: payment.id },
          orderBy: { createdAt: "asc" },
        });
        if (refund?.status === "COMPLETED") {
          return;
        }
        if (!refund) {
          refund = await tx.refund.create({
            data: {
              paymentId: payment.id,
              amountClp: payment.amountClp,
              reason: input.reason ?? "cancelacion",
              status: "PENDING",
            },
          });
          await this.audit.log(
            {
              actorId: actor.id,
              action: "refund.requested",
              entityType: "Refund",
              entityId: refund.id,
              metadata: {
                event: "REFUND_REQUESTED",
                orderId: id,
                paymentId: payment.id,
                amountClp: payment.amountClp,
                reason: input.reason ?? "cancelacion",
              },
            },
            tx,
          );
        } else if (refund.status === "FAILED") {
          refund = await tx.refund.update({
            where: { id: refund.id },
            data: { status: "PENDING" },
          });
        }
        refundId = refund.id;
        return;
      }
      throw new AppError(
        HttpStatus.CONFLICT,
        ERROR_CODES.ORDER_ILLEGAL_TRANSITION,
        "No se puede cancelar en este estado",
      );
    }, MONEY_TX);
    if (refundId) {
      const outcome = await this.refunds.execute(refundId);
      if (outcome !== "completed") {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.REFUND_PROVIDER_ERROR,
          "No se pudo completar el reembolso. Reintenta.",
        );
      }
    }
    const view = await this.get(actor, id);
    if (view.status !== beforeStatus || refundId) {
      await this.notifyOrderCancelled(order.buyerId, order.sellerId, view.id, view.orderNumber);
    }
    return view;
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
    const counterpartId = actor.id === order.buyerId ? order.sellerId : order.buyerId;
    await this.notifications.safeEmit({
      userId: counterpartId,
      type: "ORDER_DISPUTED",
      title: "Reclamo abierto",
      body: `Hay un reclamo en el pedido ${order.orderNumber}.`,
      data: { orderId: id, orderNumber: order.orderNumber },
      dedupeKey: `ORDER_DISPUTED:${id}:${counterpartId}`,
    });
    return toOrderView(updated);
  }

  async applyApproved(
    checkoutId: string,
    providerPaymentId: string,
    payload: Prisma.InputJsonValue,
  ): Promise<ApplyApprovedResult> {
    const result = await this.prisma.$transaction(
      (tx) => this.applyApprovedInTx(tx, checkoutId, providerPaymentId, payload),
      MONEY_TX,
    );
    if (result.kind === "late_payment") {
      await this.refunds.executeOpenForCheckout(checkoutId);
    }
    if (result.kind === "paid") {
      await this.notifyPaidCheckout(checkoutId);
    }
    return result;
  }

  async applyApprovedInTx(
    tx: Prisma.TransactionClient,
    checkoutId: string,
    providerPaymentId: string,
    payload: Prisma.InputJsonValue,
  ): Promise<ApplyApprovedResult> {
    const checkout = await lockCheckoutGraph(tx, checkoutId);
    if (!checkout) {
      return { kind: "missing" };
    }
    if (checkout.status === "PAID") {
      return { kind: "duplicate" };
    }
    if (checkout.status === "EXPIRED" || checkout.status === "CANCELLED") {
      return this.recordLatePayment(tx, checkout, providerPaymentId, payload);
    }
    if (checkout.status !== "PENDING_PAYMENT") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CHECKOUT_EXPIRED, "El checkout ya no admite pago");
    }

    const now = new Date();
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
      const payment = await tx.payment.findUniqueOrThrow({ where: { orderId: order.id } });
      await this.ledger.recordCapture(tx, {
        sellerId: order.sellerId,
        orderId: order.id,
        paymentId: payment.id,
        totalClp: order.totalClp,
        commissionClp: order.commissionClp,
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID", paidAt: now },
      });
    }
    await tx.checkout.update({ where: { id: checkoutId }, data: { status: "PAID" } });
    await this.audit.log(
      {
        action: "checkout.paid",
        entityType: "Checkout",
        entityId: checkoutId,
        metadata: { providerPaymentId, paymentStatus: "HELD" },
      },
      tx,
    );
    return { kind: "paid" };
  }

  async applyRejected(checkoutId: string, payload: Prisma.InputJsonValue): Promise<void> {
    await this.prisma.$transaction((tx) => this.applyRejectedInTx(tx, checkoutId, payload), MONEY_TX);
    await this.notifyCancelledCheckout(checkoutId);
  }

  async applyRejectedInTx(
    tx: Prisma.TransactionClient,
    checkoutId: string,
    payload: Prisma.InputJsonValue,
  ): Promise<void> {
    const checkout = await lockCheckoutGraph(tx, checkoutId);
    if (!checkout || checkout.status !== "PENDING_PAYMENT") return;
    for (const order of checkout.orders) {
      if (order.status !== "PENDING_PAYMENT") continue;
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
    await this.audit.log(
      {
        action: "checkout.payment_rejected",
        entityType: "Checkout",
        entityId: checkoutId,
      },
      tx,
    );
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

  async expireCheckoutIfNeeded(checkoutId: string): Promise<boolean> {
    return this.expireIfNeeded(checkoutId);
  }

  private async expireIfNeeded(checkoutId: string): Promise<boolean> {
    const peek = await this.prisma.checkout.findUnique({
      where: { id: checkoutId },
      select: { status: true, expiresAt: true },
    });
    if (!peek || peek.status !== "PENDING_PAYMENT" || peek.expiresAt > new Date()) {
      return false;
    }
    return this.prisma.$transaction(async (tx) => {
      const checkout = await lockCheckoutGraph(tx, checkoutId);
      if (!checkout || checkout.status !== "PENDING_PAYMENT") return false;
      if (checkout.expiresAt > new Date()) return false;
      for (const order of checkout.orders) {
        if (order.status !== "PENDING_PAYMENT") continue;
        for (const item of order.items) {
          await releaseStock(tx, item.listingId, item.quantity);
        }
        await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
        await tx.shipment.updateMany({ where: { orderId: order.id }, data: { status: "CANCELLED" } });
      }
      await tx.checkout.update({ where: { id: checkoutId }, data: { status: "EXPIRED" } });
      await this.audit.log(
        {
          action: "checkout.expired",
          entityType: "Checkout",
          entityId: checkoutId,
        },
        tx,
      );
      return true;
    }, MONEY_TX);
  }

  private async recordLatePayment(
    tx: Prisma.TransactionClient,
    checkout: Prisma.CheckoutGetPayload<{ include: typeof checkoutInclude }>,
    providerPaymentId: string,
    payload: Prisma.InputJsonValue,
  ): Promise<ApplyApprovedResult> {
    let createdRefund = false;
    for (const order of checkout.orders) {
      let payment = order.payment;
      if (payment) {
        const alreadyRecorded =
          payment.providerPaymentId === providerPaymentId &&
          (payment.status === "APPROVED" || payment.status === "HELD" || payment.status === "REFUNDED");
        if (!alreadyRecorded) {
          payment = await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "APPROVED",
              providerPaymentId,
              rawPayload: payload,
            },
          });
        }
      } else {
        payment = await tx.payment.create({
          data: {
            orderId: order.id,
            provider: "MERCADOPAGO",
            providerPaymentId,
            status: "APPROVED",
            amountClp: order.totalClp,
            rawPayload: payload,
          },
        });
      }

      const existingRefund = await tx.refund.findFirst({
        where: { paymentId: payment.id, reason: LATE_PAYMENT_REFUND_REASON },
      });
      if (!existingRefund) {
        const created = await tx.refund.create({
          data: {
            paymentId: payment.id,
            amountClp: payment.amountClp,
            reason: LATE_PAYMENT_REFUND_REASON,
            status: "PENDING",
          },
        });
        createdRefund = true;
        await this.audit.log(
          {
            action: "refund.requested",
            entityType: "Refund",
            entityId: created.id,
            metadata: {
              event: "REFUND_REQUESTED",
              reason: LATE_PAYMENT_REFUND_REASON,
              paymentId: payment.id,
              amountClp: payment.amountClp,
            },
          },
          tx,
        );
      }

      if (!order.notes.includes("[late_payment]")) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            notes: order.notes.trim().length > 0 ? `${order.notes.trim()}\n${LATE_PAYMENT_NOTE}` : LATE_PAYMENT_NOTE,
          },
        });
      }
    }

    if (createdRefund) {
      await this.audit.log(
        {
          action: "checkout.late_payment",
          entityType: "Checkout",
          entityId: checkout.id,
          metadata: {
            alert: "HIGH_PRIORITY",
            providerPaymentId,
            checkoutStatus: checkout.status,
            refundStatus: "PENDING",
          },
        },
        tx,
      );
    }
    return { kind: createdRefund ? "late_payment" : "duplicate" };
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

  private async assertNoBlockingRefund(orderId: string): Promise<void> {
    if (await this.refunds.hasBlockingRefund(orderId)) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ERROR_CODES.ORDER_ILLEGAL_TRANSITION,
        "Hay un reembolso en curso",
      );
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

  async notifyPaidCheckout(checkoutId: string): Promise<void> {
    const checkout = await this.prisma.checkout.findUnique({
      where: { id: checkoutId },
      include: checkoutInclude,
    });
    if (!checkout) return;
    for (const order of checkout.orders) {
      if (order.status !== "PAID") continue;
      const cardName = orderCardLabel(order.items);
      const price = formatClp(order.totalClp);
      await this.notifications.safeEmit({
        userId: order.sellerId,
        type: "SALE_MADE",
        title: "Nueva venta",
        body: `Vendiste ${cardName} por ${price}.`,
        data: { orderId: order.id, orderNumber: order.orderNumber },
        dedupeKey: `SALE_MADE:${order.id}`,
      });
      await this.notifications.safeEmit({
        userId: order.buyerId,
        type: "PURCHASE_MADE",
        title: "Compra confirmada",
        body: `Compraste ${cardName} por ${price}.`,
        data: { orderId: order.id, orderNumber: order.orderNumber },
        dedupeKey: `PURCHASE_MADE:${order.id}`,
      });
    }
  }

  async notifyCancelledCheckout(checkoutId: string): Promise<void> {
    const checkout = await this.prisma.checkout.findUnique({
      where: { id: checkoutId },
      include: checkoutInclude,
    });
    if (!checkout) return;
    for (const order of checkout.orders) {
      if (order.status !== "CANCELLED") continue;
      await this.notifyOrderCancelled(order.buyerId, order.sellerId, order.id, order.orderNumber);
    }
  }

  private async notifyBuyerShipped(order: {
    id: string;
    buyerId: string;
    orderNumber: string;
    seller: { displayName: string };
  }): Promise<void> {
    await this.notifications.safeEmit({
      userId: order.buyerId,
      type: "ORDER_SHIPPED",
      title: "Pedido en camino",
      body: `${order.seller.displayName} despachó tu pedido ${order.orderNumber}.`,
      data: { orderId: order.id, orderNumber: order.orderNumber },
      dedupeKey: `ORDER_SHIPPED:${order.id}`,
    });
  }

  private async notifyOrderCancelled(
    buyerId: string,
    sellerId: string,
    orderId: string,
    orderNumber: string,
  ): Promise<void> {
    const body = `Se canceló el pedido ${orderNumber}.`;
    const data = { orderId, orderNumber };
    await this.notifications.safeEmit({
      userId: buyerId,
      type: "ORDER_CANCELLED",
      title: "Pedido cancelado",
      body,
      data,
      dedupeKey: `ORDER_CANCELLED:${orderId}:${buyerId}`,
    });
    await this.notifications.safeEmit({
      userId: sellerId,
      type: "ORDER_CANCELLED",
      title: "Pedido cancelado",
      body,
      data,
      dedupeKey: `ORDER_CANCELLED:${orderId}:${sellerId}`,
    });
  }

  private newOrderNumber(): string {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `TCG-${stamp}-${randomBytes(3).toString("hex").toUpperCase()}`;
  }
}
