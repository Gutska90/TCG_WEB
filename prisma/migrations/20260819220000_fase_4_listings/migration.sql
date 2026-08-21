CREATE TYPE "CardCondition" AS ENUM ('NM', 'LP', 'MP', 'HP', 'DMG');
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'SOLD', 'CANCELLED');
CREATE TYPE "ProductType" AS ENUM ('SINGLE', 'SEALED', 'ACCESSORY');

CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Principal',
    "recipient_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "comuna" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "postal_code" TEXT,
    "is_default_shipping" BOOLEAN NOT NULL DEFAULT false,
    "is_default_billing" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "store_id" UUID,
    "variant_id" UUID,
    "product_type" "ProductType" NOT NULL DEFAULT 'SINGLE',
    "title" TEXT NOT NULL,
    "condition" "CardCondition",
    "quantity" INTEGER NOT NULL,
    "quantity_reserved" INTEGER NOT NULL DEFAULT 0,
    "price_clp" INTEGER NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT NOT NULL DEFAULT '',
    "allows_meetup" BOOLEAN NOT NULL DEFAULT true,
    "allows_shipping" BOOLEAN NOT NULL DEFAULT true,
    "graded" BOOLEAN NOT NULL DEFAULT false,
    "grader" TEXT,
    "grade" TEXT,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_images" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "listing_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "card_prices" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "price_clp" INTEGER NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_prices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");
CREATE INDEX "listings_seller_id_idx" ON "listings"("seller_id");
CREATE INDEX "listings_variant_id_status_idx" ON "listings"("variant_id", "status");
CREATE INDEX "listings_status_price_clp_idx" ON "listings"("status", "price_clp");
CREATE UNIQUE INDEX "listing_images_listing_id_file_id_key" ON "listing_images"("listing_id", "file_id");
CREATE INDEX "listing_images_listing_id_idx" ON "listing_images"("listing_id");
CREATE INDEX "card_prices_variant_id_captured_at_idx" ON "card_prices"("variant_id", "captured_at");

ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "card_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "card_prices" ADD CONSTRAINT "card_prices_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "card_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "listings" ADD CONSTRAINT "listings_price_clp_positive" CHECK ("price_clp" > 0);
ALTER TABLE "listings" ADD CONSTRAINT "listings_quantity_nonneg" CHECK ("quantity" >= 0);
ALTER TABLE "listings" ADD CONSTRAINT "listings_reserved_lte_quantity" CHECK ("quantity_reserved" >= 0 AND "quantity_reserved" <= "quantity");
ALTER TABLE "listings" ADD CONSTRAINT "listings_single_has_variant" CHECK ("product_type" <> 'SINGLE' OR "variant_id" IS NOT NULL);
