-- Fase 10C: ledger append-only, PayoutItem, estados de payout ampliados.

CREATE TYPE "PayoutMethod" AS ENUM ('MANUAL');

CREATE TYPE "PayoutStatus_new" AS ENUM (
  'PENDING',
  'APPROVED',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED'
);

ALTER TABLE "payouts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payouts"
  ALTER COLUMN "status" TYPE "PayoutStatus_new"
  USING ("status"::text::"PayoutStatus_new");
DROP TYPE "PayoutStatus";
ALTER TYPE "PayoutStatus_new" RENAME TO "PayoutStatus";
ALTER TABLE "payouts" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "payouts"
  ADD COLUMN "method" "PayoutMethod" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "approved_by_id" UUID,
  ADD COLUMN "approved_at" TIMESTAMPTZ(6),
  ADD COLUMN "paid_at" TIMESTAMPTZ(6),
  ADD COLUMN "last_error" TEXT;

ALTER TABLE "payouts"
  ADD CONSTRAINT "payouts_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payouts"
  ADD CONSTRAINT "payouts_paid_requires_provider_ref"
  CHECK (
    "status" <> 'PAID'
    OR ("provider_ref" IS NOT NULL AND length(btrim("provider_ref")) > 0)
  );

CREATE TYPE "LedgerEntryType" AS ENUM (
  'PAYMENT_CAPTURED',
  'SELLER_PAYABLE',
  'PLATFORM_FEE',
  'REFUND',
  'PAYOUT_RESERVED',
  'PAYOUT_PAID',
  'PAYOUT_REVERSED',
  'ADJUSTMENT'
);

CREATE TABLE "payout_items" (
  "id" UUID NOT NULL,
  "payout_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "gross_clp" INTEGER NOT NULL,
  "commission_clp" INTEGER NOT NULL,
  "net_clp" INTEGER NOT NULL,
  "locks_order" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payout_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payout_items"
  ADD CONSTRAINT "payout_items_net_matches_gross"
  CHECK ("net_clp" = "gross_clp" - "commission_clp");

ALTER TABLE "payout_items"
  ADD CONSTRAINT "payout_items_net_non_negative"
  CHECK ("net_clp" >= 0);

ALTER TABLE "payout_items"
  ADD CONSTRAINT "payout_items_gross_positive"
  CHECK ("gross_clp" > 0);

CREATE INDEX "payout_items_payout_id_idx" ON "payout_items"("payout_id");
CREATE INDEX "payout_items_seller_id_idx" ON "payout_items"("seller_id");

-- Una obligación no puede vivir en dos payouts activos (locks_order = true).
CREATE UNIQUE INDEX "payout_items_order_live_key"
  ON "payout_items"("order_id")
  WHERE "locks_order";

ALTER TABLE "payout_items"
  ADD CONSTRAINT "payout_items_payout_id_fkey"
  FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payout_items"
  ADD CONSTRAINT "payout_items_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payout_items"
  ADD CONSTRAINT "payout_items_seller_id_fkey"
  FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ledger_entries" (
  "id" UUID NOT NULL,
  "seller_id" UUID,
  "entry_type" "LedgerEntryType" NOT NULL,
  "amount_clp" INTEGER NOT NULL,
  "order_id" UUID,
  "payment_id" UUID,
  "refund_id" UUID,
  "payout_id" UUID,
  "idempotency_key" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ledger_entries_idempotency_key_key" ON "ledger_entries"("idempotency_key");
CREATE INDEX "ledger_entries_seller_id_created_at_idx" ON "ledger_entries"("seller_id", "created_at");
CREATE INDEX "ledger_entries_entry_type_created_at_idx" ON "ledger_entries"("entry_type", "created_at");
CREATE INDEX "ledger_entries_order_id_idx" ON "ledger_entries"("order_id");
CREATE INDEX "ledger_entries_payment_id_idx" ON "ledger_entries"("payment_id");
CREATE INDEX "ledger_entries_refund_id_idx" ON "ledger_entries"("refund_id");
CREATE INDEX "ledger_entries_payout_id_idx" ON "ledger_entries"("payout_id");

CREATE UNIQUE INDEX "ledger_entries_order_capture_key"
  ON "ledger_entries"("order_id")
  WHERE "entry_type" = 'PAYMENT_CAPTURED' AND "order_id" IS NOT NULL;

CREATE UNIQUE INDEX "ledger_entries_order_payable_key"
  ON "ledger_entries"("order_id")
  WHERE "entry_type" = 'SELLER_PAYABLE' AND "order_id" IS NOT NULL;

CREATE UNIQUE INDEX "ledger_entries_order_fee_key"
  ON "ledger_entries"("order_id")
  WHERE "entry_type" = 'PLATFORM_FEE' AND "order_id" IS NOT NULL;

CREATE UNIQUE INDEX "ledger_entries_refund_key"
  ON "ledger_entries"("refund_id")
  WHERE "entry_type" = 'REFUND' AND "refund_id" IS NOT NULL;

CREATE UNIQUE INDEX "ledger_entries_payout_type_key"
  ON "ledger_entries"("payout_id", "entry_type")
  WHERE "payout_id" IS NOT NULL
    AND "entry_type" IN ('PAYOUT_RESERVED', 'PAYOUT_PAID', 'PAYOUT_REVERSED');

ALTER TABLE "ledger_entries"
  ADD CONSTRAINT "ledger_entries_seller_id_fkey"
  FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ledger_entries"
  ADD CONSTRAINT "ledger_entries_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ledger_entries"
  ADD CONSTRAINT "ledger_entries_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ledger_entries"
  ADD CONSTRAINT "ledger_entries_refund_id_fkey"
  FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ledger_entries"
  ADD CONSTRAINT "ledger_entries_payout_id_fkey"
  FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION ledger_entries_no_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_no_update
  BEFORE UPDATE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION ledger_entries_no_update();
