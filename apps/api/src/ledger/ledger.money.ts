import type { LedgerEntryType } from "@tcg/config";

export function assertIntegerClp(amountClp: number, field = "amountClp"): void {
  if (!Number.isInteger(amountClp)) {
    throw new Error(`${field} must be an integer CLP amount`);
  }
}

export function sellerNetClp(totalClp: number, commissionClp: number): number {
  assertIntegerClp(totalClp, "totalClp");
  assertIntegerClp(commissionClp, "commissionClp");
  const net = totalClp - commissionClp;
  assertIntegerClp(net, "netClp");
  return net;
}

export function ledgerIdempotencyKey(
  entryType: LedgerEntryType,
  refs: {
    orderId?: string | null;
    paymentId?: string | null;
    refundId?: string | null;
    payoutId?: string | null;
    adjustmentId?: string | null;
  },
): string {
  switch (entryType) {
    case "PAYMENT_CAPTURED":
      return `order:${refs.orderId}:PAYMENT_CAPTURED`;
    case "SELLER_PAYABLE":
      return `order:${refs.orderId}:SELLER_PAYABLE`;
    case "PLATFORM_FEE":
      return `order:${refs.orderId}:PLATFORM_FEE`;
    case "REFUND":
      return `refund:${refs.refundId}:REFUND`;
    case "PAYOUT_RESERVED":
      return `payout:${refs.payoutId}:PAYOUT_RESERVED`;
    case "PAYOUT_PAID":
      return `payout:${refs.payoutId}:PAYOUT_PAID`;
    case "PAYOUT_REVERSED":
      return `payout:${refs.payoutId}:PAYOUT_REVERSED`;
    case "ADJUSTMENT":
      return `adjustment:${refs.adjustmentId}:ADJUSTMENT`;
  }
}
