-- CatalogSubmission (canonical card proposals) + explicit public WhatsApp on Profile.
-- Address.phone remains private and is not copied here.

CREATE TYPE "CatalogSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DUPLICATE', 'NEEDS_INFO');

ALTER TABLE "profiles"
  ADD COLUMN "contact_whatsapp" TEXT,
  ADD COLUMN "contact_whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "catalog_submissions" (
    "id" UUID NOT NULL,
    "submitted_by_id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "set_id" UUID,
    "proposed_set_name" TEXT,
    "name" TEXT NOT NULL,
    "number" TEXT,
    "rarity" TEXT,
    "supertype" TEXT,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "image_url" TEXT,
    "notes" TEXT,
    "source_url" TEXT,
    "status" "CatalogSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_notes" TEXT,
    "approved_card_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "catalog_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalog_submissions_approved_card_id_key" ON "catalog_submissions"("approved_card_id");
CREATE INDEX "catalog_submissions_submitted_by_id_created_at_idx" ON "catalog_submissions"("submitted_by_id", "created_at");
CREATE INDEX "catalog_submissions_status_created_at_idx" ON "catalog_submissions"("status", "created_at");
CREATE INDEX "catalog_submissions_game_id_status_idx" ON "catalog_submissions"("game_id", "status");

ALTER TABLE "catalog_submissions" ADD CONSTRAINT "catalog_submissions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog_submissions" ADD CONSTRAINT "catalog_submissions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "catalog_submissions" ADD CONSTRAINT "catalog_submissions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "tcg_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog_submissions" ADD CONSTRAINT "catalog_submissions_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "catalog_submissions" ADD CONSTRAINT "catalog_submissions_approved_card_id_fkey" FOREIGN KEY ("approved_card_id") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
