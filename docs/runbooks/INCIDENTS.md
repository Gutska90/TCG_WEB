# Incidentes (B5)

Copy de usuario: no afirmar escrow/MP. Kill switches son env + redeploy (`/admin/system` es read-only).

## 5xx / API caída

1. `GET /health` (proceso) y `GET /ready` (Postgres).
2. Logs JSON stdout: `requestId`, `event: error.captured`. Correlacionar header `X-Request-Id`.
3. Si `ERROR_TRACKING_ENABLED=true`: Sentry (tag `requestId` / `jobName`).
4. No pegar JWT, `rawPayload` MP ni passwords en el ticket.

## Postgres

- `/ready` = `not_ready` → DB. No reiniciar API en loop.
- Restore: [BACKUPS.md](BACKUPS.md). Tras restore, `prisma migrate deploy`.

## Jobs

- Dashboard `/admin/jobs`: `FAILED`, `JOB_STALE`, `SKIPPED` (`JOB_ALREADY_RUNNING`).
- Varias réplicas sin líder: o `REDIS_URL` o `JOBS_ENABLED=true` en **una** sola.
- Checkouts colgados: `expire-checkouts` (60s si el líder corre) o `pnpm beta:seed` en local (no en prod).
- SIGTERM: scheduler off, RUNNING → FAILED.

## Kill switches (redeploy)

| Switch | Cuándo |
|--------|--------|
| `DISABLE_CHECKOUT` | incidente de stock/pago; no apaga lecturas |
| `DISABLE_NEW_LISTINGS` | spam de publicaciones |
| `DISABLE_PAYOUTS` | no crear/aprobar payouts; GET sigue |
| `DISABLE_REFUNDS_AUTOMATION` | para el job; el retry admin **sigue** |

`ENABLE_REAL_PAYMENTS` permanece `false` en beta.

## Redis

Staging/prod con `REDIS_URL`: si Redis no responde, la API **no arranca**. Quitar `REDIS_URL` y dejar una réplica con jobs, o arreglar Redis.

## Contacto

Beta: `LEGAL.contactEmail` (hoy placeholder). No hay on-call 24/7 en esta fase.
