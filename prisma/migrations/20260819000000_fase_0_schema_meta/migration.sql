-- CreateTable
CREATE TABLE "schema_meta" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schema_meta_pkey" PRIMARY KEY ("id")
);
