import { randomUUID } from "node:crypto";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma, type ReconciliationIssueStatus } from "@prisma/client";
import { ADMIN_OPS_ROLES, ERROR_CODES, PLATFORM } from "@tcg/config";
import type {
  Paginated,
  ReconciliationDashboardView,
  ReconciliationIssueView,
  ReconciliationRunDetailView,
  ReconciliationRunView,
} from "@tcg/types";
import type {
  AdminReconIssuesQuery,
  AdminReconResolveInput,
  AdminReconRunInput,
  AdminReconRunsQuery,
} from "@tcg/validation";
import { AuditService } from "../audit/audit.service";
import type { RequestUser } from "../auth/request-user";
import { AppError } from "../common/errors/app-error";
import { MetricsService } from "../observability/metrics.service";
import {
  PAYMENT_PROVIDER,
  PaymentProviderError,
  type PaymentProvider,
  type ProviderPayment,
  type ProviderRefund,
} from "../payments/payment-provider";
import { PrismaService } from "../prisma/prisma.service";
import {
  compareLedger,
  comparePayments,
  compareRefunds,
  issueFingerprint,
  type DraftIssue,
  type LocalPaymentRow,
  type LocalRefundRow,
} from "./recon-rules";

export const RECON_PROVIDER = "MERCADOPAGO";

const SECRET_KEY = /payload|password|token|secret|hash|raw/i;

