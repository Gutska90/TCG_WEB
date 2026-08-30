import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ERROR_CODES } from "@tcg/config";
import type {
  AdminAuditEventView,
  AdminOrderDetailView,
  AdminPaymentDetailView,
  AdminRefundDetailView,
  AdminRefundListItem,
  AdminRefundRetryView,
} from "@tcg/types";
import type { AdminCancelOrderInput } from "@tcg/validation";
import { AuditService } from "../audit/audit.service";
import type { RequestUser } from "../auth/request-user";
import { AppError } from "../common/errors/app-error";
import { OrdersService } from "../orders/orders.service";
import { RefundsService } from "../payments/refunds.service";
import { PrismaService } from "../prisma/prisma.service";
import { toShipmentView } from "../shipping/shipment.mapper";
import { toAdminParty, toAdminPayment, toAdminRefund } from "./admin.mappers";

const PARTY_SELECT = { id: true, displayName: true, slug: true, email: true } as const;

const PAYMENT_SAFE_SELECT = {
  id: true,
  orderId: true,
  status: true,
  amountClp: true,
  provider: true,
  providerPaymentId: true,
  heldAt: true,
  releasedAt: true,
  refundedAt: true,
  createdAt: true,
} as const;

const REFUND_PAYMENT_SELECT = {
  orderId: true,
  order: { select: { orderNumber: true } },
} as const;

const SECRET_KEY = /payload|password|token|secret|hash/i;

