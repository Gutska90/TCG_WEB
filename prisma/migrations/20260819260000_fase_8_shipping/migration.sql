CREATE TYPE "ShipmentStatus" AS ENUM (
  'PENDING', 'LABEL_CREATED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED'
);

CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "method" "ShippingMethod" NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "carrier" TEXT,
    "tracking_code" TEXT,
    "meetup_at" TIMESTAMPTZ(6),
    "meetup_place" TEXT,
    "label_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");

ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "shipments" (
  "id", "order_id", "method", "status", "carrier", "tracking_code",
  "meetup_at", "meetup_place", "label_url", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  o."id",
  o."shipping_method",
  CASE
    WHEN o."status" IN ('SHIPPED', 'READY_FOR_MEETUP') THEN 'IN_TRANSIT'::"ShipmentStatus"
    WHEN o."status" IN ('DELIVERED', 'CONFIRMED', 'COMPLETED') THEN 'DELIVERED'::"ShipmentStatus"
    WHEN o."status" IN ('CANCELLED', 'REFUNDED') THEN 'CANCELLED'::"ShipmentStatus"
    ELSE 'PENDING'::"ShipmentStatus"
  END,
  CASE o."shipping_method"
    WHEN 'CHILEXPRESS' THEN 'CHILEXPRESS'
    WHEN 'BLUE_EXPRESS' THEN 'BLUE_EXPRESS'
    ELSE NULL
  END,
  o."tracking_code",
  o."meetup_at",
  o."meetup_place",
  NULL,
  o."created_at",
  o."updated_at"
FROM "orders" o;

ALTER TABLE "orders" DROP COLUMN "tracking_code";
ALTER TABLE "orders" DROP COLUMN "meetup_at";
ALTER TABLE "orders" DROP COLUMN "meetup_place";

CREATE TABLE "shipping_rates" (
    "id" UUID NOT NULL,
    "origin_zone" TEXT NOT NULL,
    "dest_zone" TEXT NOT NULL,
    "method" "ShippingMethod" NOT NULL,
    "price_clp" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shipping_rates_price_nonneg" CHECK ("price_clp" >= 0),
    CONSTRAINT "shipping_rates_zone" CHECK (
      "origin_zone" IN ('RM', 'REGIONS') AND "dest_zone" IN ('RM', 'REGIONS')
    )
);

CREATE UNIQUE INDEX "shipping_rates_origin_zone_dest_zone_method_key"
  ON "shipping_rates"("origin_zone", "dest_zone", "method");

INSERT INTO "shipping_rates" ("id", "origin_zone", "dest_zone", "method", "price_clp", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'RM', 'RM', 'CHILEXPRESS', 3990, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'RM', 'REGIONS', 'CHILEXPRESS', 5990, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'REGIONS', 'RM', 'CHILEXPRESS', 5990, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'REGIONS', 'REGIONS', 'CHILEXPRESS', 5490, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'RM', 'RM', 'BLUE_EXPRESS', 3790, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'RM', 'REGIONS', 'BLUE_EXPRESS', 5490, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'REGIONS', 'RM', 'BLUE_EXPRESS', 5490, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'REGIONS', 'REGIONS', 'BLUE_EXPRESS', 4990, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'RM', 'RM', 'COORDINATED', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'RM', 'REGIONS', 'COORDINATED', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'REGIONS', 'RM', 'COORDINATED', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'REGIONS', 'REGIONS', 'COORDINATED', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