type RunMeta = {
  windowStart: string;
  windowEnd: string;
  providerConfigured: boolean;
  providerSkipped: boolean;
  reusedOpenIssues: number;
  createdIssues: number;
  error?: string;
};

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly metrics: MetricsService,
  ) {}

  async dashboard(): Promise<ReconciliationDashboardView> {
    const [last, openIssues, openCritical] = await Promise.all([
      this.prisma.reconciliationRun.findFirst({ orderBy: { startedAt: "desc" } }),
      this.prisma.reconciliationIssue.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
      this.prisma.reconciliationIssue.count({
        where: { status: { in: ["OPEN", "ACKNOWLEDGED"] }, severity: "CRITICAL" },
      }),
    ]);
    return {
      lastRun: last ? toRunView(last) : null,
      openIssues,
      openCritical,
    };
  }

  async listRuns(query: AdminReconRunsQuery): Promise<Paginated<ReconciliationRunView>> {
    const where: Prisma.ReconciliationRunWhereInput = { status: query.status };
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.reconciliationRun.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip,
        take: query.pageSize,
      }),
      this.prisma.reconciliationRun.count({ where }),
    ]);
    return {
      items: rows.map(toRunView),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getRun(id: string): Promise<ReconciliationRunDetailView> {
    const row = await this.prisma.reconciliationRun.findUnique({
      where: { id },
      include: { issues: { orderBy: { createdAt: "desc" } } },
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Run de conciliación no encontrado");
    }
    return {
      ...toRunView(row),
      issues: row.issues.map(toIssueView),
    };
  }

  async listIssues(query: AdminReconIssuesQuery): Promise<Paginated<ReconciliationIssueView>> {
    const where: Prisma.ReconciliationIssueWhereInput = {
      severity: query.severity,
      issueType: query.issueType,
      status: query.status,
      runId: query.runId,
      createdAt: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    };
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.reconciliationIssue.findMany({
        where,
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.reconciliationIssue.count({ where }),
    ]);
    return {
      items: rows.map(toIssueView),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getIssue(id: string): Promise<ReconciliationIssueView> {
    const row = await this.prisma.reconciliationIssue.findUnique({ where: { id } });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Issue de conciliación no encontrado");
    }
    return toIssueView(row);
  }

  async acknowledge(user: RequestUser, id: string): Promise<ReconciliationIssueView> {
    return this.transitionIssue(user, id, "ACKNOWLEDGED");
  }

  async ignore(user: RequestUser, id: string): Promise<ReconciliationIssueView> {
    return this.transitionIssue(user, id, "IGNORED", "Ignorado por operación");
  }

  async resolve(user: RequestUser, id: string, input: AdminReconResolveInput): Promise<ReconciliationIssueView> {
    return this.transitionIssue(user, id, "RESOLVED", input.note);
  }

  async run(user: RequestUser | null, input: AdminReconRunInput = {}): Promise<ReconciliationRunView> {
    if (user) assertAdminOps(user);
    const window = resolveWindow(input);
    await this.failStaleRuns();

    let runId: string;
    try {
      const created = await this.prisma.reconciliationRun.create({
        data: {
          id: randomUUID(),
          provider: RECON_PROVIDER,
          status: "RUNNING",
          createdById: user?.id ?? null,
          metadata: {
            windowStart: window.from.toISOString(),
            windowEnd: window.to.toISOString(),
            providerConfigured: this.provider.isConfigured(),
            providerSkipped: false,
            reusedOpenIssues: 0,
            createdIssues: 0,
          } satisfies RunMeta,
        },
      });
      runId = created.id;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.RECONCILIATION_IN_PROGRESS,
          "Ya hay una conciliación en curso para este proveedor",
        );
      }
      throw error;
    }

    await this.audit.log({
      actorId: user?.id ?? null,
      action: "recon.run.started",
      entityType: "ReconciliationRun",
      entityId: runId,
      metadata: { windowStart: window.from.toISOString(), windowEnd: window.to.toISOString() },
    });

    try {
      const snapshot = await this.collect(window);
      const drafts = [
        ...comparePayments({
          local: snapshot.payments,
          provider: snapshot.providerPayments,
          knownCheckoutIds: snapshot.knownCheckoutIds,
          providerConfigured: snapshot.providerConfigured,
        }),
        ...compareRefunds({ local: snapshot.refunds, provider: snapshot.providerRefunds }),
        ...compareLedger({
          payments: snapshot.payments,
          refunds: snapshot.refunds,
          payouts: snapshot.payouts,
          ledger: snapshot.ledger,
        }),
      ];

      const persist = await this.persistIssues(runId, drafts);
      if (persist.created > 0) this.metrics.inc("reconciliation_issue_total", persist.created);
      const criticalIssues = drafts.filter((row) => row.severity === "CRITICAL").length;
      const meta: RunMeta = {
        windowStart: window.from.toISOString(),
        windowEnd: window.to.toISOString(),
        providerConfigured: snapshot.providerConfigured,
        providerSkipped: snapshot.providerSkipped,
        reusedOpenIssues: persist.reused,
        createdIssues: persist.created,
      };
      const finished = await this.prisma.reconciliationRun.update({
        where: { id: runId },
        data: {
          status: "COMPLETED",
          finishedAt: new Date(),
          checkedPayments: snapshot.checkedPayments,
          checkedRefunds: snapshot.checkedRefunds,
          issuesFound: drafts.length,
          criticalIssues,
          metadata: meta as Prisma.InputJsonValue,
        },
      });
      await this.audit.log({
        actorId: user?.id ?? null,
        action: "recon.run.completed",
        entityType: "ReconciliationRun",
        entityId: runId,
        metadata: { issuesFound: drafts.length, criticalIssues },
      });
      return toRunView(finished);
    } catch (error) {
      const message = providerErrorMessage(error);
      await this.prisma.reconciliationRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          metadata: {
            windowStart: window.from.toISOString(),
            windowEnd: window.to.toISOString(),
            providerConfigured: this.provider.isConfigured(),
            providerSkipped: false,
            reusedOpenIssues: 0,
            createdIssues: 0,
            error: message,
          },
        },
      });
      await this.audit.log({
        actorId: user?.id ?? null,
        action: "recon.run.failed",
        entityType: "ReconciliationRun",
        entityId: runId,
        metadata: { error: message },
      });
      if (error instanceof AppError) throw error;
      return toRunView(await this.prisma.reconciliationRun.findUniqueOrThrow({ where: { id: runId } }));
    }
  }

  private async collect(window: { from: Date; to: Date }) {
    const payments = await this.prisma.payment.findMany({
      where: {
        OR: [
          { createdAt: { gte: window.from, lte: window.to } },
          { heldAt: { gte: window.from, lte: window.to } },
        ],
      },
      include: { order: { select: { id: true, status: true, checkoutId: true } } },
    });
    const refunds = await this.prisma.refund.findMany({
      where: {
        OR: [
          { createdAt: { gte: window.from, lte: window.to } },
          { payment: { id: { in: payments.map((row) => row.id) } } },
        ],
      },
      include: { payment: { select: { id: true, providerPaymentId: true } } },
    });
    const payouts = await this.prisma.payout.findMany({
      where: {
        OR: [
          { createdAt: { gte: window.from, lte: window.to } },
          { paidAt: { gte: window.from, lte: window.to } },
        ],
      },
      select: { id: true, status: true },
    });

    const localPayments: LocalPaymentRow[] = payments.map((row) => ({
      id: row.id,
      status: row.status,
      amountClp: row.amountClp,
      providerPaymentId: row.providerPaymentId,
      checkoutId: row.order.checkoutId,
      orderId: row.order.id,
      orderStatus: row.order.status,
    }));
    const localRefunds: LocalRefundRow[] = refunds.map((row) => ({
      id: row.id,
      paymentId: row.paymentId,
      status: row.status,
      amountClp: row.amountClp,
      providerRefundId: row.providerRefundId,
      providerPaymentId: row.payment.providerPaymentId,
    }));

    const paymentIds = localPayments.map((row) => row.id);
    const refundIds = localRefunds.map((row) => row.id);
    const payoutIds = payouts.map((row) => row.id);
    const orderIds = localPayments.map((row) => row.orderId);
    const [captured, payable, refundEntries, paid] = await Promise.all([
      paymentIds.length
        ? this.prisma.ledgerEntry.findMany({
            where: { entryType: "PAYMENT_CAPTURED", paymentId: { in: paymentIds } },
            select: { paymentId: true },
          })
        : [],
      orderIds.length
        ? this.prisma.ledgerEntry.findMany({
            where: { entryType: "SELLER_PAYABLE", orderId: { in: orderIds } },
            select: { orderId: true },
          })
        : [],
      refundIds.length
        ? this.prisma.ledgerEntry.findMany({
            where: { entryType: "REFUND", refundId: { in: refundIds } },
            select: { refundId: true },
          })
        : [],
      payoutIds.length
        ? this.prisma.ledgerEntry.findMany({
            where: { entryType: "PAYOUT_PAID", payoutId: { in: payoutIds } },
            select: { payoutId: true },
          })
        : [],
    ]);

    const knownCheckouts = await this.prisma.checkout.findMany({
      where: { id: { in: [...new Set(localPayments.map((row) => row.checkoutId))] } },
      select: { id: true },
    });
    const knownCheckoutIds = new Set(knownCheckouts.map((row) => row.id));

    const providerConfigured = this.provider.isConfigured();
    let providerPayments: ProviderPayment[] = [];
    const providerRefunds: ProviderRefund[] = [];
    let providerSkipped = false;

    if (!providerConfigured) {
      providerSkipped = true;
    } else {
      providerPayments = await this.provider.searchPayments(window);
      const idsToFetch = new Set(
        localPayments
          .map((row) => row.providerPaymentId)
          .filter((id): id is string => Boolean(id) && !providerPayments.some((row) => row.id === id)),
      );
      for (const id of idsToFetch) {
        try {
          providerPayments.push(await this.provider.getPayment(id));
        } catch (error) {
          if (error instanceof PaymentProviderError && error.code === "not_found") {
            continue;
          }
          throw error;
        }
      }
      for (const checkout of providerPayments) {
        if (checkout.externalReference) knownCheckoutIds.add(checkout.externalReference);
      }
      const extraCheckouts = await this.prisma.checkout.findMany({
        where: {
          id: {
            in: providerPayments
              .map((row) => row.externalReference)
              .filter((id): id is string => Boolean(id)),
          },
        },
        select: { id: true },
      });
      for (const row of extraCheckouts) knownCheckoutIds.add(row.id);

      const refundPaymentIds = new Set<string>();
      for (const row of localRefunds) {
        if (row.providerPaymentId) refundPaymentIds.add(row.providerPaymentId);
      }
      for (const row of localPayments) {
        if (row.providerPaymentId) refundPaymentIds.add(row.providerPaymentId);
      }
      for (const row of providerPayments) {
        refundPaymentIds.add(row.id);
      }
      const seenRefund = new Set<string>();
      for (const paymentId of refundPaymentIds) {
        try {
          const listed = await this.provider.listRefunds(paymentId);
          for (const refund of listed) {
            if (seenRefund.has(refund.id)) continue;
            seenRefund.add(refund.id);
            providerRefunds.push(refund);
          }
        } catch (error) {
          if (error instanceof PaymentProviderError && error.code === "not_found") {
            continue;
          }
          throw error;
        }
      }
    }

    return {
      payments: localPayments,
      refunds: localRefunds,
      payouts,
      knownCheckoutIds,
      providerPayments,
      providerRefunds,
      providerConfigured,
      providerSkipped,
      checkedPayments: localPayments.length + providerPayments.length,
      checkedRefunds: localRefunds.length + providerRefunds.length,
      ledger: {
        paymentCaptured: new Set(captured.map((row) => row.paymentId).filter((id): id is string => Boolean(id))),
        sellerPayable: new Set(payable.map((row) => row.orderId).filter((id): id is string => Boolean(id))),
        refund: new Set(refundEntries.map((row) => row.refundId).filter((id): id is string => Boolean(id))),
        payoutPaid: new Set(paid.map((row) => row.payoutId).filter((id): id is string => Boolean(id))),
      },
    };
  }

  private async persistIssues(runId: string, drafts: DraftIssue[]) {
    let created = 0;
    let reused = 0;
    for (const draft of drafts) {
      const fingerprint = issueFingerprint(draft);
      const existing = await this.prisma.reconciliationIssue.findFirst({
        where: { fingerprint, status: "OPEN" },
      });
      const details = sanitizeDetails({ ...draft.details, lastRunId: runId }) as Prisma.InputJsonValue;
      if (existing) {
        await this.prisma.reconciliationIssue.update({
          where: { id: existing.id },
          data: { runId, details, severity: draft.severity },
        });
        reused += 1;
        continue;
      }
      await this.prisma.reconciliationIssue.create({
        data: {
          runId,
          issueType: draft.issueType,
          severity: draft.severity,
          entityType: draft.entityType,
          entityId: draft.entityId,
          providerPaymentId: draft.providerPaymentId,
          providerRefundId: draft.providerRefundId,
          expectedStatus: draft.expectedStatus,
          actualStatus: draft.actualStatus,
          expectedAmountClp: draft.expectedAmountClp,
          actualAmountClp: draft.actualAmountClp,
          fingerprint,
          details,
          status: "OPEN",
        },
      });
      created += 1;
    }
    return { created, reused };
  }

  private async failStaleRuns(): Promise<void> {
    const cutoff = new Date(Date.now() - PLATFORM.reconStaleRunMinutes * 60_000);
    await this.prisma.reconciliationRun.updateMany({
      where: { provider: RECON_PROVIDER, status: "RUNNING", startedAt: { lt: cutoff } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
      },
    });
  }

  private async transitionIssue(
    user: RequestUser,
    id: string,
    status: Exclude<ReconciliationIssueStatus, "OPEN">,
    note?: string,
  ): Promise<ReconciliationIssueView> {
    assertAdminOps(user);
    const row = await this.prisma.reconciliationIssue.findUnique({ where: { id } });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Issue de conciliación no encontrado");
    }
    if (row.status === "RESOLVED" || row.status === "IGNORED") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, "El issue ya está cerrado");
    }
    const updated = await this.prisma.reconciliationIssue.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === "ACKNOWLEDGED" ? null : new Date(),
        resolvedById: status === "ACKNOWLEDGED" ? null : user.id,
        resolutionNote: note ?? row.resolutionNote,
      },
    });
    await this.audit.log({
      actorId: user.id,
      action: `recon.issue.${status.toLowerCase()}`,
      entityType: "ReconciliationIssue",
      entityId: id,
      metadata: { note: note ?? null },
    });
    return toIssueView(updated);
  }
}

