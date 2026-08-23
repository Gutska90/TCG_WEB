import { createHash } from "node:crypto";
import type {
  OrderStatus,
  PaymentStatus,
  ReconciliationIssueType,
  ReconciliationSeverity,
  RefundStatus,
} from "@tcg/config";
import type { ProviderPayment, ProviderRefund } from "../payments/payment-provider";

export type DraftIssue = {
  issueType: ReconciliationIssueType;
  severity: ReconciliationSeverity;
  entityType: string;
  entityId: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  expectedStatus: string | null;
  actualStatus: string | null;
  expectedAmountClp: number | null;
  actualAmountClp: number | null;
  details: Record<string, string | number | boolean | null>;
};

export type LocalPaymentRow = {
  id: string;
  status: PaymentStatus;
  amountClp: number;
  providerPaymentId: string | null;
  checkoutId: string;
  orderId: string;
  orderStatus: OrderStatus;
};

export type LocalRefundRow = {
  id: string;
  paymentId: string;
  status: RefundStatus;
  amountClp: number;
  providerRefundId: string | null;
  providerPaymentId: string | null;
};

export type LocalPayoutRow = {
  id: string;
  status: string;
};

export type LedgerFlags = {
  paymentCaptured: ReadonlySet<string>;
  sellerPayable: ReadonlySet<string>;
  refund: ReadonlySet<string>;
  payoutPaid: ReadonlySet<string>;
};

export function issueFingerprint(issue: DraftIssue): string {
  return createHash("sha256")
    .update(
      [
        issue.issueType,
        issue.entityType,
        issue.entityId ?? "",
        issue.providerPaymentId ?? "",
        issue.providerRefundId ?? "",
        issue.expectedStatus ?? "",
        issue.actualStatus ?? "",
        issue.expectedAmountClp ?? "",
        issue.actualAmountClp ?? "",
      ].join("|"),
    )
    .digest("hex");
}

/** MP approved ≡ interno HELD o RELEASED (Opción A: el dinero ya está en la cuenta plataforma). */
export function paymentStatusCompatible(
  providerStatus: string | undefined,
  local: PaymentStatus,
): boolean {
  const remote = (providerStatus ?? "").toLowerCase();
  if (remote === "approved") return local === "HELD" || local === "RELEASED";
  if (remote === "refunded") return local === "REFUNDED";
  if (remote === "rejected" || remote === "cancelled" || remote === "canceled") {
    return local === "REJECTED";
  }
  if (remote === "pending" || remote === "in_process" || remote === "in_mediation") {
    return local === "PENDING";
  }
  return false;
}

export function comparePayments(input: {
  local: LocalPaymentRow[];
  provider: ProviderPayment[];
  knownCheckoutIds: ReadonlySet<string>;
  providerConfigured: boolean;
}): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const providerById = new Map(input.provider.map((row) => [row.id, row]));
  const localsByProviderId = new Map<string, LocalPaymentRow[]>();

  for (const payment of input.local) {
    if (!payment.providerPaymentId) {
      if (payment.status === "HELD" || payment.status === "RELEASED" || payment.status === "REFUNDED") {
        issues.push(
          draft({
            issueType: "PAYMENT_MISSING_PROVIDER",
            severity: input.providerConfigured ? "CRITICAL" : "WARNING",
            entityType: "Payment",
            entityId: payment.id,
            expectedStatus: payment.status,
            details: { message: "Payment local sin providerPaymentId" },
          }),
        );
      }
      continue;
    }
    const group = localsByProviderId.get(payment.providerPaymentId) ?? [];
    group.push(payment);
    localsByProviderId.set(payment.providerPaymentId, group);
  }

  for (const [providerPaymentId, group] of localsByProviderId) {
    if (group.length > 1) {
      issues.push(
        draft({
          issueType: "DUPLICATE_PROVIDER_PAYMENT",
          severity: "CRITICAL",
          entityType: "Payment",
          entityId: group[0]?.id ?? null,
          providerPaymentId,
          details: { message: "Varios Payment locales con el mismo providerPaymentId", count: group.length },
        }),
      );
    }
    const local = group[0];
    if (!local) continue;
    const remote = providerById.get(providerPaymentId);
    if (!remote) {
      issues.push(
        draft({
          issueType: "PAYMENT_MISSING_PROVIDER",
          severity: "CRITICAL",
          entityType: "Payment",
          entityId: local.id,
          providerPaymentId,
          expectedStatus: local.status,
          details: { message: "Pago local sin contraparte en el proveedor" },
        }),
      );
      continue;
    }
    if (!paymentStatusCompatible(remote.status, local.status)) {
      const critical =
        remote.status?.toLowerCase() === "refunded" ||
        local.status === "REFUNDED" ||
        local.status === "HELD" ||
        local.status === "RELEASED";
      issues.push(
        draft({
          issueType: "PAYMENT_STATUS_MISMATCH",
          severity: critical ? "CRITICAL" : "WARNING",
          entityType: "Payment",
          entityId: local.id,
          providerPaymentId,
          expectedStatus: local.status,
          actualStatus: remote.status ?? null,
          details: { message: "Estado interno distinto al del proveedor" },
        }),
      );
    }
    if (remote.amountClp != null && remote.amountClp !== local.amountClp) {
      issues.push(
        draft({
          issueType: "PAYMENT_AMOUNT_MISMATCH",
          severity: "CRITICAL",
          entityType: "Payment",
          entityId: local.id,
          providerPaymentId,
          expectedAmountClp: local.amountClp,
          actualAmountClp: remote.amountClp,
          details: { message: "Monto local distinto al del proveedor" },
        }),
      );
    }
  }

  for (const remote of input.provider) {
    if (localsByProviderId.has(remote.id)) continue;
    const checkoutId = remote.externalReference;
    const ours = checkoutId != null && input.knownCheckoutIds.has(checkoutId);
    issues.push(
      draft({
        issueType: ours ? "PAYMENT_MISSING_LOCAL" : "UNKNOWN_PROVIDER_PAYMENT",
        severity: "CRITICAL",
        entityType: ours ? "Checkout" : "ProviderPayment",
        entityId: ours ? checkoutId : null,
        providerPaymentId: remote.id,
        actualStatus: remote.status ?? null,
        actualAmountClp: remote.amountClp ?? null,
        details: {
          message: ours
            ? "Pago del proveedor sin Payment local (posible webhook perdido)"
            : "Pago del proveedor sin checkout local",
        },
      }),
    );
  }

  return issues;
}

