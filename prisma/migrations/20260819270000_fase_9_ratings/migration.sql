CREATE TABLE "seller_ratings" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "seller_ratings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seller_ratings_stars_range" CHECK ("stars" >= 1 AND "stars" <= 5)
);

CREATE UNIQUE INDEX "seller_ratings_order_id_key" ON "seller_ratings"("order_id");
CREATE INDEX "seller_ratings_to_user_id_created_at_idx" ON "seller_ratings"("to_user_id", "created_at");

ALTER TABLE "seller_ratings" ADD CONSTRAINT "seller_ratings_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seller_ratings" ADD CONSTRAINT "seller_ratings_from_user_id_fkey"
  FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seller_ratings" ADD CONSTRAINT "seller_ratings_to_user_id_fkey"
  FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
