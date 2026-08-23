# B5 — Production infrastructure

Contrato de operación. **No** habilita pagos live ni payouts automáticos. Hosting/DNS/TLS lo provisiona el operador (B1).

| Tema | Doc |
|------|-----|
| Error tracking | Sentry vía `ErrorTrackingService` (este runbook + [OBSERVABILITY](../OBSERVABILITY-AND-OPERATIONS.md)) |
| Backups / restore | [BACKUPS.md](BACKUPS.md) |
| Incidentes | [INCIDENTS.md](INCIDENTS.md) |
| Staging 12-factor | [STAGING.md](STAGING.md) |
| Jobs + Redis | abajo |

## Sentry (API)

`ERROR_TRACKING_ENABLED=false` por defecto. Si es `true`, **exige** `SENTRY_DSN` (fail-fast al boot).

```text
ERROR_TRACKING_ENABLED=true
SENTRY_DSN=https://...@....ingest.sentry.io/...
SENTRY_ENVIRONMENT=staging   # opcional; si no, APP_ENV o NODE_ENV
```

Captura: excepciones 5xx (`HttpErrorFilter`) y jobs `FAILED` (`JobRunner`). No PII financiera: redaction + `sendDefaultPii: false` + `beforeSend` (cookies, Authorization). `tracesSampleRate: 0` (sin APM/tracing en esta fase). Web/admin Next no envían a Sentry (CSP sin `sentry.io` extra).

Nunca commitear el DSN. Local: dejar el flag en `false`.

## Redis y jobs (B0-JOB-01 / B0-RED-01)

Sigue **sin BullMQ**. El trabajo crítico (checkout, pago, refund, payout) no va a cola.

`JobRun` UNIQUE parcial un `RUNNING` por `jobName` evita doble ejecución. Redis, si hay `REDIS_URL`, elige **un líder** para los `setInterval` del `JobScheduler` (TTL 60s, renew 15s). Si el líder muere, otro replica toma el lock.

| Entorno | Qué hacer |
|---------|-----------|
| local / CI | `REDIS_URL` opcional. Si Redis no responde en development, la API sigue **sin** lock (un proceso). `NODE_ENV=test` no conecta. |
| 1 réplica staging | `JOBS_ENABLED=true`. Redis recomendado pero no obligatorio. |
| N réplicas | `REDIS_URL` obligatorio en la práctica, **o** `JOBS_ENABLED=true` solo en una réplica worker. Staging/production: Redis inalcanzable con `REDIS_URL` set → fail-fast. |

Compose local: Redis `:6379`. No es cola de emails/webhooks.

## Fuera de B5

Grafana/Prometheus export. BullMQ. Pagos live. Builds móviles: [B6-ANDROID-BETA](../release/B6-ANDROID-BETA.md), [B7-IOS-TESTFLIGHT](../release/B7-IOS-TESTFLIGHT.md).
