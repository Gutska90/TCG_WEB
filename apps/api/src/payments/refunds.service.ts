import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ERROR_CODES } from "@tcg/config";
import { AppError } from "../common/errors/app-error";
import { AuditService } from "../audit/audit.service";
import { LedgerService } from "../ledger/ledger.service";
import { lockCheckoutGraph, MONEY_TX } from "../orders/checkout.lock";
import { restoreSoldStock } from "../orders/stock";
import { PayoutsService } from "../payouts/payouts.service";
import { PrismaService } from "../prisma/prisma.service";
import { MetricsService } from "../observability/metrics.service";
import {
  PAYMENT_PROVIDER,
  PaymentProviderError,
  type PaymentProvider,
} from "./payment-provider";

const STOCK_CONSUMED_STATUSES = new Set(["PAID", "PREPARING"]);

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly ledger: LedgerService,
    private readonly payouts: PayoutsService,
    private readonly metrics: MetricsService,
  ) {}

  async executeOpenForCheckout(checkoutId: string): Promise<void> {
    const refunds = await this.prisma.refund.findMany({
      where: {
        status: { in: ["PENDING", "FAILED"] },
        payment: { order: { checkoutId } },
      },
      select: { id: true },
    });
    for (const row of refunds) {
      await this.execute(row.id);
    }
  }

  async execute(refundId: string): Promise<"completed" | "pending" | "failed"> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: { include: { order: { select: { id: true, checkoutId: true, status: true } } } } },
    });
    if (!refund) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Reembolso no encontrado");
    }
    if (refund.status === "COMPLETED") {
      return "completed";
    }

    const amountClp = refund.payment.amountClp;
    const providerPaymentId = refund.payment.providerPaymentId;
    if (!providerPaymentId) {
      await this.markFailed(refund.id, "payment_missing_provider_id");
      return "failed";
    }

    try {
      const result = await this.provider.refundPayment({
        providerPaymentId,
        amountClp,
        idempotencyKey: refund.id,
      });
      if (result.status !== "approved") {
        await this.prisma.refund.update({
          where: { id: refund.id },
          data: { providerRefundId: result.id, status: "PENDING" },
        });
        this.logger.warn(
          JSON.stringify({
            event: "refund.pending_provider",
            refundId: refund.id,
            providerRefundId: result.id,
            status: result.status,
          }),
        );
        return "pending";
      }
      await this.complete(refund.id, result.id);
      return "completed";
    } catch (error) {
      const code = error instanceof PaymentProviderError ? error.code : "http";
      this.logger.error(
        JSON.stringify({
          event: "refund.provider_error",
          refundId: refund.id,
          paymentId: refund.paymentId,
          code,
          message: error instanceof Error ? error.message : "unknown",
        }),
      );
      await this.markFailed(refund.id, code);
      return "failed";
    }
  }

  async syncProviderRefundedInTx(tx: Prisma.TransactionClient, checkoutId: string): Promise<void> {
    const checkout = await lockCheckoutGraph(tx, checkoutId);
    if (!checkout) return;
    for (const order of checkout.orders) {
      const payment = order.payment;
      if (!payment) continue;
      if (payment.status === "REFUNDED") continue;
      const open = await tx.refund.findFirst({
        where: { paymentId: payment.id, status: { in: ["PENDING", "FAILED"] } },
        orderBy: { createdAt: "asc" },
      });
      if (!open) continue;
      await this.finalizeInTx(tx, {
        refundId: open.id,
        paymentId: payment.id,
        orderId: order.id,
        checkoutId,
        providerRefundId: open.providerRefundId ?? `mp_wh_${payment.providerPaymentId ?? payment.id}`,
        restoreStock: STOCK_CONSUMED_STATUSES.has(order.status),
        items: order.items.map((item) => ({ listingId: item.listingId, quantity: item.quantity })),
      });
    }
  }

  private async complete(refundId: string, providerRefundId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const pointer = await tx.refund.findUnique({
        where: { id: refundId },
        select: { payment: { select: { order: { select: { checkoutId: true } } } } },
      });
      const checkoutId = pointer?.payment.order.checkoutId;
      if (!checkoutId) return;
      if (!(await lockCheckoutGraph(tx, checkoutId))) return;
      const refund = await tx.refund.findUnique({
        where: { id: refundId },
        include: { payment: { include: { order: { include: { items: true } } } } },
      });
      if (!refund || refund.status === "COMPLETED") return;
      const fresh = refund.payment.order;
      await this.finalizeInTx(tx, {
        refundId,
        paymentId: refund.paymentId,
        orderId: fresh.id,
        checkoutId,
        providerRefundId,
        restoreStock: STOCK_CONSUMED_STATUSES.has(fresh.status),
        items: fresh.items.map((item) => ({ listingId: item.listingId, quantity: item.quantity })),
      });
    }, MONEY_TX);
  }

  private async finalizeInTx(
    tx: Prisma.TransactionClient,
    input: {
      refundId: string;
      paymentId: string;
      orderId: string;
      checkoutId: string;
      providerRefundId: string;
      restoreStock: boolean;
      items: Array<{ listingId: string; quantity: number }>;
    },
  ): Promise<void> {
    const current = await tx.refund.findUnique({ where: { id: input.refundId } });
    if (!current || current.status === "COMPLETED") return;

    if (input.restoreStock) {
      for (const item of input.items) {
        await restoreSoldStock(tx, item.listingId, item.quantity);
      }
    }
    await tx.refund.update({
      where: { id: input.refundId },
      data: { status: "COMPLETED", providerRefundId: input.providerRefundId },
    });
    await tx.payment.update({
      where: { id: input.paymentId },
      data: { status: "REFUNDED", refundedAt: new Date() },
    });
    const order = await tx.order.findUnique({ where: { id: input.orderId } });
    if (order && (order.status === "PAID" || order.status === "PREPARING")) {
      await tx.order.update({ where: { id: input.orderId }, data: { status: "REFUNDED" } });
      await tx.shipment.updateMany({ where: { orderId: input.orderId }, data: { status: "CANCELLED" } });
    }
    if (order) {
      await this.ledger.recordRefund(tx, {
        sellerId: order.sellerId,
        orderId: order.id,
        paymentId: input.paymentId,
        refundId: input.refundId,
        totalClp: order.totalClp,
        commissionClp: order.commissionClp,
      });
      await this.payouts.releaseOpenForOrder(tx, order.id);
    }
    await this.audit.log(
      {
        action: "refund.completed",
        entityType: "Refund",
        entityId: input.refundId,
        metadata: {
          event: "REFUND_COMPLETED",
          paymentId: input.paymentId,
          orderId: input.orderId,
          providerRefundId: input.providerRefundId,
        },
      },
      tx,
    );
  }

  private async markFailed(refundId: string, code: string): Promise<void> {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund || refund.status === "COMPLETED") return;
    await this.prisma.refund.update({
      where: { id: refundId },
      data: { status: "FAILED" },
    });
    await this.audit.log({
      action: "refund.failed",
      entityType: "Refund",
      entityId: refundId,
      metadata: { event: "REFUND_FAILED", code },
    });
    this.metrics.inc("refund_failed_total");
  }

  async hasBlockingRefund(orderId: string): Promise<boolean> {
    const row = await this.prisma.refund.findFirst({
      where: {
        payment: { orderId },
        status: { in: ["PENDING", "FAILED"] },
      },
      select: { id: true },
    });
    return Boolean(row);
  }
}