export function compareRefunds(input: {
  local: LocalRefundRow[];
  provider: ProviderRefund[];
}): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const providerById = new Map(input.provider.map((row) => [row.id, row]));
  const matchedProviderIds = new Set<string>();

  for (const local of input.local) {
    const remote =
      (local.providerRefundId ? providerById.get(local.providerRefundId) : undefined) ??
      input.provider.find(
        (row) =>
          row.providerPaymentId === local.providerPaymentId &&
          row.amountClp === local.amountClp &&
          !matchedProviderIds.has(row.id),
      );

    if (remote) {
      matchedProviderIds.add(remote.id);
      const remoteNorm = normalizeRefundStatus(remote.status);
      if (local.status === "COMPLETED" && remoteNorm !== "approved") {
        issues.push(
          draft({
            issueType: "REFUND_STATUS_MISMATCH",
            severity: "CRITICAL",
            entityType: "Refund",
            entityId: local.id,
            providerPaymentId: local.providerPaymentId,
            providerRefundId: remote.id,
            expectedStatus: local.status,
            actualStatus: remote.status,
            details: { message: "Refund COMPLETED local sin aprobación en el proveedor" },
          }),
        );
      }
      if (local.status === "FAILED" && remoteNorm === "approved") {
        issues.push(
          draft({
            issueType: "REFUND_STATUS_MISMATCH",
            severity: "CRITICAL",
            entityType: "Refund",
            entityId: local.id,
            providerPaymentId: local.providerPaymentId,
            providerRefundId: remote.id,
            expectedStatus: local.status,
            actualStatus: remote.status,
            details: { message: "Refund FAILED local con reembolso aprobado en el proveedor" },
          }),
        );
      }
      if (local.status === "PENDING" && remoteNorm === "approved") {
        issues.push(
          draft({
            issueType: "REFUND_STATUS_MISMATCH",
            severity: "WARNING",
            entityType: "Refund",
            entityId: local.id,
            providerPaymentId: local.providerPaymentId,
            providerRefundId: remote.id,
            expectedStatus: local.status,
            actualStatus: remote.status,
            details: { message: "Refund PENDING local con reembolso ya aprobado en el proveedor" },
          }),
        );
      }
      if (remote.amountClp !== local.amountClp) {
        issues.push(
          draft({
            issueType: "REFUND_AMOUNT_MISMATCH",
            severity: "CRITICAL",
            entityType: "Refund",
            entityId: local.id,
            providerPaymentId: local.providerPaymentId,
            providerRefundId: remote.id,
            expectedAmountClp: local.amountClp,
            actualAmountClp: remote.amountClp,
            details: { message: "Monto de refund distinto al del proveedor" },
          }),
        );
      }
      continue;
    }

    if (local.status === "COMPLETED") {
      issues.push(
        draft({
          issueType: "REFUND_MISSING_PROVIDER",
          severity: "CRITICAL",
          entityType: "Refund",
          entityId: local.id,
          providerPaymentId: local.providerPaymentId,
          providerRefundId: local.providerRefundId,
          expectedStatus: local.status,
          expectedAmountClp: local.amountClp,
          details: { message: "Refund COMPLETED sin contraparte en el proveedor" },
        }),
      );
    }
  }

  for (const remote of input.provider) {
    if (matchedProviderIds.has(remote.id)) continue;
    issues.push(
      draft({
        issueType: "REFUND_MISSING_LOCAL",
        severity: "CRITICAL",
        entityType: "ProviderRefund",
        entityId: null,
        providerPaymentId: remote.providerPaymentId,
        providerRefundId: remote.id,
        actualStatus: remote.status,
        actualAmountClp: remote.amountClp,
        details: { message: "Refund del proveedor sin fila local" },
      }),
    );
  }

  return issues;
}

