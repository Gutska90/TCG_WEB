-- Fase 10.7: consentimiento legal, baja de cuenta y feedback beta.
-- No borra Order / Payment / Refund / LedgerEntry / AuditLog.

ALTER TABLE "users"
  ADD COLUMN "terms_version" TEXT,
  ADD COLUMN "privacy_version" TEXT,
  ADD COLUMN "accepted_at" TIMESTAMPTZ(6),
  ADD COLUMN "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletion_requested_at" TIMESTAMPTZ(6);

CREATE TYPE "FeedbackCategory" AS ENUM ('ACCOUNT', 'BUY', 'SELL', 'DISPUTE', 'REFUND', 'ABUSE', 'OTHER');

CREATE TABLE "feedback" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "ip" TEXT,
  "category" "FeedbackCategory" NOT NULL,
  "message" TEXT NOT NULL,
  "screen" TEXT,
  "app_version" TEXT,
  "request_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feedback_created_at_idx" ON "feedback"("created_at");
CREATE INDEX "feedback_user_id_created_at_idx" ON "feedback"("user_id", "created_at");

ALTER TABLE "feedback"
  ADD CONSTRAINT "feedback_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
