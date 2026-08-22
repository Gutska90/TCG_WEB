import { randomUUID } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ERROR_CODES } from "@tcg/config";
import type { LedgerEntryView } from "@tcg/types";
import type { AdminLedgerAdjustmentInput } from "@tcg/validation";
import { AuditService } from "../audit/audit.service";
import type { RequestUser } from "../auth/request-user";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { toLedgerEntryView } from "./ledger-query.service";
import { ledgerIdempotencyKey } from "./ledger.money";
import { LedgerService } from "./ledger.service";

@Injectable()
export class LedgerAdjustmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  async create(actor: RequestUser, input: AdminLedgerAdjustmentInput): Promise<LedgerEntryView> {
    if (!actor.roles.includes("SUPER_ADMIN")) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FORBIDDEN, "Solo SUPER_ADMIN puede ajustar el ledger");
    }
    const seller = await this.prisma.user.findUnique({
      where: { id: input.sellerId },
      select: { id: true, deletedAt: true },
    });
    if (!seller || seller.deletedAt) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Vendedor no encontrado");
    }

    const adjustmentId = randomUUID();
    const entry = await this.prisma.$transaction(async (tx) => {
      await this.ledger.insert(tx, {
        sellerId: input.sellerId,
        entryType: "ADJUSTMENT",
        amountClp: input.amountClp,
        idempotencyKey: ledgerIdempotencyKey("ADJUSTMENT", { adjustmentId }),
        metadata: { reason: input.reason, actorId: actor.id },
      });
      const created = await tx.ledgerEntry.findUniqueOrThrow({
        where: { idempotencyKey: ledgerIdempotencyKey("ADJUSTMENT", { adjustmentId }) },
      });
      await this.audit.log(
        {
          actorId: actor.id,
          action: "ledger.adjustment",
          entityType: "LedgerEntry",
          entityId: created.id,
          metadata: {
            sellerId: input.sellerId,
            amountClp: input.amountClp,
            reason: input.reason,
          },
        },
        tx,
      );
      return created;
    });
    return toLedgerEntryView(entry);
  }
}
