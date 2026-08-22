import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ListingRevisionSource } from "@prisma/client";
import type { ListingRevisionView } from "@tcg/types";
import { PrismaService } from "../prisma/prisma.service";
import { asJsonRecord } from "./sanitize";

export type ListingSnapshot = {
  priceClp: number;
  condition: string | null;
  quantity: number;
  description: string;
  status: string;
};

@Injectable()
export class ListingRevisionService {
  constructor(private readonly prisma: PrismaService) {}

  snapshot(listing: ListingSnapshot): ListingSnapshot {
    return {
      priceClp: listing.priceClp,
      condition: listing.condition,
      quantity: listing.quantity,
      description: listing.description,
      status: listing.status,
    };
  }

  changed(before: ListingSnapshot, after: ListingSnapshot): boolean {
    return JSON.stringify(before) !== JSON.stringify(after);
  }

  async record(
    tx: Prisma.TransactionClient | PrismaService,
    input: {
      listingId: string;
      actorId: string;
      source: ListingRevisionSource;
      reason?: string;
      before: ListingSnapshot;
      after: ListingSnapshot;
    },
  ): Promise<void> {
    if (!this.changed(input.before, input.after)) return;
    await tx.listingRevision.create({
      data: {
        listingId: input.listingId,
        actorId: input.actorId,
        source: input.source,
        reason: input.reason ?? "",
        before: input.before,
        after: input.after,
      },
    });
  }

  async forListings(listingIds: string[]): Promise<ListingRevisionView[]> {
    if (listingIds.length === 0) return [];
    const rows = await this.prisma.listingRevision.findMany({
      where: { listingId: { in: listingIds } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      listingId: row.listingId,
      actorId: row.actorId,
      source: row.source,
      reason: row.reason,
      before: asJsonRecord(row.before),
      after: asJsonRecord(row.after),
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
