import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { LedgerEntryType } from "@tcg/config";
import type { LedgerEntryView, Paginated } from "@tcg/types";
import type { AdminLedgerQuery } from "@tcg/validation";
import { PrismaService } from "../prisma/prisma.service";

export function toLedgerEntryView(row: {
  id: string;
  sellerId: string | null;
  entryType: LedgerEntryType;
  amountClp: number;
  orderId: string | null;
  paymentId: string | null;
  refundId: string | null;
  payoutId: string | null;
  idempotencyKey: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}): LedgerEntryView {
  return {
    id: row.id,
    sellerId: row.sellerId,
    entryType: row.entryType,
    amountClp: row.amountClp,
    orderId: row.orderId,
    paymentId: row.paymentId,
    refundId: row.refundId,
    payoutId: row.payoutId,
    idempotencyKey: row.idempotencyKey,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class LedgerQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminLedgerQuery): Promise<Paginated<LedgerEntryView>> {
    const where: Prisma.LedgerEntryWhereInput = {
      sellerId: query.sellerId,
      entryType: query.entryType,
      orderId: query.orderId,
      paymentId: query.paymentId,
      refundId: query.refundId,
      payoutId: query.payoutId,
    };
    if (query.from || query.to) {
      where.createdAt = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      };
    }
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);
    return {
      items: items.map(toLedgerEntryView),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }
}
