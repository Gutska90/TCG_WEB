import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { ERROR_CODES } from "@tcg/config";
import type { SellerBalanceView } from "@tcg/types";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { ACTIVE_DISPUTE_STATUSES } from "../trust/trust-access";

type BalanceTx = Prisma.TransactionClient | PrismaService;

type EntryRow = {
  entryType: string;
  amountClp: number;
  orderId: string | null;
};

export function deriveSellerBalance(sellerId: string, entries: EntryRow[]): SellerBalanceView {
  const payableOrders = new Set(
    entries.filter((row) => row.entryType === "SELLER_PAYABLE" && row.orderId).map((row) => row.orderId as string),
  );

  let captured = 0;
  let payable = 0;
  let refundsBefore = 0;
  let refundsAfter = 0;
  let reserved = 0;
  let reversed = 0;
  let paid = 0;
  let adjustment = 0;

  for (const row of entries) {
    switch (row.entryType) {
      case "PAYMENT_CAPTURED":
        captured += row.amountClp;
        break;
      case "SELLER_PAYABLE":
        payable += row.amountClp;
        break;
      case "REFUND":
        if (row.orderId && payableOrders.has(row.orderId)) {
          refundsAfter += row.amountClp;
        } else {
          refundsBefore += row.amountClp;
        }
        break;
      case "PAYOUT_RESERVED":
        reserved += row.amountClp;
        break;
      case "PAYOUT_REVERSED":
        reversed += row.amountClp;
        break;
      case "PAYOUT_PAID":
        paid += row.amountClp;
        break;
      case "ADJUSTMENT":
        adjustment += row.amountClp;
        break;
      default:
        break;
    }
  }

  const pendingClp = captured - payable + refundsBefore;
  const availableClp = payable + refundsAfter + reserved + reversed + adjustment;
  const reservedClp = -(reserved + paid + reversed) || 0;
  const netClp = pendingClp + availableClp + reservedClp;

  return {
    sellerId,
    pendingClp,
    availableClp,
    reservedClp,
    paidClp: paid,
    disputedClp: 0,
    netClp,
  };
}

@Injectable()
export class SellerBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async forSeller(sellerId: string, client?: BalanceTx): Promise<SellerBalanceView> {
    const db = client ?? this.prisma;
    const seller = await db.user.findUnique({
      where: { id: sellerId },
      select: { id: true, deletedAt: true },
    });
    if (!seller || seller.deletedAt) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Vendedor no encontrado");
    }
    const entries = await db.ledgerEntry.findMany({
      where: { sellerId },
      select: { entryType: true, amountClp: true, orderId: true },
    });
    const base = deriveSellerBalance(sellerId, entries);
    const disputed = await db.dispute.findMany({
      where: { sellerId, status: { in: [...ACTIVE_DISPUTE_STATUSES] } },
      select: { orderId: true },
    });
    const disputedOrderIds = new Set(disputed.map((row) => row.orderId));
    if (disputedOrderIds.size === 0) return base;

    const processingOrPaid = await db.payoutItem.findMany({
      where: {
        orderId: { in: [...disputedOrderIds] },
        locksOrder: true,
        payout: { status: { in: ["PROCESSING", "PAID"] } },
      },
      select: { orderId: true },
    });
    const frozenLocked = new Set(processingOrPaid.map((row) => row.orderId));
    let disputedClp = 0;
    const payableOrders = new Set(
      entries.filter((row) => row.entryType === "SELLER_PAYABLE" && row.orderId).map((row) => row.orderId as string),
    );
    const refunded = new Set(
      entries.filter((row) => row.entryType === "REFUND" && row.orderId).map((row) => row.orderId as string),
    );
    for (const row of entries) {
      if (row.entryType !== "SELLER_PAYABLE" || !row.orderId) continue;
      if (!disputedOrderIds.has(row.orderId)) continue;
      if (frozenLocked.has(row.orderId) || refunded.has(row.orderId)) continue;
      if (!payableOrders.has(row.orderId)) continue;
      disputedClp += row.amountClp;
    }
    return {
      ...base,
      availableClp: base.availableClp - disputedClp,
      disputedClp,
      netClp: base.netClp,
    };
  }
}