function resolveWindow(input: AdminReconRunInput): { from: Date; to: Date } {
  const to = input.to ? new Date(input.to) : new Date();
  const from = input.from
    ? new Date(input.from)
    : new Date(to.getTime() - (input.hours ?? PLATFORM.reconDefaultWindowHours) * 3_600_000);
  if (!(from.getTime() < to.getTime())) {
    throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "La ventana from/to es inválida");
  }
  return { from, to };
}

function toRunView(row: {
  id: string;
  provider: string;
  startedAt: Date;
  finishedAt: Date | null;
  status: ReconciliationRunView["status"];
  checkedPayments: number;
  checkedRefunds: number;
  issuesFound: number;
  criticalIssues: number;
  createdById: string | null;
  metadata: Prisma.JsonValue;
}): ReconciliationRunView {
  const meta = asRecord(row.metadata);
  return {
    id: row.id,
    provider: row.provider,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    status: row.status,
    checkedPayments: row.checkedPayments,
    checkedRefunds: row.checkedRefunds,
    issuesFound: row.issuesFound,
    criticalIssues: row.criticalIssues,
    createdById: row.createdById,
    windowStart: stringField(meta.windowStart),
    windowEnd: stringField(meta.windowEnd),
    providerSkipped: meta.providerSkipped === true,
  };
}

