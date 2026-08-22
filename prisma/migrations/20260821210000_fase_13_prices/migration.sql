-- Fase 13: un CardPrice por (variante, source, día UTC). Snapshot diario de valor de colección.

ALTER TABLE "card_prices" ADD COLUMN "captured_on" DATE;

UPDATE "card_prices"
SET "captured_on" = (("captured_at" AT TIME ZONE 'UTC')::date)
WHERE "captured_on" IS NULL;

DELETE FROM "card_prices" a
USING "card_prices" b
WHERE a."variant_id" = b."variant_id"
  AND a."source" = b."source"
  AND a."captured_on" = b."captured_on"
  AND a."ctid" < b."ctid";

ALTER TABLE "card_prices" ALTER COLUMN "captured_on" SET NOT NULL;

CREATE UNIQUE INDEX "card_prices_variant_id_source_captured_on_key"
  ON "card_prices"("variant_id", "source", "captured_on");

CREATE TABLE "collection_value_snapshots" (
    "id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "captured_on" DATE NOT NULL,
    "value_clp" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_value_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "collection_value_snapshots_collection_id_captured_on_key"
  ON "collection_value_snapshots"("collection_id", "captured_on");
CREATE INDEX "collection_value_snapshots_captured_on_idx"
  ON "collection_value_snapshots"("captured_on");

ALTER TABLE "collection_value_snapshots"
  ADD CONSTRAINT "collection_value_snapshots_collection_id_fkey"
  FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");
