-- Fase 12: colección personal (lotes). Una Collection Default por usuario.
-- Listing.source_collection_item_id es trazabilidad; no descuenta stock de colección al completar venta.

CREATE TABLE "collections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "collections_user_id_key" ON "collections"("user_id");

CREATE TABLE "collection_items" (
    "id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "condition" "CardCondition" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchase_price_clp" INTEGER,
    "purchased_at" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "collection_items_collection_id_created_at_idx" ON "collection_items"("collection_id", "created_at");
CREATE INDEX "collection_items_collection_id_variant_id_condition_idx" ON "collection_items"("collection_id", "variant_id", "condition");
CREATE INDEX "collection_items_variant_id_idx" ON "collection_items"("variant_id");

ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "card_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "listings" ADD COLUMN "source_collection_item_id" UUID;
CREATE INDEX "listings_source_collection_item_id_idx" ON "listings"("source_collection_item_id");
ALTER TABLE "listings" ADD CONSTRAINT "listings_source_collection_item_id_fkey" FOREIGN KEY ("source_collection_item_id") REFERENCES "collection_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
