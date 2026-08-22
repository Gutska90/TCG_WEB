import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ERROR_CODES } from "@tcg/config";
import type {
  AdminDashboardView,
  AdminListingListItem,
  AdminOrderListItem,
  AdminPaymentListItem,
  AdminRefundListItem,
  AdminSystemView,
  AdminUserListItem,
  JobRunView,
  Paginated,
} from "@tcg/types";
import type {
  AdminListingsQuery,
  AdminOrdersQuery,
  AdminPaymentsQuery,
  AdminRefundsQuery,
  AdminUsersQuery,
} from "@tcg/validation";
import { PrismaService } from "../prisma/prisma.service";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { AppError } from "../common/errors/app-error";
import {
  toAdminListing,
  toAdminOrder,
  toAdminPayment,
  toAdminRefund,
  toAdminUser,
} from "./admin.mappers";
import { addDays, CHILE_TZ, startOfZonedDay } from "./admin.time";

const GMV_STATUSES = [
  "PAID",
  "PREPARING",
  "SHIPPED",
  "READY_FOR_MEETUP",
  "DELIVERED",
  "CONFIRMED",
  "COMPLETED",
  "DISPUTED",
] as const;

const PARTY_SELECT = { id: true, displayName: true, slug: true, email: true } as const;

const USER_LIST_SELECT = {
  id: true,
  email: true,
  displayName: true,
  slug: true,
  emailVerifiedAt: true,
  isBanned: true,
  createdAt: true,
  roles: { select: { role: true } },
} as const;

type CountRow = { count: bigint };

