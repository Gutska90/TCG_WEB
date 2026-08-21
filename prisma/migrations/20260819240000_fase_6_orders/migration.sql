CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPED', 'READY_FOR_MEETUP',
  'DELIVERED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED'
);
CREATE TYPE "CheckoutStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'EXPIRED', 'CANCELLED');
CREATE TYPE "ShippingMethod" AS ENUM ('CHILEXPRESS', 'BLUE_EXPRESS', 'MEETUP', 'COORDINATED', 'STORE_PICKUP');

CREATE TABLE "checkouts" (
    "id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "total_clp" INTEGER NOT NULL,
    "mercado_pago_preference_id" TEXT,
    "idempotency_key" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "checkouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "checkout_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "subtotal_clp" INTEGER NOT NULL,
    "shipping_clp" INTEGER NOT NULL,
    "commission_clp" INTEGER NOT NULL,
    "total_clp" INTEGER NOT NULL,
    "shipping_method" "ShippingMethod" NOT NULL,
    "shipping_address_id" UUID,
    "notes" TEXT NOT NULL DEFAULT '',
    "tracking_code" TEXT,
    "meetup_at" TIMESTAMPTZ(6),
    "meetup_place" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "shipped_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "title_snapshot" TEXT NOT NULL,
    "condition" "CardCondition" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_clp" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "checkouts_mercado_pago_preference_id_key" ON "checkouts"("mercado_pago_preference_id");
CREATE UNIQUE INDEX "checkouts_buyer_id_idempotency_key_key" ON "checkouts"("buyer_id", "idempotency_key");
CREATE INDEX "checkouts_buyer_id_status_idx" ON "checkouts"("buyer_id", "status");
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");
CREATE INDEX "orders_buyer_id_created_at_idx" ON "orders"("buyer_id", "created_at");
CREATE INDEX "orders_seller_id_created_at_idx" ON "orders"("seller_id", "created_at");
CREATE INDEX "orders_checkout_id_idx" ON "orders"("checkout_id");
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
CREATE INDEX "order_items_listing_id_idx" ON "order_items"("listing_id");

ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "card_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_total_clp_nonneg" CHECK ("total_clp" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_subtotal_positive" CHECK ("subtotal_clp" > 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_nonneg" CHECK ("shipping_clp" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_commission_nonneg" CHECK ("commission_clp" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_matches" CHECK ("total_clp" = "subtotal_clp" + "shipping_clp");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_price_positive" CHECK ("unit_price_clp" > 0);
