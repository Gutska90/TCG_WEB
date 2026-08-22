-- Fase 10.5: disputes, reports, listing revisions, moderation, seller suspension.
-- No mueve dinero. SupportCase no se crea.

CREATE TYPE "DisputeReason" AS ENUM (
  'ITEM_NOT_RECEIVED',
  'WRONG_ITEM',
  'WRONG_CONDITION',
  'DAMAGED',
  'COUNTERFEIT_SUSPECTED',
  'SELLER_UNRESPONSIVE',
  'OTHER'
);
CREATE TYPE "DisputeStatus" AS ENUM (
  'OPEN',
  'WAITING_BUYER',
  'WAITING_SELLER',
  'UNDER_REVIEW',
  'RESOLVED_BUYER',
  'RESOLVED_SELLER',
  'CANCELLED'
);
CREATE TYPE "DisputeEvidenceType" AS ENUM ('PHOTO', 'VIDEO', 'DOCUMENT', 'OTHER');
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'LISTING', 'IMAGE');
CREATE TYPE "ReportReason" AS ENUM (
  'COUNTERFEIT',
  'STOLEN_IMAGE',
  'SPAM',
  'MISLEADING_DESCRIPTION',
  'SCAM_SUSPECTED',
  'ABUSIVE_CONTENT',
  'OTHER'
);
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');
CREATE TYPE "ListingRevisionSource" AS ENUM ('SELLER', 'ADMIN', 'SYSTEM');
CREATE TYPE "ModerationActionType" AS ENUM (
  'LISTING_PAUSED',
  'LISTING_RESTORED',
  'USER_WARNED',
  'SELLER_SUSPENDED',
  'SELLER_RESTORED',
  'REPORT_RESOLVED',
  'DISPUTE_ASSIGNED',
  'DISPUTE_RESOLVED'
);

CREATE TABLE "disputes" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "opened_by_id" UUID NOT NULL,
  "buyer_id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "assigned_admin_id" UUID,
  "reason" "DisputeReason" NOT NULL,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "resolution" TEXT,
  "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "disputes_order_id_idx" ON "disputes"("order_id");
CREATE INDEX "disputes_status_opened_at_idx" ON "disputes"("status", "opened_at");
CREATE INDEX "disputes_assigned_admin_id_idx" ON "disputes"("assigned_admin_id");
CREATE UNIQUE INDEX "disputes_one_active_per_order"
  ON "disputes"("order_id")
  WHERE "status" IN ('OPEN', 'WAITING_BUYER', 'WAITING_SELLER', 'UNDER_REVIEW');

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_assigned_admin_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "dispute_messages" (
  "id" UUID NOT NULL,
  "dispute_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "is_internal_admin_note" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dispute_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dispute_messages_dispute_id_created_at_idx" ON "dispute_messages"("dispute_id", "created_at");
ALTER TABLE "dispute_messages"
  ADD CONSTRAINT "dispute_messages_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispute_messages"
  ADD CONSTRAINT "dispute_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "dispute_evidence" (
  "id" UUID NOT NULL,
  "dispute_id" UUID NOT NULL,
  "uploaded_by_id" UUID NOT NULL,
  "file_id" UUID NOT NULL,
  "evidence_type" "DisputeEvidenceType" NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dispute_evidence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dispute_evidence_dispute_id_idx" ON "dispute_evidence"("dispute_id");
ALTER TABLE "dispute_evidence"
  ADD CONSTRAINT "dispute_evidence_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispute_evidence"
  ADD CONSTRAINT "dispute_evidence_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispute_evidence"
  ADD CONSTRAINT "dispute_evidence_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "reports" (
  "id" UUID NOT NULL,
  "reporter_id" UUID NOT NULL,
  "target_type" "ReportTargetType" NOT NULL,
  "target_id" UUID NOT NULL,
  "reason" "ReportReason" NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "assigned_admin_id" UUID,
  "resolved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");
CREATE INDEX "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");
CREATE INDEX "reports_reporter_id_created_at_idx" ON "reports"("reporter_id", "created_at");
CREATE UNIQUE INDEX "reports_open_duplicate"
  ON "reports"("reporter_id", "target_type", "target_id", "reason")
  WHERE "status" IN ('OPEN', 'IN_REVIEW');
ALTER TABLE "reports"
  ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reports"
  ADD CONSTRAINT "reports_assigned_admin_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "listing_revisions" (
  "id" UUID NOT NULL,
  "listing_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "source" "ListingRevisionSource" NOT NULL,
  "reason" TEXT NOT NULL DEFAULT '',
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "listing_revisions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "listing_revisions_listing_id_created_at_idx" ON "listing_revisions"("listing_id", "created_at");
ALTER TABLE "listing_revisions"
  ADD CONSTRAINT "listing_revisions_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listing_revisions"
  ADD CONSTRAINT "listing_revisions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "moderation_actions" (
  "id" UUID NOT NULL,
  "actor_admin_id" UUID NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" UUID NOT NULL,
  "action_type" "ModerationActionType" NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "moderation_actions_target_type_target_id_created_at_idx"
  ON "moderation_actions"("target_type", "target_id", "created_at");
CREATE INDEX "moderation_actions_actor_admin_id_created_at_idx"
  ON "moderation_actions"("actor_admin_id", "created_at");
ALTER TABLE "moderation_actions"
  ADD CONSTRAINT "moderation_actions_actor_admin_id_fkey" FOREIGN KEY ("actor_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "seller_suspensions" (
  "id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "created_by_id" UUID NOT NULL,
  "lifted_at" TIMESTAMPTZ(6),
  "lifted_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_suspensions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "seller_suspensions_seller_id_created_at_idx" ON "seller_suspensions"("seller_id", "created_at");
CREATE UNIQUE INDEX "seller_suspensions_one_active"
  ON "seller_suspensions"("seller_id")
  WHERE "lifted_at" IS NULL;
ALTER TABLE "seller_suspensions"
  ADD CONSTRAINT "seller_suspensions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seller_suspensions"
  ADD CONSTRAINT "seller_suspensions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seller_suspensions"
  ADD CONSTRAINT "seller_suspensions_lifted_by_id_fkey" FOREIGN KEY ("lifted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION trust_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listing_revisions_no_update
  BEFORE UPDATE ON "listing_revisions"
  FOR EACH ROW EXECUTE FUNCTION trust_append_only();
CREATE TRIGGER dispute_evidence_no_update
  BEFORE UPDATE ON "dispute_evidence"
  FOR EACH ROW EXECUTE FUNCTION trust_append_only();
CREATE TRIGGER moderation_actions_no_update
  BEFORE UPDATE ON "moderation_actions"
  FOR EACH ROW EXECUTE FUNCTION trust_append_only();
