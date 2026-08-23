import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  DISPUTE_EVIDENCE_MIMES,
  ERROR_CODES,
  PLATFORM,
  type DisputeStatus,
} from "@tcg/config";
import type {
  AdminAuditEventView,
  AdminDisputeDetailView,
  DisputeDetailView,
  DisputeEvidenceView,
  DisputeListItem,
  DisputeMessageView,
  Paginated,
  PublicPartyView,
} from "@tcg/types";
import type {
  AdminDisputeResolveInput,
  AdminDisputeStatusInput,
  AdminDisputesQuery,
  DisputeEvidenceInput,
  DisputeMessageInput,
  OpenDisputeInput,
} from "@tcg/validation";
import { AuditService } from "../audit/audit.service";
import type { RequestUser } from "../auth/request-user";
import { AppError } from "../common/errors/app-error";
import { FilesService } from "../files/files.service";
import { MetricsService } from "../observability/metrics.service";
import { PayoutsService } from "../payouts/payouts.service";
import { PrismaService } from "../prisma/prisma.service";
import { ListingRevisionService } from "./listing-revision.service";
import { ModerationLogService } from "./moderation-log.service";
import { sanitizePlainText } from "./sanitize";
import {
  ACTIVE_DISPUTE_STATUSES,
  assertAdminOps,
  assertDisputeTransition,
  assertModerationStaff,
  assertPartyOrStaff,
  isModerationStaff,
} from "./trust-access";

