-- CONTACT.2 seller inquiries (lote consult). Does not reserve listing stock.

CREATE TYPE "SellerInquiryStatus" AS ENUM ('OPEN', 'EXPIRED');

CREATE SEQUENCE seller_inquiry_numbers START WITH 1 INCREMENT BY 1;

CREATE TABLE "seller_inquiries" (
    "id" UUID NOT NULL,
    "inquiry_number" TEXT NOT NULL,
    "buyer_id" UUID,
    "guest_token" TEXT,
    "seller_id" UUID NOT NULL,
    "status" "SellerInquiryStatus" NOT NULL DEFAULT 'OPEN',
    "subtotal_clp" INTEGER NOT NULL,
    "message_text" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "seller_inquiries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seller_inquiries_party_chk" CHECK ("buyer_id" IS NOT NULL OR "guest_token" IS NOT NULL)
);

CREATE UNIQUE INDEX "seller_inquiries_inquiry_number_key" ON "seller_inquiries"("inquiry_number");
CREATE INDEX "seller_inquiries_seller_id_created_at_idx" ON "seller_inquiries"("seller_id", "created_at");
CREATE INDEX "seller_inquiries_buyer_id_created_at_idx" ON "seller_inquiries"("buyer_id", "created_at");
CREATE INDEX "seller_inquiries_status_expires_at_idx" ON "seller_inquiries"("status", "expires_at");

ALTER TABLE "seller_inquiries" ADD CONSTRAINT "seller_inquiries_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seller_inquiries" ADD CONSTRAINT "seller_inquiries_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "seller_inquiry_items" (
    "id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "title_snapshot" TEXT NOT NULL,
    "condition" "CardCondition" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_clp" INTEGER NOT NULL,
    "line_total_clp" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_inquiry_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "seller_inquiry_items_inquiry_id_idx" ON "seller_inquiry_items"("inquiry_id");
CREATE INDEX "seller_inquiry_items_listing_id_idx" ON "seller_inquiry_items"("listing_id");

ALTER TABLE "seller_inquiry_items" ADD CONSTRAINT "seller_inquiry_items_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "seller_inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seller_inquiry_items" ADD CONSTRAINT "seller_inquiry_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
