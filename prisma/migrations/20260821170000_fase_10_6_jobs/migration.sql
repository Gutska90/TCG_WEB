-- Fase 10.6: historial de jobs (scheduler in-process, sin BullMQ).

CREATE TYPE "JobRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

CREATE TABLE "job_runs" (
  "id" UUID NOT NULL,
  "job_name" TEXT NOT NULL,
  "status" "JobRunStatus" NOT NULL,
  "started_at" TIMESTAMPTZ(6) NOT NULL,
  "finished_at" TIMESTAMPTZ(6),
  "duration_ms" INTEGER,
  "error_code" TEXT,
  "error_message" TEXT,
  "correlation_id" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_runs_job_name_started_at_idx" ON "job_runs"("job_name", "started_at");
CREATE INDEX "job_runs_status_started_at_idx" ON "job_runs"("status", "started_at");
CREATE UNIQUE INDEX "job_runs_one_running_per_name"
  ON "job_runs"("job_name")
  WHERE "status" = 'RUNNING';
