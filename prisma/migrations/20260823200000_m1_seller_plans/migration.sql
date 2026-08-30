-- M1 Seller Plans + Fee Engine. Additive only. Does not rewrite historical commissionClp.

CREATE TYPE "SellerPlan" AS ENUM ('FREE', 'SELLER_PLUS', 'SELLER_PRO', 'STORE');
CREATE TYPE "SellerSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');
CREATE TYPE "SellerSubscriptionSource" AS ENUM ('MANUAL', 'FUTURE_BILLING_PROVIDER');

ALTER TYPE "ReconciliationIssueType" ADD VALUE 'PLATFORM_FEE_SNAPSHOT_MISMATCH';

CREATE TABLE "seller_subscriptions" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "plan" "SellerPlan" NOT NULL,
    "status" "SellerSubscriptionStatus" NOT NULL,
    "source" "SellerSubscriptionSource" NOT NULL DEFAULT 'MANUAL',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "seller_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "seller_subscriptions_seller_id_status_starts_at_idx" ON "seller_subscriptions"("seller_id", "status", "starts_at");
CREATE INDEX "seller_subscriptions_seller_id_created_at_idx" ON "seller_subscriptions"("seller_id", "created_at");

ALTER TABLE "seller_subscriptions" ADD CONSTRAINT "seller_subscriptions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD COLUMN "marketplace_fee_policy_version" TEXT,
  ADD COLUMN "seller_plan_code" "SellerPlan",
  ADD COLUMN "marketplace_promotion_code" TEXT,
  ADD COLUMN "marketplace_fee_bps" INTEGER,
  ADD COLUMN "marketplace_fee_cap_clp" INTEGER;

-- Backfill: do NOT invent historical plan/promo. commission_clp stays as the fee amount.
-- New Orders snapshot policy/plan/promo/bps/cap at creation.