@Injectable()
export class AdminActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orders: OrdersService,
    private readonly refunds: RefundsService,
  ) {}

  async getOrder(id: string): Promise<AdminOrderDetailView> {
    const row = await this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: PARTY_SELECT },
        seller: { select: PARTY_SELECT },
        items: true,
        shipment: true,
        checkout: {
          select: { id: true, status: true, totalClp: true, expiresAt: true, createdAt: true },
        },
        payment: {
          select: {
            ...PAYMENT_SAFE_SELECT,
            order: { select: { orderNumber: true } },
            refunds: {
              include: { payment: { select: REFUND_PAYMENT_SELECT } },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
    }
    const payment = row.payment;
    const refunds = payment ? payment.refunds.map(toAdminRefund) : [];
    const timeline = await this.timeline({
      orderId: row.id,
      checkoutId: row.checkoutId,
      paymentId: payment?.id,
      refundIds: refunds.map((item) => item.id),
    });
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      checkoutId: row.checkoutId,
      status: row.status,
      subtotalClp: row.subtotalClp,
      shippingClp: row.shippingClp,
      commissionClp: row.commissionClp,
      totalClp: row.totalClp,
      shippingMethod: row.shippingMethod,
      notes: row.notes,
      paidAt: row.paidAt?.toISOString() ?? null,
      shippedAt: row.shippedAt?.toISOString() ?? null,
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      buyer: toAdminParty(row.buyer),
      seller: toAdminParty(row.seller),
      items: row.items.map((item) => ({
        listingId: item.listingId,
        variantId: item.variantId,
        titleSnapshot: item.titleSnapshot,
        condition: item.condition,
        quantity: item.quantity,
        unitPriceClp: item.unitPriceClp,
        lineTotalClp: item.unitPriceClp * item.quantity,
      })),
      shipment: row.shipment ? toShipmentView(row.shipment) : null,
      checkout: {
        id: row.checkout.id,
        status: row.checkout.status,
        totalClp: row.checkout.totalClp,
        expiresAt: row.checkout.expiresAt.toISOString(),
        createdAt: row.checkout.createdAt.toISOString(),
      },
      payment: payment ? toAdminPayment(payment) : null,
      refunds,
      timeline,
      marketplaceFee: {
        policyVersion: row.marketplaceFeePolicyVersion,
        planCode: row.sellerPlanCode,
        promotionCode: row.marketplacePromotionCode,
        feeBps: row.marketplaceFeeBps,
        feeCapClp: row.marketplaceFeeCapClp,
        platformFeeClp: row.commissionClp,
        sellerPayableClp: row.totalClp - row.commissionClp,
        processorFeeClp: null,
      },
    };
  }

  async getPayment(id: string): Promise<AdminPaymentDetailView> {
    const row = await this.prisma.payment.findUnique({
      where: { id },
      select: {
        ...PAYMENT_SAFE_SELECT,
        order: { select: { id: true, orderNumber: true, status: true } },
        refunds: {
          include: { payment: { select: REFUND_PAYMENT_SELECT } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Pago no encontrado");
    }
    return {
      ...toAdminPayment(row),
      order: row.order,
      refunds: row.refunds.map(toAdminRefund),
    };
  }

  async getRefund(id: string): Promise<AdminRefundDetailView> {
    const row = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        payment: {
          select: {
            id: true,
            status: true,
            amountClp: true,
            providerPaymentId: true,
            orderId: true,
            order: { select: { id: true, orderNumber: true, status: true } },
          },
        },
      },
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Reembolso no encontrado");
    }
    const list: AdminRefundListItem = toAdminRefund({
      ...row,
      payment: { orderId: row.payment.orderId, order: { orderNumber: row.payment.order.orderNumber } },
    });
    return {
      ...list,
      lastError: await this.refundLastError(id),
      payment: {
        id: row.payment.id,
        status: row.payment.status,
        amountClp: row.payment.amountClp,
        providerPaymentId: row.payment.providerPaymentId,
      },
      order: row.payment.order,
    };
  }

  async retryRefund(actor: RequestUser, id: string): Promise<AdminRefundRetryView> {
    const current = await this.prisma.refund.findUnique({ where: { id } });
    if (!current) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Reembolso no encontrado");
    }
    const beforeStatus = current.status;
    if (beforeStatus === "COMPLETED") {
      await this.audit.log({
        actorId: actor.id,
        action: "admin.refund.retry",
        entityType: "Refund",
        entityId: id,
        metadata: {
          reason: "already_completed",
          beforeStatus,
          afterStatus: beforeStatus,
          providerCalled: false,
        },
      });
      return { refund: await this.getRefund(id), outcome: "completed", providerCalled: false };
    }

    const outcome = await this.refunds.execute(id);
    const refund = await this.getRefund(id);
    await this.audit.log({
      actorId: actor.id,
      action: "admin.refund.retry",
      entityType: "Refund",
      entityId: id,
      metadata: {
        beforeStatus,
        afterStatus: refund.status,
        outcome,
        providerCalled: true,
        orderId: refund.orderId,
        paymentId: refund.paymentId,
      },
    });
    return { refund, outcome, providerCalled: true };
  }

  async cancelOrder(actor: RequestUser, id: string, input: AdminCancelOrderInput): Promise<AdminOrderDetailView> {
    const existing = await this.prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!existing) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
    }
    const beforeStatus = existing.status;
    try {
      await this.orders.cancel(actor, id, { reason: input.reason });
    } catch (error) {
      const after = await this.prisma.order.findUnique({ where: { id }, select: { status: true } });
      await this.audit.log({
        actorId: actor.id,
        action: "admin.order.cancel",
        entityType: "Order",
        entityId: id,
        metadata: {
          reason: input.reason,
          beforeStatus,
          afterStatus: after?.status ?? beforeStatus,
          ok: false,
        },
      });
      throw error;
    }
    const detail = await this.getOrder(id);
    await this.audit.log({
      actorId: actor.id,
      action: "admin.order.cancel",
      entityType: "Order",
      entityId: id,
      metadata: {
        reason: input.reason,
        beforeStatus,
        afterStatus: detail.status,
        ok: true,
      },
    });
    return detail;
  }

  private async refundLastError(refundId: string): Promise<string | null> {
    const row = await this.prisma.auditLog.findFirst({
      where: { entityType: "Refund", entityId: refundId, action: "refund.failed" },
      orderBy: { createdAt: "desc" },
    });
    const meta = sanitizeMetadata(row?.metadata ?? null);
    const code = meta?.code;
    return typeof code === "string" ? code : null;
  }

  private async timeline(ids: {
    orderId: string;
    checkoutId: string;
    paymentId?: string;
    refundIds: string[];
  }): Promise<AdminAuditEventView[]> {
    const entityIds = [ids.orderId, ids.checkoutId, ids.paymentId, ...ids.refundIds].filter(
      (value): value is string => Boolean(value),
    );
    const rows = await this.prisma.auditLog.findMany({
      where: { entityId: { in: entityIds } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actorId: row.actorId,
      createdAt: row.createdAt.toISOString(),
      metadata: sanitizeMetadata(row.metadata),
    }));
  }
}

function sanitizeMetadata(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    out[key] = entry;
  }
  return out;
}

