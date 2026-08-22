import { randomUUID } from "node:crypto";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ERROR_CODES, type PayoutStatus } from "@tcg/config";
import type { AdminPayoutDetailView, AdminPayoutListItem, Paginated } from "@tcg/types";
import type {
  AdminMarkPayoutPaidInput,
  AdminPayoutFailInput,
  AdminPayoutReasonInput,
  AdminPayoutsQuery,
  CreateAdminPayoutInput,
} from "@tcg/validation";
import { AuditService } from "../audit/audit.service";
import type { RequestUser } from "../auth/request-user";
import { AppError } from "../common/errors/app-error";
import { toLedgerEntryView } from "../ledger/ledger-query.service";
import { LedgerService } from "../ledger/ledger.service";
import { sellerNetClp } from "../ledger/ledger.money";
import { SellerBalanceService } from "../ledger/seller-balance.service";
import { PrismaService } from "../prisma/prisma.service";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { MetricsService } from "../observability/metrics.service";
import { PAYOUT_PROVIDER, type PayoutProvider } from "./payout-provider";
import { assertPayoutTransition } from "./payout-state";

const CANCELABLE: PayoutStatus[] = ["PENDING", "APPROVED"];

const PARTY_SELECT = { id: true, displayName: true, slug: true, email: true } as const;

