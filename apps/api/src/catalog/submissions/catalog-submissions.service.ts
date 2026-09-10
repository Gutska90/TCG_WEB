import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ERROR_CODES, PLATFORM } from "@tcg/config";
import type {
  AdminCatalogSubmissionView,
  CatalogDuplicateHint,
  CatalogSubmissionDetailView,
  CatalogSubmissionView,
  CreateCatalogSubmissionResult,
  Paginated,
} from "@tcg/types";
import type {
  AdminCatalogApproveInput,
  AdminCatalogRejectInput,
  AdminCatalogReviewInput,
  AdminCatalogSubmissionsQuery,
  CreateCatalogSubmissionInput,
} from "@tcg/validation";
import type { CatalogSubmissionStatus } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import type { RequestUser } from "../../auth/request-user";
import { slugifyStable, uniqueSlug } from "../slug";
import { isLikelyDuplicateCard, normalizeCatalogName } from "./duplicates";

const REVIEWABLE: CatalogSubmissionStatus[] = ["PENDING", "NEEDS_INFO"];

type SubmissionRow = Prisma.CatalogSubmissionGetPayload<{
  include: {
    game: true;
    set: true;
    submittedBy: { select: { id: true; displayName: true; slug: true } };
    reviewedBy: { select: { id: true; displayName: true; slug: true } };
    approvedCard: { include: { set: { include: { game: true } } } };
  };
}>;

const include = {
  game: true,
  set: true,
  submittedBy: { select: { id: true, displayName: true, slug: true } },
  reviewedBy: { select: { id: true, displayName: true, slug: true } },
  approvedCard: { include: { set: { include: { game: true } } } },
} as const;

function jsonAttributes(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function sanitizeAttributes(input: Record<string, unknown> | undefined): Prisma.InputJsonValue {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (key === "legalidad") continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      out[key] = value;
    }
  }
  return out;
}

