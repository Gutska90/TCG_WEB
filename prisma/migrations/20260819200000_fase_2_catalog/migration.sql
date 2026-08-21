-- CreateEnum
CREATE TYPE "CardLanguage" AS ENUM ('EN', 'ES', 'JA', 'KO', 'ZH', 'PT', 'FR', 'DE', 'IT');

-- CreateEnum
CREATE TYPE "CardFinish" AS ENUM ('NORMAL', 'HOLO', 'REVERSE_HOLO', 'FOIL', 'ETCHED', 'FIRST_EDITION', 'UNLIMITED', 'GRADED', 'OTHER');

-- CreateTable
CREATE TABLE "tcg_games" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tcg_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sets" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "released_at" TIMESTAMPTZ(6),
    "printed_total" INTEGER,
    "total" INTEGER,
    "image_url" TEXT,
    "image_file_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" UUID NOT NULL,
    "set_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "supertype" TEXT NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_variants" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "language" "CardLanguage" NOT NULL,
    "finish" "CardFinish" NOT NULL,
    "finish_detail" TEXT NOT NULL DEFAULT '',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "external_ids" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "card_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tcg_games_slug_key" ON "tcg_games"("slug");
CREATE INDEX "sets_game_id_idx" ON "sets"("game_id");
CREATE UNIQUE INDEX "sets_game_id_code_key" ON "sets"("game_id", "code");
CREATE UNIQUE INDEX "sets_game_id_slug_key" ON "sets"("game_id", "slug");
CREATE INDEX "cards_set_id_idx" ON "cards"("set_id");
CREATE UNIQUE INDEX "cards_set_id_number_name_key" ON "cards"("set_id", "number", "name");
CREATE UNIQUE INDEX "cards_set_id_slug_key" ON "cards"("set_id", "slug");
CREATE INDEX "card_variants_card_id_idx" ON "card_variants"("card_id");
CREATE UNIQUE INDEX "card_variants_card_id_language_finish_finish_detail_key" ON "card_variants"("card_id", "language", "finish", "finish_detail");
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");
CREATE UNIQUE INDEX "favorites_user_id_variant_id_key" ON "favorites"("user_id", "variant_id");

ALTER TABLE "sets" ADD CONSTRAINT "sets_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "tcg_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sets" ADD CONSTRAINT "sets_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cards" ADD CONSTRAINT "cards_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "card_variants" ADD CONSTRAINT "card_variants_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "card_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