const SECRET_KEY = /payload|password|token|secret|hash/i;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ledger: LedgerService,
    private readonly balances: SellerBalanceService,
    @Inject(PAYOUT_PROVIDER) private readonly provider: PayoutProvider,
    private readonly flags: FeatureFlagsService,
    private readonly metrics: MetricsService,
  ) {}

  async list(query: AdminPayoutsQuery): Promise<Paginated<AdminPayoutListItem>> {
    const where: Prisma.PayoutWhereInput = {
      sellerId: query.sellerId,
      status: query.status,
    };
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: { seller: { select: PARTY_SELECT }, _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
      }),
      this.prisma.payout.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        seller: row.seller,
        amountClp: row.amountClp,
        status: row.status,
        method: row.method,
        providerRef: row.providerRef,
        orderCount: row._count.items,
        createdAt: row.createdAt.toISOString(),
        paidAt: row.paidAt?.toISOString() ?? null,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async get(id: string): Promise<AdminPayoutDetailView> {
    const row = await this.prisma.payout.findUnique({
      where: { id },
      include: {
        seller: { select: PARTY_SELECT },
        items: { include: { order: { select: { orderNumber: true } } }, orderBy: { createdAt: "asc" } },
        ledgerEntries: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Payout no encontrado");
    }
    const timeline = await this.prisma.auditLog.findMany({
      where: { entityType: "Payout", entityId: id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return {
      id: row.id,
      seller: row.seller,
      amountClp: row.amountClp,
      status: row.status,
      method: row.method,
      providerRef: row.providerRef,
      lastError: row.lastError,
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      approvedById: row.approvedById,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      paidAt: row.paidAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      items: row.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        orderNumber: item.order.orderNumber,
        grossClp: item.grossClp,
        commissionClp: item.commissionClp,
        netClp: item.netClp,
      })),
      ledger: row.ledgerEntries.map(toLedgerEntryView),
      timeline: timeline.map((event) => ({
        id: event.id,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        actorId: event.actorId,
        createdAt: event.createdAt.toISOString(),
        metadata: this.sanitize(event.metadata),
      })),
    };
  }

  async create(actor: RequestUser, input: CreateAdminPayoutInput) {
    this.flags.assertPayoutsAllowed();
    try {
      const payoutId = await this.prisma.$transaction(async (tx) => {
        await this.lockSellerMoney(tx, input.sellerId);
        const balance = await this.balances.forSeller(input.sellerId, tx);
        if (balance.availableClp < 0) {
          throw new AppError(
            HttpStatus.CONFLICT,
            ERROR_CODES.INSUFFICIENT_SELLER_BALANCE,
            "El vendedor tiene saldo negativo; no se pueden crear payouts hasta recuperarlo",
          );
        }
        const suspended = await tx.sellerSuspension.findFirst({
          where: { sellerId: input.sellerId, liftedAt: null },
        });
        if (suspended) {
          throw new AppError(
            HttpStatus.FORBIDDEN,
            ERROR_CODES.SELLER_SUSPENDED,
            "El vendedor está suspendido; no se crean payouts nuevos",
          );
        }
        const obligations = await this.availableObligations(tx, input.sellerId, input.orderIds);
        if (obligations.length === 0) {
          throw new AppError(
            HttpStatus.CONFLICT,
            ERROR_CODES.PAYOUT_UNAVAILABLE,
            "No hay obligaciones disponibles para este vendedor",
          );
        }
        const amountClp = obligations.reduce((sum, row) => sum + row.netClp, 0);
        if (amountClp <= 0) {
          throw new AppError(
            HttpStatus.CONFLICT,
            ERROR_CODES.PAYOUT_UNAVAILABLE,
            "El monto del payout debe ser mayor a 0",
          );
        }
        if (amountClp > balance.availableClp) {
          throw new AppError(
            HttpStatus.CONFLICT,
            ERROR_CODES.INSUFFICIENT_SELLER_BALANCE,
            "El payout no puede superar el saldo disponible",
          );
        }

        const now = new Date();
        const completedAt = obligations
          .map((row) => row.completedAt)
          .filter((value): value is Date => value != null);
        const periodStart = completedAt.length > 0 ? new Date(Math.min(...completedAt.map((d) => d.getTime()))) : now;
        const periodEnd = completedAt.length > 0 ? new Date(Math.max(...completedAt.map((d) => d.getTime()))) : now;
        const id = randomUUID();
        await tx.payout.create({
          data: {
            id,
            sellerId: input.sellerId,
            amountClp,
            status: "PENDING",
            method: "MANUAL",
            periodStart,
            periodEnd,
            items: {
              create: obligations.map((row) => ({
                id: randomUUID(),
                orderId: row.orderId,
                sellerId: input.sellerId,
                grossClp: row.grossClp,
                commissionClp: row.commissionClp,
                netClp: row.netClp,
                locksOrder: true,
              })),
            },
          },
        });
        await this.ledger.recordPayoutReserved(tx, id, input.sellerId, amountClp);
        await this.audit.log(
          {
            actorId: actor.id,
            action: "payout.created",
            entityType: "Payout",
            entityId: id,
            metadata: {
              sellerId: input.sellerId,
              amountClp,
              orderIds: obligations.map((row) => row.orderId),
              reason: null,
            },
          },
          tx,
        );
        return id;
      });
      return this.get(payoutId);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.PAYOUT_UNAVAILABLE,
          "Una orden ya está reservada en otro payout",
        );
      }
      throw error;
    }
  }

  async approve(actor: RequestUser, id: string, input: AdminPayoutReasonInput) {
    this.flags.assertPayoutsAllowed();
    return this.transition(actor, id, "APPROVED", {
      reason: input.reason,
      action: "payout.approved",
      data: { approvedBy: { connect: { id: actor.id } }, approvedAt: new Date() },
    });
  }

  async markProcessing(actor: RequestUser, id: string, input: AdminPayoutReasonInput) {
    this.flags.assertPayoutsAllowed();
    const current = await this.require(id);
    this.assertTransition(current.status, "PROCESSING");
    await this.provider.prepare({
      payoutId: current.id,
      sellerId: current.sellerId,
      amountClp: current.amountClp,
    });
    return this.transition(actor, id, "PROCESSING", {
      reason: input.reason,
      action: "payout.processing",
      data: { lastError: null },
    });
  }

  async markPaid(actor: RequestUser, id: string, input: AdminMarkPayoutPaidInput) {
    this.flags.assertPayoutsAllowed();
    const current = await this.require(id);
    this.assertTransition(current.status, "PAID");
    const marked = await this.provider.markPaid({ payoutId: id, providerRef: input.providerRef });
    return this.prisma.$transaction(async (tx) => {
      const locked = await this.lockPayout(tx, id);
      this.assertTransition(locked.status, "PAID");
      const now = new Date();
      await tx.payout.update({
        where: { id },
        data: {
          status: "PAID",
          providerRef: marked.providerRef,
          paidAt: now,
          lastError: null,
        },
      });
      await this.ledger.recordPayoutPaid(tx, id, locked.sellerId, locked.amountClp);
      await this.audit.log(
        {
          actorId: actor.id,
          action: "payout.paid",
          entityType: "Payout",
          entityId: id,
          metadata: {
            sellerId: locked.sellerId,
            amountClp: locked.amountClp,
            reason: input.reason ?? null,
            providerRef: marked.providerRef,
            beforeStatus: locked.status,
            afterStatus: "PAID",
          },
        },
        tx,
      );
      return id;
    }).then(() => this.get(id));
  }

  async fail(actor: RequestUser, id: string, input: AdminPayoutFailInput) {
    return this.transition(actor, id, "FAILED", {
      reason: input.reason,
      action: "payout.failed",
      data: { lastError: input.reason },
    }).then((row) => {
      this.metrics.inc("payout_failed_total");
      return row;
    });
  }

  async cancel(actor: RequestUser, id: string, input: AdminPayoutReasonInput) {
    return this.prisma.$transaction(async (tx) => {
      await this.cancelInTx(tx, id, {
        actorId: actor.id,
        reason: input.reason ?? "cancelado por admin",
      });
      return id;
    }).then(() => this.get(id));
  }

  async onActiveDispute(orderId: string, actorId: string): Promise<"cancelled" | "processing" | "paid" | "none"> {
    const item = await this.prisma.payoutItem.findFirst({
      where: { orderId, locksOrder: true },
      include: { payout: { select: { id: true, status: true } } },
    });
    if (!item) return "none";
    if (item.payout.status === "PENDING" || item.payout.status === "APPROVED") {
      await this.prisma.$transaction(async (tx) => {
        await this.cancelInTx(tx, item.payoutId, {
          actorId,
          reason: "dispute_opened",
        });
      });
      return "cancelled";
    }
    if (item.payout.status === "PROCESSING") {
      await this.audit.log({
        actorId,
        action: "payout.dispute_while_processing",
        entityType: "Payout",
        entityId: item.payoutId,
        metadata: { orderId },
      });
      return "processing";
    }
    if (item.payout.status === "PAID") {
      await this.audit.log({
        actorId,
        action: "payout.dispute_after_paid",
        entityType: "Payout",
        entityId: item.payoutId,
        metadata: { orderId },
      });
      return "paid";
    }
    return "none";
  }

  async releaseOpenForOrder(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
    const item = await tx.payoutItem.findFirst({
      where: {
        orderId,
        locksOrder: true,
        payout: { status: { in: CANCELABLE } },
      },
      select: { payoutId: true },
    });
    if (!item) return;
    await this.cancelInTx(tx, item.payoutId, {
      actorId: null,
      reason: "refund_before_payout",
    });
  }

  private async cancelInTx(
    tx: Prisma.TransactionClient,
    id: string,
    input: { actorId: string | null; reason: string },
  ): Promise<void> {
    const locked = await this.lockPayout(tx, id);
    this.assertTransition(locked.status, "CANCELLED");
    await tx.payout.update({
      where: { id },
      data: { status: "CANCELLED", lastError: input.reason },
    });
    await tx.payoutItem.updateMany({
      where: { payoutId: id, locksOrder: true },
      data: { locksOrder: false },
    });
    await this.ledger.recordPayoutReversed(tx, id, locked.sellerId, locked.amountClp);
    await this.audit.log(
      {
        actorId: input.actorId,
        action: "payout.cancelled",
        entityType: "Payout",
        entityId: id,
        metadata: {
          sellerId: locked.sellerId,
          amountClp: locked.amountClp,
          reason: input.reason,
          beforeStatus: locked.status,
          afterStatus: "CANCELLED",
        },
      },
      tx,
    );
  }

  private async transition(
    actor: RequestUser,
    id: string,
    after: PayoutStatus,
    input: { reason?: string; action: string; data: Prisma.PayoutUpdateInput },
  ) {
    await this.prisma.$transaction(async (tx) => {
      const locked = await this.lockPayout(tx, id);
    this.assertTransition(locked.status, after);
      await tx.payout.update({
        where: { id },
        data: { ...input.data, status: after },
      });
      await this.audit.log(
        {
          actorId: actor.id,
          action: input.action,
          entityType: "Payout",
          entityId: id,
          metadata: {
            sellerId: locked.sellerId,
            amountClp: locked.amountClp,
            reason: input.reason ?? null,
            beforeStatus: locked.status,
            afterStatus: after,
            providerRef: locked.providerRef,
          },
        },
        tx,
      );
    });
    return this.get(id);
  }

  private assertTransition(from: PayoutStatus, to: PayoutStatus): void {
    assertPayoutTransition(from, to);
  }

  private async require(id: string) {
    const row = await this.prisma.payout.findUnique({ where: { id } });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Payout no encontrado");
    }
    return row;
  }

  private async lockPayout(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`
      SELECT id FROM payouts WHERE id = ${id}::uuid FOR UPDATE
    `;
    const row = await tx.payout.findUnique({ where: { id } });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Payout no encontrado");
    }
    return row;
  }

  private async lockSellerMoney(tx: Prisma.TransactionClient, sellerId: string): Promise<void> {
    const seller = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM users WHERE id = ${sellerId}::uuid FOR UPDATE
    `;
    if (seller.length === 0) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Vendedor no encontrado");
    }
    await tx.$queryRaw`
      SELECT id
      FROM payouts
      WHERE seller_id = ${sellerId}::uuid
        AND status IN ('PENDING', 'APPROVED', 'PROCESSING')
      ORDER BY id
      FOR UPDATE
    `;
    await tx.$queryRaw`
      SELECT id
      FROM orders
      WHERE seller_id = ${sellerId}::uuid
      ORDER BY id
      FOR UPDATE
    `;
  }

  private async availableObligations(
    tx: Prisma.TransactionClient,
    sellerId: string,
    orderIds: string[] | undefined,
  ): Promise<
    Array<{
      orderId: string;
      grossClp: number;
      commissionClp: number;
      netClp: number;
      completedAt: Date | null;
    }>
  > {
    const payables = await tx.ledgerEntry.findMany({
      where: { sellerId, entryType: "SELLER_PAYABLE", orderId: { not: null } },
      select: { orderId: true },
    });
    const payableIds = payables.map((row) => row.orderId).filter((id): id is string => Boolean(id));
    const refunded = await tx.ledgerEntry.findMany({
      where: { sellerId, entryType: "REFUND", orderId: { in: payableIds } },
      select: { orderId: true },
    });
    const refundedIds = new Set(refunded.map((row) => row.orderId));
    const locked = await tx.payoutItem.findMany({
      where: { sellerId, locksOrder: true },
      select: { orderId: true },
    });
    const lockedIds = new Set(locked.map((row) => row.orderId));
    let candidateIds = payableIds.filter((id) => !refundedIds.has(id) && !lockedIds.has(id));
    const disputed = await tx.dispute.findMany({
      where: {
        orderId: { in: candidateIds },
        status: { in: ["OPEN", "WAITING_BUYER", "WAITING_SELLER", "UNDER_REVIEW"] },
      },
      select: { orderId: true },
    });
    const disputedIds = new Set(disputed.map((row) => row.orderId));
    candidateIds = candidateIds.filter((id) => !disputedIds.has(id));
    if (orderIds && orderIds.length > 0) {
      const requested = new Set(orderIds);
      const missing = orderIds.filter((id) => !candidateIds.includes(id));
      if (missing.length > 0) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.PAYOUT_UNAVAILABLE,
          "Hay órdenes que no están disponibles para payout",
        );
      }
      candidateIds = candidateIds.filter((id) => requested.has(id));
    }
    if (candidateIds.length === 0) {
      return [];
    }
    const orders = await tx.order.findMany({
      where: { id: { in: candidateIds }, sellerId },
      select: { id: true, totalClp: true, commissionClp: true, completedAt: true },
    });
    return orders.map((order) => ({
      orderId: order.id,
      grossClp: order.totalClp,
      commissionClp: order.commissionClp,
      netClp: sellerNetClp(order.totalClp, order.commissionClp),
      completedAt: order.completedAt,
    }));
  }

  private sanitize(metadata: Prisma.JsonValue): Record<string, unknown> {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return {};
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (SECRET_KEY.test(key)) continue;
      out[key] = value;
    }
    return out;
  }
}