const PARTY = { id: true, displayName: true, slug: true } as const;
const OPEN_ORDER_STATUSES = [
  "PAID",
  "PREPARING",
  "SHIPPED",
  "READY_FOR_MEETUP",
  "DELIVERED",
  "CONFIRMED",
  "COMPLETED",
  "DISPUTED",
] as const;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revisions: ListingRevisionService,
    private readonly moderation: ModerationLogService,
    private readonly payouts: PayoutsService,
    private readonly metrics: MetricsService,
    private readonly files: FilesService,
  ) {}

  async open(actor: RequestUser, orderId: string, input: OpenDisputeInput): Promise<DisputeDetailView> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { select: { listingId: true } } },
    });
    if (!order || (order.buyerId !== actor.id && order.sellerId !== actor.id)) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
    }
    if (!OPEN_ORDER_STATUSES.includes(order.status as (typeof OPEN_ORDER_STATUSES)[number])) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ERROR_CODES.ORDER_ILLEGAL_TRANSITION,
        "No se puede abrir disputa en este estado",
      );
    }
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const row = await tx.dispute.create({
          data: {
            orderId: order.id,
            openedById: actor.id,
            buyerId: order.buyerId,
            sellerId: order.sellerId,
            reason: input.reason,
            status: "OPEN",
          },
        });
        if (order.status !== "DISPUTED") {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "DISPUTED",
              notes: sanitizePlainText(input.description ?? input.reason, 2000),
            },
          });
        }
        if (input.description) {
          await tx.disputeMessage.create({
            data: {
              disputeId: row.id,
              authorId: actor.id,
              body: sanitizePlainText(input.description, PLATFORM.disputeMaxMessageChars),
              isInternalAdminNote: false,
            },
          });
        }
        return row;
      });
      await this.audit.log({
        actorId: actor.id,
        action: "dispute.opened",
        entityType: "Dispute",
        entityId: created.id,
        metadata: { orderId, reason: input.reason },
      });
      await this.audit.log({
        actorId: actor.id,
        action: "order.disputed",
        entityType: "Order",
        entityId: order.id,
        metadata: { reason: input.reason, disputeId: created.id },
      });
      await this.payouts.onActiveDispute(order.id, actor.id);
      this.metrics.inc("dispute_opened_total");
      return this.get(actor, created.id);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.DISPUTE_ALREADY_OPEN,
          "Ya hay una disputa activa para esta orden",
        );
      }
      throw error;
    }
  }

  async listMine(actor: RequestUser, page: number, pageSize: number): Promise<Paginated<DisputeListItem>> {
    const where: Prisma.DisputeWhereInput = {
      OR: [{ buyerId: actor.id }, { sellerId: actor.id }],
    };
    return this.page(where, page, pageSize);
  }

  async listAdmin(query: AdminDisputesQuery): Promise<Paginated<DisputeListItem>> {
    return this.page({ status: query.status, reason: query.reason }, query.page, query.pageSize);
  }

  async get(actor: RequestUser, id: string): Promise<DisputeDetailView> {
    const row = await this.load(id);
    assertPartyOrStaff(actor, row.buyerId, row.sellerId);
    return this.toDetail(row, isModerationStaff(actor));
  }

  async getAdmin(actor: RequestUser, id: string): Promise<AdminDisputeDetailView> {
    assertModerationStaff(actor);
    const row = await this.load(id);
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: row.orderId },
      include: {
        payment: { select: { id: true, status: true, amountClp: true } },
        shipment: { select: { id: true, status: true } },
        items: { select: { listingId: true } },
        buyer: { select: { email: true } },
        seller: { select: { email: true } },
      },
    });
    const refunds = order.payment
      ? await this.prisma.refund.findMany({
          where: { paymentId: order.payment.id },
          select: { id: true, status: true, amountClp: true },
        })
      : [];
    const listingIds = [...new Set(order.items.map((item) => item.listingId))];
    const [listingRevisions, events] = await Promise.all([
      this.revisions.forListings(listingIds),
      this.prisma.auditLog.findMany({
        where: { entityId: { in: [row.id, row.orderId] } },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
    ]);
    const timeline: AdminAuditEventView[] = events.map((event) => ({
      id: event.id,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      actorId: event.actorId,
      createdAt: event.createdAt.toISOString(),
      metadata: {},
    }));
    return {
      ...this.toDetail(row, true),
      buyerEmail: order.buyer.email,
      sellerEmail: order.seller.email,
      payment: order.payment,
      refunds,
      shipment: order.shipment,
      listingRevisions,
      timeline,
    };
  }

  async addMessage(actor: RequestUser, id: string, input: DisputeMessageInput): Promise<DisputeMessageView> {
    const row = await this.load(id);
    assertPartyOrStaff(actor, row.buyerId, row.sellerId);
    if (!ACTIVE_DISPUTE_STATUSES.includes(row.status)) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.DISPUTE_ILLEGAL_TRANSITION, "La disputa está cerrada");
    }
    const internal = Boolean(input.isInternalAdminNote);
    if (internal && !isModerationStaff(actor)) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FORBIDDEN, "Solo staff puede dejar notas internas");
    }
    const created = await this.prisma.disputeMessage.create({
      data: {
        disputeId: id,
        authorId: actor.id,
        body: sanitizePlainText(input.body, PLATFORM.disputeMaxMessageChars),
        isInternalAdminNote: internal,
      },
      include: { author: { select: PARTY } },
    });
    await this.audit.log({
      actorId: actor.id,
      action: internal ? "dispute.internal_note" : "dispute.message",
      entityType: "Dispute",
      entityId: id,
    });
    return {
      id: created.id,
      author: created.author,
      body: created.body,
      isInternalAdminNote: created.isInternalAdminNote,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async addEvidence(actor: RequestUser, id: string, input: DisputeEvidenceInput): Promise<DisputeEvidenceView> {
    const row = await this.load(id);
    assertPartyOrStaff(actor, row.buyerId, row.sellerId);
    if (!ACTIVE_DISPUTE_STATUSES.includes(row.status)) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.DISPUTE_ILLEGAL_TRANSITION, "La disputa está cerrada");
    }
    const count = await this.prisma.disputeEvidence.count({ where: { disputeId: id } });
    if (count >= PLATFORM.disputeMaxEvidence) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.EVIDENCE_LIMIT, "Límite de evidencia alcanzado");
    }
    const file = await this.prisma.file.findUnique({ where: { id: input.fileId } });
    if (!file || file.uploadedById !== actor.id) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Archivo no encontrado");
    }
    if (file.status !== "READY") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.FILE_NOT_ALLOWED, "El archivo no está listo");
    }
    if (!(DISPUTE_EVIDENCE_MIMES as readonly string[]).includes(file.mime)) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.FILE_NOT_ALLOWED, "Tipo de archivo no permitido");
    }
    if (file.size > PLATFORM.disputeEvidenceMaxBytes) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.FILE_NOT_ALLOWED, "Archivo demasiado grande");
    }
    const created = await this.prisma.disputeEvidence.create({
      data: {
        disputeId: id,
        uploadedById: actor.id,
        fileId: file.id,
        evidenceType: input.evidenceType,
        description: sanitizePlainText(input.description ?? "", 500),
      },
      include: { file: { select: { mime: true, size: true } } },
    });
    await this.audit.log({
      actorId: actor.id,
      action: "dispute.evidence",
      entityType: "Dispute",
      entityId: id,
      metadata: { fileId: file.id, evidenceType: input.evidenceType },
    });
    return {
      id: created.id,
      uploadedById: created.uploadedById,
      fileId: created.fileId,
      mime: created.file.mime,
      size: created.file.size,
      evidenceType: created.evidenceType,
      description: created.description,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async streamEvidenceFile(actor: RequestUser, disputeId: string, evidenceId: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Disputa no encontrada");
    }
    assertPartyOrStaff(actor, dispute.buyerId, dispute.sellerId);
    const evidence = await this.prisma.disputeEvidence.findFirst({
      where: { id: evidenceId, disputeId },
      include: { file: true },
    });
    if (!evidence) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Evidencia no encontrada");
    }
    return this.files.openStored(evidence.file);
  }

  async assign(actor: RequestUser, id: string): Promise<DisputeDetailView> {
    assertModerationStaff(actor);
    const row = await this.load(id);
    if (!ACTIVE_DISPUTE_STATUSES.includes(row.status)) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.DISPUTE_ILLEGAL_TRANSITION, "La disputa está cerrada");
    }
    await this.prisma.dispute.update({ where: { id }, data: { assignedAdminId: actor.id } });
    await this.moderation.record(actor, {
      targetType: "Dispute",
      targetId: id,
      actionType: "DISPUTE_ASSIGNED",
      reason: "Asignación",
    });
    return this.get(actor, id);
  }

  async setStatus(actor: RequestUser, id: string, input: AdminDisputeStatusInput): Promise<DisputeDetailView> {
    assertModerationStaff(actor);
    const row = await this.load(id);
    const next = input.status as DisputeStatus;
    assertDisputeTransition(row.status, next);
    await this.prisma.dispute.update({
      where: { id },
      data: {
        status: next,
        resolvedAt: next === "CANCELLED" ? new Date() : row.resolvedAt,
        resolution: next === "CANCELLED" ? sanitizePlainText(input.note ?? "Cancelada", 1000) : row.resolution,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: "dispute.status",
      entityType: "Dispute",
      entityId: id,
      metadata: { from: row.status, to: next },
    });
    return this.get(actor, id);
  }

  async resolve(actor: RequestUser, id: string, input: AdminDisputeResolveInput): Promise<DisputeDetailView> {
    assertModerationStaff(actor);
    const row = await this.load(id);
    const next: DisputeStatus =
      input.outcome === "BUYER" ? "RESOLVED_BUYER" : input.outcome === "SELLER" ? "RESOLVED_SELLER" : "CANCELLED";
    assertDisputeTransition(row.status, next);
    await this.prisma.dispute.update({
      where: { id },
      data: {
        status: next,
        resolvedAt: new Date(),
        resolution: sanitizePlainText(input.note, 1000),
        assignedAdminId: row.assignedAdminId ?? actor.id,
      },
    });
    await this.moderation.record(actor, {
      targetType: "Dispute",
      targetId: id,
      actionType: "DISPUTE_RESOLVED",
      reason: input.note,
      metadata: { outcome: input.outcome },
    });
    return this.get(actor, id);
  }

  assertAdminOnly(actor: RequestUser): void {
    assertAdminOps(actor);
  }

  private async page(where: Prisma.DisputeWhereInput, page: number, pageSize: number) {
    const [rows, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        include: { order: { select: { orderNumber: true } } },
        orderBy: { openedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.dispute.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        orderId: row.orderId,
        orderNumber: row.order.orderNumber,
        reason: row.reason,
        status: row.status,
        openedAt: row.openedAt.toISOString(),
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
      })),
      page,
      pageSize,
      total,
    };
  }

  private async load(id: string) {
    const row = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        buyer: { select: PARTY },
        seller: { select: PARTY },
        order: { select: { orderNumber: true } },
        messages: { include: { author: { select: PARTY } }, orderBy: { createdAt: "asc" } },
        evidence: { include: { file: { select: { mime: true, size: true } } }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Disputa no encontrada");
    }
    return row;
  }

  private toDetail(
    row: Awaited<ReturnType<DisputesService["load"]>>,
    includeInternal: boolean,
  ): DisputeDetailView {
    const messages: DisputeMessageView[] = row.messages
      .filter((message) => includeInternal || !message.isInternalAdminNote)
      .map((message) => ({
        id: message.id,
        author: message.author,
        body: message.body,
        isInternalAdminNote: message.isInternalAdminNote,
        createdAt: message.createdAt.toISOString(),
      }));
    const evidence: DisputeEvidenceView[] = row.evidence.map((item) => ({
      id: item.id,
      uploadedById: item.uploadedById,
      fileId: item.fileId,
      mime: item.file.mime,
      size: item.file.size,
      evidenceType: item.evidenceType,
      description: item.description,
      createdAt: item.createdAt.toISOString(),
    }));
    const party = (value: PublicPartyView): PublicPartyView => value;
    return {
      id: row.id,
      orderId: row.orderId,
      orderNumber: row.order.orderNumber,
      reason: row.reason,
      status: row.status,
      resolution: row.resolution,
      openedAt: row.openedAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      buyer: party(row.buyer),
      seller: party(row.seller),
      assignedAdminId: row.assignedAdminId,
      messages,
      evidence,
    };
  }
}
