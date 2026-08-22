import {
  LISTING_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
  RECONCILIATION_ISSUE_STATUS_LABELS,
  RECONCILIATION_SEVERITY_LABELS,
  DISPUTE_STATUS_LABELS,
  REPORT_STATUS_LABELS,
  REFUND_STATUS_LABELS,
  JOB_RUN_STATUS_LABELS,
  type ListingStatus,
  type OrderStatus,
  type PaymentStatus,
  type PayoutStatus,
  type ReconciliationIssueStatus,
  type ReconciliationSeverity,
  type RefundStatus,
  type DisputeStatus,
  type ReportStatus,
  type JobRunStatus,
} from "@tcg/config";

const TONE: Record<string, string> = {
  HELD: "bg-amber-900 text-amber-100",
  RELEASED: "bg-emerald-900 text-emerald-100",
  REFUNDED: "bg-slate-700 text-slate-100",
  FAILED: "bg-red-900 text-red-100",
  PENDING: "bg-neutral-700 text-neutral-100",
  PENDING_PAYMENT: "bg-neutral-700 text-neutral-100",
  APPROVED: "bg-sky-900 text-sky-100",
  PROCESSING: "bg-amber-900 text-amber-100",
  PAID: "bg-sky-900 text-sky-100",
  PREPARING: "bg-sky-900 text-sky-100",
  SHIPPED: "bg-sky-900 text-sky-100",
  DISPUTED: "bg-red-900 text-red-100",
  CANCELLED: "bg-neutral-800 text-neutral-300",
  COMPLETED: "bg-emerald-900 text-emerald-100",
  ACTIVE: "bg-emerald-900 text-emerald-100",
  PAUSED: "bg-amber-900 text-amber-100",
  SOLD: "bg-slate-700 text-slate-100",
  DRAFT: "bg-neutral-700 text-neutral-100",
  OPEN: "bg-red-900 text-red-100",
  ACKNOWLEDGED: "bg-amber-900 text-amber-100",
  RESOLVED: "bg-emerald-900 text-emerald-100",
  IGNORED: "bg-neutral-800 text-neutral-300",
  CRITICAL: "bg-red-900 text-red-100",
  WARNING: "bg-amber-900 text-amber-100",
  INFO: "bg-sky-900 text-sky-100",
  RUNNING: "bg-amber-900 text-amber-100",
  WAITING_BUYER: "bg-amber-900 text-amber-100",
  WAITING_SELLER: "bg-amber-900 text-amber-100",
  UNDER_REVIEW: "bg-sky-900 text-sky-100",
  RESOLVED_BUYER: "bg-emerald-900 text-emerald-100",
  RESOLVED_SELLER: "bg-emerald-900 text-emerald-100",
  IN_REVIEW: "bg-sky-900 text-sky-100",
  SKIPPED: "bg-neutral-800 text-neutral-300",
};

function Badge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${TONE[status] ?? "bg-neutral-800 text-neutral-200"}`}>
      {label}
    </span>
  );
}

export function OrderBadge({ status }: { status: OrderStatus }) {
  return <Badge status={status} label={ORDER_STATUS_LABELS[status]} />;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge status={status} label={PAYMENT_STATUS_LABELS[status]} />;
}

export function RefundBadge({ status }: { status: RefundStatus }) {
  return <Badge status={status} label={REFUND_STATUS_LABELS[status]} />;
}

export function PayoutBadge({ status }: { status: PayoutStatus }) {
  return <Badge status={status} label={PAYOUT_STATUS_LABELS[status]} />;
}

export function ListingBadge({ status }: { status: ListingStatus }) {
  return <Badge status={status} label={LISTING_STATUS_LABELS[status]} />;
}

export function ReconSeverityBadge({ severity }: { severity: ReconciliationSeverity }) {
  return <Badge status={severity} label={RECONCILIATION_SEVERITY_LABELS[severity]} />;
}

export function ReconIssueStatusBadge({ status }: { status: ReconciliationIssueStatus }) {
  return <Badge status={status} label={RECONCILIATION_ISSUE_STATUS_LABELS[status]} />;
}

export function DisputeBadge({ status }: { status: DisputeStatus }) {
  return <Badge status={status} label={DISPUTE_STATUS_LABELS[status]} />;
}

export function ReportBadge({ status }: { status: ReportStatus }) {
  return <Badge status={status} label={REPORT_STATUS_LABELS[status]} />;
}

export function JobBadge({ status }: { status: JobRunStatus }) {
  return <Badge status={status} label={JOB_RUN_STATUS_LABELS[status]} />;
}