@Injectable()
export class CatalogSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(actor: RequestUser, input: CreateCatalogSubmissionInput): Promise<CreateCatalogSubmissionResult> {
    const game = await this.prisma.tcgGame.findFirst({ where: { id: input.gameId, isActive: true } });
    if (!game) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Juego no encontrado");
    }
    if (input.setId) {
      const set = await this.prisma.tcgSet.findFirst({ where: { id: input.setId, gameId: game.id } });
      if (!set) {
        throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "La edición no pertenece a ese juego");
      }
    }
    const row = await this.prisma.catalogSubmission.create({
      data: {
        submittedById: actor.id,
        gameId: game.id,
        setId: input.setId ?? null,
        proposedSetName: input.proposedSetName?.trim() || null,
        name: input.name.trim(),
        number: input.number?.trim() || null,
        rarity: input.rarity?.trim() || null,
        supertype: input.supertype?.trim() || null,
        attributes: sanitizeAttributes(input.attributes),
        imageUrl: input.imageUrl ?? null,
        notes: input.notes?.trim() || null,
        sourceUrl: input.sourceUrl ?? null,
        status: "PENDING",
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: "catalog_submission.created",
      entityType: "CatalogSubmission",
      entityId: row.id,
      metadata: { gameId: game.id, name: row.name },
    });
    return { id: row.id, status: "PENDING" };
  }

  async listMine(userId: string, page: number, pageSize: number): Promise<Paginated<CatalogSubmissionView>> {
    const where = { submittedById: userId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.catalogSubmission.count({ where }),
      this.prisma.catalogSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include,
      }),
    ]);
    return { items: rows.map((row) => this.toView(row)), page, pageSize, total };
  }

  async getMine(userId: string, id: string): Promise<CatalogSubmissionDetailView> {
    const row = await this.prisma.catalogSubmission.findFirst({
      where: { id, submittedById: userId },
      include,
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Solicitud no encontrada");
    }
    return this.toDetail(row);
  }

  async listAdmin(query: AdminCatalogSubmissionsQuery): Promise<Paginated<AdminCatalogSubmissionView>> {
    const where: Prisma.CatalogSubmissionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.gameId ? { gameId: query.gameId } : {}),
      ...(query.submittedById ? { submittedById: query.submittedById } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const pageSize = query.pageSize ?? PLATFORM.searchPageSizeDefault;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.catalogSubmission.count({ where }),
      this.prisma.catalogSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * pageSize,
        take: pageSize,
        include,
      }),
    ]);
    const items = [];
    for (const row of rows) {
      items.push(await this.toAdminView(row));
    }
    return { items, page: query.page, pageSize, total };
  }

  async getAdmin(id: string): Promise<AdminCatalogSubmissionView> {
    const row = await this.prisma.catalogSubmission.findUnique({ where: { id }, include });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Solicitud no encontrada");
    }
    return this.toAdminView(row);
  }

  async approve(actor: RequestUser, id: string, input: AdminCatalogApproveInput): Promise<AdminCatalogSubmissionView> {
    const approved = await this.prisma.$transaction(async (tx) => {
      const locked = await this.lock(tx, id);
      this.assertReviewable(locked.status);
      const current = await tx.catalogSubmission.findUniqueOrThrow({ where: { id } });
      const setId = await this.resolveSetId(tx, current, input.setId);
      const number = current.number?.trim() || current.name;
      const exact = await tx.card.findUnique({
        where: { setId_number_name: { setId, number, name: current.name } },
      });
      if (exact) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.CONFLICT,
          `Posible duplicado: ${exact.name} — #${exact.number}`,
        );
      }
      const taken = new Set(
        (await tx.card.findMany({ where: { setId }, select: { slug: true } })).map((card) => card.slug),
      );
      const slug = uniqueSlug(slugifyStable(current.name, "carta"), taken);
      const attributes = {
        ...jsonAttributes(current.attributes),
        source: "catalog-submission",
        sourceQuality: "CURATED_VERIFIED",
        verified: false,
        ...(current.sourceUrl ? { sourceUrl: current.sourceUrl } : {}),
        sourceId: current.id,
        sourceRetrievedAt: new Date().toISOString(),
      };
      const card = await tx.card.create({
        data: {
          setId,
          number,
          slug,
          name: current.name,
          rarity: current.rarity?.trim() || "Sin rareza",
          supertype: current.supertype?.trim() || "Carta",
          imageUrl: current.imageUrl,
          attributes: attributes as Prisma.InputJsonValue,
        },
      });
      await tx.cardVariant.create({
        data: {
          cardId: card.id,
          language: input.language ?? "ES",
          finish: input.finish ?? "NORMAL",
          isDefault: true,
          externalIds: { catalogSubmissionId: current.id } as Prisma.InputJsonValue,
        },
      });
      const updated = await tx.catalogSubmission.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedById: actor.id,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes?.trim() || current.reviewNotes,
          setId,
          approvedCardId: card.id,
        },
        include,
      });
      await this.audit.log(
        {
          actorId: actor.id,
          action: "catalog_submission.approved",
          entityType: "CatalogSubmission",
          entityId: id,
          metadata: { cardId: card.id, variantDefault: true },
        },
        tx,
      );
      return updated;
    });
    return this.toAdminView(approved);
  }

  async reject(actor: RequestUser, id: string, input: AdminCatalogRejectInput): Promise<AdminCatalogSubmissionView> {
    return this.transition(actor, id, "REJECTED", "catalog_submission.rejected", input.reviewNotes);
  }

  async markDuplicate(actor: RequestUser, id: string, input: AdminCatalogReviewInput): Promise<AdminCatalogSubmissionView> {
    return this.transition(actor, id, "DUPLICATE", "catalog_submission.duplicate", input.reviewNotes);
  }

  async needsInfo(actor: RequestUser, id: string, input: AdminCatalogRejectInput): Promise<AdminCatalogSubmissionView> {
    return this.transition(actor, id, "NEEDS_INFO", "catalog_submission.needs_info", input.reviewNotes);
  }

  async findDuplicates(row: {
    gameId: string;
    setId: string | null;
    name: string;
    number: string | null;
  }): Promise<CatalogDuplicateHint[]> {
    const cards = await this.prisma.card.findMany({
      where: {
        set: { gameId: row.gameId },
        ...(row.setId ? { setId: row.setId } : {}),
        OR: [
          { slug: normalizeCatalogName(row.name) },
          { name: { equals: row.name, mode: "insensitive" } },
          ...(row.number ? [{ number: row.number }] : []),
        ],
      },
      take: 8,
      include: { set: true },
    });
    return cards
      .filter((card) =>
        isLikelyDuplicateCard(
          { name: card.name, number: card.number, setId: card.setId },
          { name: row.name, number: row.number, setId: row.setId },
        ),
      )
      .map((card) => ({
        id: card.id,
        name: card.name,
        number: card.number,
        setName: card.set.name,
        setSlug: card.set.slug,
      }));
  }

  private async transition(
    actor: RequestUser,
    id: string,
    status: Exclude<CatalogSubmissionStatus, "PENDING" | "APPROVED">,
    action: string,
    reviewNotes?: string,
  ): Promise<AdminCatalogSubmissionView> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await this.lock(tx, id);
      this.assertReviewable(locked.status);
      const current = await tx.catalogSubmission.findUniqueOrThrow({ where: { id } });
      const next = await tx.catalogSubmission.update({
        where: { id },
        data: {
          status,
          reviewedById: actor.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes?.trim() || current.reviewNotes,
        },
        include,
      });
      await this.audit.log(
        {
          actorId: actor.id,
          action,
          entityType: "CatalogSubmission",
          entityId: id,
          metadata: { status },
        },
        tx,
      );
      return next;
    });
    return this.toAdminView(updated);
  }

  private async lock(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<{ id: string; status: CatalogSubmissionStatus }> {
    const rows = await tx.$queryRaw<Array<{ id: string; status: CatalogSubmissionStatus }>>(
      Prisma.sql`SELECT id, status FROM catalog_submissions WHERE id = ${id}::uuid FOR UPDATE`,
    );
    const current = rows[0];
    if (!current) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Solicitud no encontrada");
    }
    return current;
  }

  private assertReviewable(status: CatalogSubmissionStatus): void {
    if (!REVIEWABLE.includes(status)) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ERROR_CODES.CATALOG_SUBMISSION_NOT_REVIEWABLE,
        "Esta solicitud ya fue resuelta",
      );
    }
  }

  private async resolveSetId(
    tx: Prisma.TransactionClient,
    current: { gameId: string; setId: string | null; proposedSetName: string | null; name: string },
    overrideSetId?: string,
  ): Promise<string> {
    const setId = overrideSetId ?? current.setId ?? null;
    if (setId) {
      const set = await tx.tcgSet.findFirst({ where: { id: setId, gameId: current.gameId } });
      if (!set) {
        throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "Edición inválida");
      }
      return set.id;
    }
    const proposed = current.proposedSetName?.trim();
    if (!proposed) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        "Indica una edición existente o un nombre de edición nueva",
      );
    }
    const slug = slugifyStable(proposed, "edicion");
    const existing =
      (await tx.tcgSet.findFirst({ where: { gameId: current.gameId, slug } })) ??
      (await tx.tcgSet.findFirst({ where: { gameId: current.gameId, name: { equals: proposed, mode: "insensitive" } } }));
    if (existing) return existing.id;
    const takenCodes = new Set(
      (await tx.tcgSet.findMany({ where: { gameId: current.gameId }, select: { code: true, slug: true } })).flatMap(
        (row) => [row.code, row.slug],
      ),
    );
    const code = uniqueSlug(slug.replace(/-/g, "").slice(0, 8).toUpperCase() || "SET", takenCodes).slice(0, 12);
    const created = await tx.tcgSet.create({
      data: {
        gameId: current.gameId,
        code,
        slug: uniqueSlug(slug, new Set(takenCodes)),
        name: proposed,
      },
    });
    return created.id;
  }

  private toView(row: SubmissionRow): CatalogSubmissionView {
    return {
      id: row.id,
      status: row.status,
      name: row.name,
      number: row.number,
      rarity: row.rarity,
      game: { id: row.game.id, slug: row.game.slug, name: row.game.name },
      set: row.set ? { id: row.set.id, slug: row.set.slug, name: row.set.name } : null,
      proposedSetName: row.proposedSetName,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      approvedCardId: row.approvedCardId,
    };
  }

  private toDetail(row: SubmissionRow): CatalogSubmissionDetailView {
    return {
      ...this.toView(row),
      supertype: row.supertype,
      attributes: jsonAttributes(row.attributes),
      imageUrl: row.imageUrl,
      notes: row.notes,
      sourceUrl: row.sourceUrl,
      reviewNotes: row.reviewNotes,
      approvedCard: row.approvedCard
        ? {
            id: row.approvedCard.id,
            slug: row.approvedCard.slug,
            name: row.approvedCard.name,
            gameSlug: row.approvedCard.set.game.slug,
            setSlug: row.approvedCard.set.slug,
          }
        : null,
    };
  }

  private async toAdminView(row: SubmissionRow): Promise<AdminCatalogSubmissionView> {
    return {
      ...this.toDetail(row),
      submittedBy: row.submittedBy,
      reviewedBy: row.reviewedBy,
      possibleDuplicates: await this.findDuplicates({
        gameId: row.gameId,
        setId: row.setId,
        name: row.name,
        number: row.number,
      }),
    };
  }
}
