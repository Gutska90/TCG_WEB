-- Fase 10D: conciliación MP vs Postgres. No muta dinero.

CREATE TYPE "ReconciliationRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "ReconciliationIssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED');
CREATE TYPE "ReconciliationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "ReconciliationIssueType" AS ENUM (
  'PAYMENT_MISSING_LOCAL',
  'PAYMENT_MISSING_PROVIDER',
  'PAYMENT_STATUS_MISMATCH',
  'PAYMENT_AMOUNT_MISMATCH',
  'REFUND_MISSING_LOCAL',
  'REFUND_MISSING_PROVIDER',
  'REFUND_STATUS_MISMATCH',
  'REFUND_AMOUNT_MISMATCH',
  'UNKNOWN_PROVIDER_PAYMENT',
  'DUPLICATE_PROVIDER_PAYMENT',
  'LEDGER_MISSING_PAYMENT_CAPTURED',
  'LEDGER_MISSING_SELLER_PAYABLE',
  'LEDGER_MISSING_REFUND',
  'PAYOUT_LEDGER_MISMATCH'
);

CREATE TABLE "reconciliation_runs" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(6),
  "status" "ReconciliationRunStatus" NOT NULL DEFAULT 'RUNNING',
  "checked_payments" INTEGER NOT NULL DEFAULT 0,
  "checked_refunds" INTEGER NOT NULL DEFAULT 0,
  "issues_found" INTEGER NOT NULL DEFAULT 0,
  "critical_issues" INTEGER NOT NULL DEFAULT 0,
  "created_by_id" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reconciliation_runs_provider_started_at_idx"
  ON "reconciliation_runs"("provider", "started_at");

-- Un run activo por proveedor (pool-safe; no advisory lock de sesión).
CREATE UNIQUE INDEX "reconciliation_runs_one_running"
  ON "reconciliation_runs"("provider")
  WHERE "status" = 'RUNNING';

ALTER TABLE "reconciliation_runs"
  ADD CONSTRAINT "reconciliation_runs_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "reconciliation_issues" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "issue_type" "ReconciliationIssueType" NOT NULL,
  "severity" "ReconciliationSeverity" NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID,
  "provider_payment_id" TEXT,
  "provider_refund_id" TEXT,
  "expected_status" TEXT,
  "actual_status" TEXT,
  "expected_amount_clp" INTEGER,
  "actual_amount_clp" INTEGER,
  "fingerprint" TEXT NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}',
  "status" "ReconciliationIssueStatus" NOT NULL DEFAULT 'OPEN',
  "resolved_at" TIMESTAMPTZ(6),
  "resolved_by_id" UUID,
  "resolution_note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reconciliation_issues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reconciliation_issues_run_id_idx" ON "reconciliation_issues"("run_id");
CREATE INDEX "reconciliation_issues_status_severity_created_at_idx"
  ON "reconciliation_issues"("status", "severity", "created_at");
CREATE INDEX "reconciliation_issues_issue_type_created_at_idx"
  ON "reconciliation_issues"("issue_type", "created_at");
CREATE INDEX "reconciliation_issues_fingerprint_idx" ON "reconciliation_issues"("fingerprint");

CREATE UNIQUE INDEX "reconciliation_issues_open_fingerprint"
  ON "reconciliation_issues"("fingerprint")
  WHERE "status" = 'OPEN';

ALTER TABLE "reconciliation_issues"
  ADD CONSTRAINT "reconciliation_issues_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "reconciliation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reconciliation_issues"
  ADD CONSTRAINT "reconciliation_issues_resolved_by_id_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