function toIssueView(row: {
  id: string;
  runId: string;
  issueType: ReconciliationIssueView["issueType"];
  severity: ReconciliationIssueView["severity"];
  entityType: string;
  entityId: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  expectedStatus: string | null;
  actualStatus: string | null;
  expectedAmountClp: number | null;
  actualAmountClp: number | null;
  status: ReconciliationIssueView["status"];
  details: Prisma.JsonValue;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedById: string | null;
  resolutionNote: string | null;
}): ReconciliationIssueView {
  return {
    id: row.id,
    runId: row.runId,
    issueType: row.issueType,
    severity: row.severity,
    entityType: row.entityType,
    entityId: row.entityId,
    providerPaymentId: row.providerPaymentId,
    providerRefundId: row.providerRefundId,
    expectedStatus: row.expectedStatus,
    actualStatus: row.actualStatus,
    expectedAmountClp: row.expectedAmountClp,
    actualAmountClp: row.actualAmountClp,
    status: row.status,
    details: sanitizeDetails(asRecord(row.details)),
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedById: row.resolvedById,
    resolutionNote: row.resolutionNote,
  };
}

function sanitizeDetails(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    if (entry == null || typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
      out[key] = entry;
    }
  }
  return out;
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringField(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function providerErrorMessage(error: unknown): string {
  if (error instanceof PaymentProviderError) {
    return `Proveedor: ${error.code}`;
  }
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message.slice(0, 200);
  return "Error inesperado";
}

function assertAdminOps(user: RequestUser): void {
  const allowed = new Set<string>(ADMIN_OPS_ROLES);
  if (!user.roles.some((role) => allowed.has(role))) {
    throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FORBIDDEN, "Se requiere ADMIN o SUPER_ADMIN");
  }
}
