import { Prisma } from "@prisma/client";
import { LedgerService } from "./ledger.service";

export type LedgerBackfillSummary = {
  inspectedOrders: number;
  captureInserted: number;
  payableInserted: number;
  feeInserted: number;
  refundInserted: number;
  skippedDuplicates: number;
};

type BackfillClient = {
  order: {
    findMany: (args: {
      where: Prisma.OrderWhereInput;
      select: {
        id: true;
        sellerId: true;
        totalClp: true;
        commissionClp: true;
        status: true;
        payment: {
          select: {
            id: true;
            status: true;
            refunds: { select: { id: true; status: true } };
          };
        };
      };
    }) => Promise<
      Array<{
        id: string;
        sellerId: string;
        totalClp: number;
        commissionClp: number;
        status: string;
        payment: {
          id: string;
          status: string;
          refunds: Array<{ id: string; status: string }>;
        } | null;
      }>
    >;
  };
  $transaction: <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>;
};

export async function backfillLedger(
  prisma: BackfillClient,
  ledger: LedgerService,
): Promise<LedgerBackfillSummary> {
  const summary: LedgerBackfillSummary = {
    inspectedOrders: 0,
    captureInserted: 0,
    payableInserted: 0,
    feeInserted: 0,
    refundInserted: 0,
    skippedDuplicates: 0,
  };

  const orders = await prisma.order.findMany({
    where: {
      payment: { status: { in: ["HELD", "RELEASED", "REFUNDED"] } },
    },
    select: {
      id: true,
      sellerId: true,
      totalClp: true,
      commissionClp: true,
      status: true,
      payment: {
        select: {
          id: true,
          status: true,
          refunds: { select: { id: true, status: true } },
        },
      },
    },
  });

  for (const order of orders) {
    const payment = order.payment;
    if (!payment) continue;
    summary.inspectedOrders += 1;

    await prisma.$transaction(async (tx) => {
      const capture = await ledger.insert(tx, {
        sellerId: order.sellerId,
        entryType: "PAYMENT_CAPTURED",
        amountClp: order.totalClp - order.commissionClp,
        orderId: order.id,
        paymentId: payment.id,
        idempotencyKey: `order:${order.id}:PAYMENT_CAPTURED`,
        metadata: { totalClp: order.totalClp, commissionClp: order.commissionClp, source: "backfill" },
      });
      if (capture === "inserted") summary.captureInserted += 1;
      else summary.skippedDuplicates += 1;

      const shouldRelease = order.status === "COMPLETED" || payment.status === "RELEASED";
      if (shouldRelease) {
        const payable = await ledger.insert(tx, {
          sellerId: order.sellerId,
          entryType: "SELLER_PAYABLE",
          amountClp: order.totalClp - order.commissionClp,
          orderId: order.id,
          paymentId: payment.id,
          idempotencyKey: `order:${order.id}:SELLER_PAYABLE`,
          metadata: { source: "backfill" },
        });
        if (payable === "inserted") summary.payableInserted += 1;
        else summary.skippedDuplicates += 1;

        if (order.commissionClp !== 0) {
          const fee = await ledger.insert(tx, {
            sellerId: null,
            entryType: "PLATFORM_FEE",
            amountClp: order.commissionClp,
            orderId: order.id,
            paymentId: payment.id,
            idempotencyKey: `order:${order.id}:PLATFORM_FEE`,
            metadata: { source: "backfill" },
          });
          if (fee === "inserted") summary.feeInserted += 1;
          else summary.skippedDuplicates += 1;
        }
      }

      for (const refund of payment.refunds) {
        if (refund.status !== "COMPLETED") continue;
        const posted = await ledger.insert(tx, {
          sellerId: order.sellerId,
          entryType: "REFUND",
          amountClp: -(order.totalClp - order.commissionClp),
          orderId: order.id,
          paymentId: payment.id,
          refundId: refund.id,
          idempotencyKey: `refund:${refund.id}:REFUND`,
          metadata: { source: "backfill", policy: "full_seller_net" },
        });
        if (posted === "inserted") summary.refundInserted += 1;
        else summary.skippedDuplicates += 1;
      }
    });
  }

  return summary;
}
