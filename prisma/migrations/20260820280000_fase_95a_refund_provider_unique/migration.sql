-- Unique provider refund id for Mercado Pago idempotency (P0-3).
-- PostgreSQL allows multiple NULLs on a UNIQUE column.
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_provider_refund_id_key" UNIQUE ("provider_refund_id");