@Injectable()
export class AdminOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
  ) {}

  async dashboard(now = new Date()): Promise<AdminDashboardView> {
    const todayStart = startOfZonedDay(now, CHILE_TZ);
    const tomorrowStart = addDays(todayStart, 1);
    const last30dStart = new Date(now.getTime() - 30 * 86_400_000);

    const [
      usersTotal,
      sellersTotal,
      listingsActive,
      ordersCreatedToday,
      ordersPendingShipment,
      ordersDisputed,
      refundsPending,
      refundsFailed,
      gmvToday,
      gmvLast30d,
      paymentGroups,
      refundPendingAgg,
      payoutPending,
      refundFailedAlert,
      paymentMismatch,
      expiredCheckoutWithPayment,
      anomalousReservations,
      webhooksUnprocessed,
      commissionOpen,
      pendingSellerHeld,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.userRole.count({
        where: { role: "SELLER", user: { deletedAt: null } },
      }),
      this.prisma.listing.count({ where: { status: "ACTIVE" } }),
      this.prisma.order.count({
        where: { createdAt: { gte: todayStart, lt: tomorrowStart } },
      }),
      this.prisma.order.count({ where: { status: { in: ["PAID", "PREPARING"] } } }),
      this.prisma.order.count({ where: { status: "DISPUTED" } }),
      this.prisma.refund.count({ where: { status: "PENDING" } }),
      this.prisma.refund.count({ where: { status: "FAILED" } }),
      this.prisma.order.aggregate({
        _sum: { subtotalClp: true },
        where: {
          status: { in: [...GMV_STATUSES] },
          paidAt: { gte: todayStart, lt: tomorrowStart },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { subtotalClp: true },
        where: {
          status: { in: [...GMV_STATUSES] },
          paidAt: { gte: last30dStart },
        },
      }),
      this.prisma.payment.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { amountClp: true },
      }),
      this.prisma.refund.aggregate({
        _count: { _all: true },
        _sum: { amountClp: true },
        where: { status: { in: ["PENDING", "FAILED"] } },
      }),
      this.prisma.payout.aggregate({
        _count: { _all: true },
        _sum: { amountClp: true },
        where: { status: { in: ["PENDING", "APPROVED", "PROCESSING"] } },
      }),
      this.prisma.refund.count({ where: { status: "FAILED" } }),
      this.countPaymentMismatches(),
      this.prisma.checkout.count({
        where: {
          status: { in: ["EXPIRED", "CANCELLED"] },
          orders: {
            some: { payment: { status: { in: ["HELD", "APPROVED", "REFUNDED"] } } },
          },
        },
      }),
      this.countAnomalousReservations(),
      this.prisma.webhookEvent.count({
        where: { processedAt: null, createdAt: { lt: new Date(now.getTime() - 60_000) } },
      }),
      this.prisma.order.aggregate({
        _sum: { commissionClp: true },
        where: { payment: { status: { in: ["HELD", "RELEASED"] } } },
      }),
      this.prisma.order.aggregate({
        _sum: { totalClp: true, commissionClp: true },
        where: { payment: { status: "HELD" } },
      }),
    ]);

    const held = paymentGroups.find((row) => row.status === "HELD");
    const released = paymentGroups.find((row) => row.status === "RELEASED");
    const amountHeldClp = held?._sum.amountClp ?? 0;
    const amountReleasedClp = released?._sum.amountClp ?? 0;
    const pendingSellerHeldClp =
      (pendingSellerHeld._sum.totalClp ?? 0) - (pendingSellerHeld._sum.commissionClp ?? 0);

    const agedDisputeCutoff = new Date(now.getTime() - 7 * 86_400_000);
    const [
      payoutsFailed,
      reconCritical,
      jobsFailed,
      agedDisputes,
      processingWithDispute,
      webhookInvalidSpike,
    ] = await Promise.all([
      this.prisma.payout.count({ where: { status: "FAILED" } }),
      this.prisma.reconciliationIssue.count({
        where: { status: { in: ["OPEN", "ACKNOWLEDGED"] }, severity: "CRITICAL" },
      }),
      this.prisma.jobRun.count({
        where: { status: "FAILED", startedAt: { gte: new Date(now.getTime() - 86_400_000) } },
      }),
      this.prisma.dispute.count({
        where: {
          status: { in: ["OPEN", "WAITING_BUYER", "WAITING_SELLER", "UNDER_REVIEW"] },
          openedAt: { lte: agedDisputeCutoff },
        },
      }),
      this.prisma.payout.count({
        where: {
          status: "PROCESSING",
          items: {
            some: {
              order: {
                disputes: { some: { status: { in: ["OPEN", "WAITING_BUYER", "WAITING_SELLER", "UNDER_REVIEW"] } } },
              },
            },
          },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          action: "webhook.invalid",
          createdAt: { gte: new Date(now.getTime() - 60 * 60_000) },
        },
      }),
    ]);

    const alerts = [
      alert("refunds_failed", "Refunds FAILED", refundFailedAlert, "/admin/refunds?status=FAILED"),
      alert("payouts_failed", "Payouts FAILED", payoutsFailed, "/admin/payouts"),
      alert("recon_critical", "Conciliación CRITICAL abierta", reconCritical, "/admin/reconciliation"),
      alert("jobs_failed", "Jobs FAILED (24h)", jobsFailed, "/admin/jobs"),
      alert("aged_disputes", "Disputas abiertas > 7 días", agedDisputes, "/admin/disputes"),
      alert(
        "payout_processing_disputed",
        "Payout PROCESSING con disputa activa",
        processingWithDispute,
        "/admin/payouts",
      ),
      alert("webhook_invalid_spike", "Webhooks inválidos (1h)", webhookInvalidSpike, "/admin/payments"),
      alert(
        "payment_status_mismatch",
        "Pagos con estado inconsistente vs orden",
        paymentMismatch,
        "/admin/payments",
      ),
      alert(
        "expired_checkout_with_payment",
        "Checkouts expirados/cancelados con cobro registrado",
        expiredCheckoutWithPayment,
        "/admin/orders",
      ),
      alert(
        "anomalous_reservations",
        "Reservas en listings SOLD/CANCELLED",
        anomalousReservations,
        "/admin/listings",
      ),
      alert(
        "webhooks_unprocessed",
        "Webhooks sin processedAt",
        webhooksUnprocessed,
        "/admin/payments",
      ),
    ].filter((item) => item.count > 0);

    return {
      generatedAt: now.toISOString(),
      timezone: CHILE_TZ,
      operation: {
        usersTotal,
        sellersTotal,
        listingsActive,
        ordersCreatedToday,
        ordersPendingShipment,
        ordersDisputed,
        refundsPending,
        refundsFailed,
      },
      money: {
        currency: "CLP",
        gmvTodayClp: gmvToday._sum.subtotalClp ?? 0,
        gmvLast30dClp: gmvLast30d._sum.subtotalClp ?? 0,
        paymentsHeld: held?._count._all ?? 0,
        paymentsReleased: released?._count._all ?? 0,
        amountHeldClp,
        amountReleasedClp,
        collectedMpClp: amountHeldClp + amountReleasedClp,
        pendingSellerHeldClp,
        platformCommissionOpenClp: commissionOpen._sum.commissionClp ?? 0,
        refundsPending: refundPendingAgg._count._all,
        refundsPendingClp: refundPendingAgg._sum.amountClp ?? 0,
        payoutsPending: payoutPending._count._all,
        payoutsPendingClp: payoutPending._sum.amountClp ?? 0,
      },
      alerts,
    };
  }

  async system(): Promise<AdminSystemView> {
    const flags = this.flags.current();
    const [databaseReady, lastRecon, lastJobs, dash] = await Promise.all([
      this.prisma.isReady(),
      this.prisma.reconciliationRun.findFirst({ orderBy: { startedAt: "desc" } }),
      this.prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 }),
      this.dashboard(),
    ]);
    return {
      api: "ok",
      database: databaseReady ? "ready" : "not_ready",
      flags: {
        enableRealPayments: flags.enableRealPayments,
        enablePayouts: flags.enablePayouts && !flags.disablePayouts,
        disableCheckout: flags.disableCheckout,
        disableNewListings: flags.disableNewListings,
        disablePayouts: flags.disablePayouts,
        disableRefundsAutomation: flags.disableRefundsAutomation,
        jobsEnabled: flags.jobsEnabled,
        refundRetryJobEnabled: flags.refundRetryJobEnabled,
      },
      lastReconciliation: lastRecon
        ? { id: lastRecon.id, status: lastRecon.status, finishedAt: lastRecon.finishedAt?.toISOString() ?? null }
        : null,
      lastJobs: lastJobs.map((row) => ({
        id: row.id,
        jobName: row.jobName,
        status: row.status,
        startedAt: row.startedAt.toISOString(),
        finishedAt: row.finishedAt?.toISOString() ?? null,
        durationMs: row.durationMs,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
        correlationId: row.correlationId,
      })),
      alerts: dash.alerts,
    };
  }

  async listJobs(page: number, pageSize: number): Promise<Paginated<JobRunView>> {
    const [rows, total] = await Promise.all([
      this.prisma.jobRun.findMany({
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.jobRun.count(),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        jobName: row.jobName,
        status: row.status,
        startedAt: row.startedAt.toISOString(),
        finishedAt: row.finishedAt?.toISOString() ?? null,
        durationMs: row.durationMs,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
        correlationId: row.correlationId,
      })),
      page,
      pageSize,
      total,
    };
  }

  async getJob(id: string): Promise<JobRunView> {
    const row = await this.prisma.jobRun.findUnique({ where: { id } });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Job no encontrado");
    }
    return {
      id: row.id,
      jobName: row.jobName,
      status: row.status,
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
      durationMs: row.durationMs,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
      correlationId: row.correlationId,
    };
  }

  async listOrders(query: AdminOrdersQuery): Promise<Paginated<AdminOrderListItem>> {
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? this.orderSearch(query.q) : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          buyer: { select: PARTY_SELECT },
          seller: { select: PARTY_SELECT },
          payment: {
            select: { id: true, status: true, amountClp: true, providerPaymentId: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return page(rows.map(toAdminOrder), query.page, query.pageSize, total);
  }

  async listPayments(query: AdminPaymentsQuery): Promise<Paginated<AdminPaymentListItem>> {
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? this.paymentSearch(query.q) : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        select: {
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
          order: { select: { orderNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return page(rows.map(toAdminPayment), query.page, query.pageSize, total);
  }

  async listRefunds(query: AdminRefundsQuery): Promise<Paginated<AdminRefundListItem>> {
    const where: Prisma.RefundWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { reason: { contains: query.q, mode: "insensitive" } },
              { providerRefundId: { contains: query.q, mode: "insensitive" } },
              { payment: { order: { orderNumber: { contains: query.q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        include: { payment: { select: { orderId: true, order: { select: { orderNumber: true } } } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.refund.count({ where }),
    ]);
    return page(rows.map(toAdminRefund), query.page, query.pageSize, total);
  }

  async listUsers(query: AdminUsersQuery): Promise<Paginated<AdminUserListItem>> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.banned === "true" ? { isBanned: true } : {}),
      ...(query.banned === "false" ? { isBanned: false } : {}),
      ...(query.role ? { roles: { some: { role: query.role } } } : {}),
      ...(query.q
        ? {
            OR: [
              { email: { contains: query.q, mode: "insensitive" } },
              { displayName: { contains: query.q, mode: "insensitive" } },
              { slug: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_LIST_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return page(rows.map(toAdminUser), query.page, query.pageSize, total);
  }

  async listListings(query: AdminListingsQuery): Promise<Paginated<AdminListingListItem>> {
    const where: Prisma.ListingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { seller: { email: { contains: query.q, mode: "insensitive" } } },
              { seller: { displayName: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        select: {
          id: true,
          title: true,
          status: true,
          priceClp: true,
          quantity: true,
          quantityReserved: true,
          createdAt: true,
          seller: { select: PARTY_SELECT },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.listing.count({ where }),
    ]);
    return page(rows.map(toAdminListing), query.page, query.pageSize, total);
  }

  private orderSearch(q: string): Prisma.OrderWhereInput {
    const or: Prisma.OrderWhereInput[] = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { buyer: { email: { contains: q, mode: "insensitive" } } },
      { seller: { email: { contains: q, mode: "insensitive" } } },
      { buyer: { displayName: { contains: q, mode: "insensitive" } } },
      { seller: { displayName: { contains: q, mode: "insensitive" } } },
    ];
    if (isUuid(q)) {
      or.push({ id: q }, { checkoutId: q }, { payment: { id: q } });
    }
    return { OR: or };
  }

  private paymentSearch(q: string): Prisma.PaymentWhereInput {
    const or: Prisma.PaymentWhereInput[] = [
      { providerPaymentId: { contains: q, mode: "insensitive" } },
      { order: { orderNumber: { contains: q, mode: "insensitive" } } },
    ];
    if (isUuid(q)) {
      or.push({ id: q }, { orderId: q });
    }
    return { OR: or };
  }

  private async countPaymentMismatches(): Promise<number> {
    const [heldBad, releasedBad, refundedBad, paidWithoutPayment, approvedStuck] = await Promise.all([
      this.prisma.payment.count({
        where: {
          status: "HELD",
          order: { status: { in: ["PENDING_PAYMENT", "CANCELLED", "REFUNDED"] } },
        },
      }),
      this.prisma.payment.count({
        where: {
          status: "RELEASED",
          order: { status: { notIn: ["CONFIRMED", "COMPLETED"] } },
        },
      }),
      this.prisma.payment.count({
        where: { status: "REFUNDED", order: { status: { not: "REFUNDED" } } },
      }),
      this.prisma.order.count({
        where: {
          status: { in: ["PAID", "PREPARING", "SHIPPED", "READY_FOR_MEETUP", "DELIVERED"] },
          payment: { is: null },
        },
      }),
      this.prisma.payment.count({ where: { status: "APPROVED" } }),
    ]);
    return heldBad + releasedBad + refundedBad + paidWithoutPayment + approvedStuck;
  }

  private async countAnomalousReservations(): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM listings
      WHERE quantity_reserved > 0 AND status IN ('SOLD', 'CANCELLED')
    `);
    return Number(rows[0]?.count ?? 0);
  }
}

function alert(code: string, label: string, count: number, href: string) {
  return { code, label, count, href };
}

function page<T>(items: T[], pageNumber: number, pageSize: number, total: number): Paginated<T> {
  return { items, page: pageNumber, pageSize, total };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