export function compareLedger(input: {
  payments: LocalPaymentRow[];
  refunds: LocalRefundRow[];
  payouts: LocalPayoutRow[];
  ledger: LedgerFlags;
}): DraftIssue[] {
  const issues: DraftIssue[] = [];

  for (const payment of input.payments) {
    if (payment.status === "HELD" || payment.status === "RELEASED") {
      if (!input.ledger.paymentCaptured.has(payment.id)) {
        issues.push(
          draft({
            issueType: "LEDGER_MISSING_PAYMENT_CAPTURED",
            severity: "CRITICAL",
            entityType: "Payment",
            entityId: payment.id,
            providerPaymentId: payment.providerPaymentId,
            expectedStatus: "PAYMENT_CAPTURED",
            details: { message: "Payment HELD/RELEASED sin asiento PAYMENT_CAPTURED" },
          }),
        );
      }
    }
    if (payment.status === "RELEASED" && payment.orderStatus === "COMPLETED") {
      if (!input.ledger.sellerPayable.has(payment.orderId)) {
        issues.push(
          draft({
            issueType: "LEDGER_MISSING_SELLER_PAYABLE",
            severity: "CRITICAL",
            entityType: "Order",
            entityId: payment.orderId,
            providerPaymentId: payment.providerPaymentId,
            expectedStatus: "SELLER_PAYABLE",
            details: { message: "Order COMPLETED + Payment RELEASED sin SELLER_PAYABLE" },
          }),
        );
      }
    }
  }

  for (const refund of input.refunds) {
    if (refund.status === "COMPLETED" && !input.ledger.refund.has(refund.id)) {
      issues.push(
        draft({
          issueType: "LEDGER_MISSING_REFUND",
          severity: "CRITICAL",
          entityType: "Refund",
          entityId: refund.id,
          providerPaymentId: refund.providerPaymentId,
          expectedStatus: "REFUND",
          details: { message: "Refund COMPLETED sin asiento REFUND" },
        }),
      );
    }
  }

  for (const payout of input.payouts) {
    if (payout.status === "PAID" && !input.ledger.payoutPaid.has(payout.id)) {
      issues.push(
        draft({
          issueType: "PAYOUT_LEDGER_MISMATCH",
          severity: "CRITICAL",
          entityType: "Payout",
          entityId: payout.id,
          expectedStatus: "PAYOUT_PAID",
          actualStatus: payout.status,
          details: { message: "Payout PAID sin asiento PAYOUT_PAID" },
        }),
      );
    }
  }

  return issues;
}

function normalizeRefundStatus(status: string): "approved" | "pending" | "rejected" {
  const value = status.toLowerCase();
  if (value === "approved") return "approved";
  if (value === "rejected" || value === "cancelled" || value === "canceled") return "rejected";
  return "pending";
}

function draft(
  issue: Omit<
    DraftIssue,
    "entityId" | "providerPaymentId" | "providerRefundId" | "expectedStatus" | "actualStatus" | "expectedAmountClp" | "actualAmountClp"
  > &
    Partial<
      Pick<
        DraftIssue,
        | "entityId"
        | "providerPaymentId"
        | "providerRefundId"
        | "expectedStatus"
        | "actualStatus"
        | "expectedAmountClp"
        | "actualAmountClp"
      >
    >,
): DraftIssue {
  return {
    ...issue,
    entityId: issue.entityId ?? null,
    providerPaymentId: issue.providerPaymentId ?? null,
    providerRefundId: issue.providerRefundId ?? null,
    expectedStatus: issue.expectedStatus ?? null,
    actualStatus: issue.actualStatus ?? null,
    expectedAmountClp: issue.expectedAmountClp ?? null,
    actualAmountClp: issue.actualAmountClp ?? null,
  };
}

export type LocalOrderFeeRow = {
  id: string;
  status: OrderStatus;
  commissionClp: number;
  marketplaceFeePolicyVersion: string | null;
};

export function comparePlatformFeeSnapshots(input: {
  orders: LocalOrderFeeRow[];
  platformFeeByOrderId: ReadonlyMap<string, number>;
}): DraftIssue[] {
  const issues: DraftIssue[] = [];
  for (const order of input.orders) {
    if (order.status !== "COMPLETED" || !order.marketplaceFeePolicyVersion) continue;
    const posted = input.platformFeeByOrderId.get(order.id);
    if (posted === undefined) continue;
    if (posted !== order.commissionClp) {
      issues.push(
        draft({
          issueType: "PLATFORM_FEE_SNAPSHOT_MISMATCH",
          severity: "CRITICAL",
          entityType: "Order",
          entityId: order.id,
          expectedAmountClp: order.commissionClp,
          actualAmountClp: posted,
          details: {
            message: "PLATFORM_FEE del ledger no coincide con el snapshot de la Order. No se corrige en automático.",
          },
        }),
      );
    }
  }
  return issues;
}
