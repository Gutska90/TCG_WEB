import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { LedgerEntryType } from "@tcg/config";
import { PrismaService } from "../prisma/prisma.service";
import { assertIntegerClp, ledgerIdempotencyKey, sellerNetClp } from "./ledger.money";

export type LedgerTx = Prisma.TransactionClient;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async insert(
    tx: LedgerTx,
    input: {
      sellerId?: string | null;
      entryType: LedgerEntryType;
      amountClp: number;
      orderId?: string | null;
      paymentId?: string | null;
      refundId?: string | null;
      payoutId?: string | null;
      idempotencyKey: string;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<"inserted" | "duplicate"> {
    assertIntegerClp(input.amountClp);
    const existing = await tx.ledgerEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true },
    });
    if (existing) {
      return "duplicate";
    }
    try {
      await tx.ledgerEntry.create({
        data: {
          sellerId: input.sellerId ?? null,
          entryType: input.entryType,
          amountClp: input.amountClp,
          orderId: input.orderId ?? null,
          paymentId: input.paymentId ?? null,
          refundId: input.refundId ?? null,
          payoutId: input.payoutId ?? null,
          idempotencyKey: input.idempotencyKey,
          metadata: input.metadata ?? {},
        },
      });
      return "inserted";
    } catch (error) {
      if (isUniqueViolation(error)) {
        return "duplicate";
      }
      throw error;
    }
  }

  async recordCapture(
    tx: LedgerTx,
    input: {
      sellerId: string;
      orderId: string;
      paymentId: string;
      totalClp: number;
      commissionClp: number;
    },
  ): Promise<void> {
    const net = sellerNetClp(input.totalClp, input.commissionClp);
    await this.insert(tx, {
      sellerId: input.sellerId,
      entryType: "PAYMENT_CAPTURED",
      amountClp: net,
      orderId: input.orderId,
      paymentId: input.paymentId,
      idempotencyKey: ledgerIdempotencyKey("PAYMENT_CAPTURED", { orderId: input.orderId }),
      metadata: { totalClp: input.totalClp, commissionClp: input.commissionClp },
    });
  }

  async recordRelease(
    tx: LedgerTx,
    input: {
      sellerId: string;
      orderId: string;
      paymentId: string;
      totalClp: number;
      commissionClp: number;
    },
  ): Promise<void> {
    const net = sellerNetClp(input.totalClp, input.commissionClp);
    await this.insert(tx, {
      sellerId: input.sellerId,
      entryType: "SELLER_PAYABLE",
      amountClp: net,
      orderId: input.orderId,
      paymentId: input.paymentId,
      idempotencyKey: ledgerIdempotencyKey("SELLER_PAYABLE", { orderId: input.orderId }),
    });
    if (input.commissionClp !== 0) {
      await this.insert(tx, {
        sellerId: null,
        entryType: "PLATFORM_FEE",
        amountClp: input.commissionClp,
        orderId: input.orderId,
        paymentId: input.paymentId,
        idempotencyKey: ledgerIdempotencyKey("PLATFORM_FEE", { orderId: input.orderId }),
      });
    }
  }

  async recordRefund(
    tx: LedgerTx,
    input: {
      sellerId: string;
      orderId: string;
      paymentId: string;
      refundId: string;
      totalClp: number;
      commissionClp: number;
    },
  ): Promise<void> {
    const net = sellerNetClp(input.totalClp, input.commissionClp);
    await this.insert(tx, {
      sellerId: input.sellerId,
      entryType: "REFUND",
      amountClp: -net,
      orderId: input.orderId,
      paymentId: input.paymentId,
      refundId: input.refundId,
      idempotencyKey: ledgerIdempotencyKey("REFUND", { refundId: input.refundId }),
      metadata: { policy: "full_seller_net" },
    });
  }

  async recordPayoutReserved(tx: LedgerTx, payoutId: string, sellerId: string, amountClp: number): Promise<void> {
    await this.insert(tx, {
      sellerId,
      entryType: "PAYOUT_RESERVED",
      amountClp: -amountClp,
      payoutId,
      idempotencyKey: ledgerIdempotencyKey("PAYOUT_RESERVED", { payoutId }),
    });
  }

  async recordPayoutPaid(tx: LedgerTx, payoutId: string, sellerId: string, amountClp: number): Promise<void> {
    await this.insert(tx, {
      sellerId,
      entryType: "PAYOUT_PAID",
      amountClp,
      payoutId,
      idempotencyKey: ledgerIdempotencyKey("PAYOUT_PAID", { payoutId }),
    });
  }

  async recordPayoutReversed(tx: LedgerTx, payoutId: string, sellerId: string, amountClp: number): Promise<void> {
    await this.insert(tx, {
      sellerId,
      entryType: "PAYOUT_REVERSED",
      amountClp,
      payoutId,
      idempotencyKey: ledgerIdempotencyKey("PAYOUT_REVERSED", { payoutId }),
    });
  }
}
