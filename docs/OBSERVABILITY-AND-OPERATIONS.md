# Observability and operations (Fase 10.6)

Contrato para operar una beta: saber qué falla, detener partes sin apagar todo, correr jobs seguros.

## Logging

Stdout JSON. Campos de request: `requestId`, `method`, `route`, `statusCode`, `durationMs`, `userId` si hay sesión.

Contexto opcional: `checkoutId`, `orderId`, `paymentId`, `providerPaymentId`, `refundId`, `payoutId`, `reconciliationRunId`, `disputeId`.

**Nunca** loggear: password, passwordHash, JWT, refresh, OAuth, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, Authorization, cookies, payload MP crudo, PII innecesaria. Redaction en `apps/api/src/observability/redact.ts`.

## Request / correlation id

Header `X-Request-Id`: UUID válido del reverse proxy, o UUID generado. Se echoa en la respuesta, logs, errores (`error.requestId`) y `JobRun.correlationId` si el job nace en request.

## Error tracking

`ErrorTrackingService`. `ERROR_TRACKING_ENABLED=false` por defecto. Captura 5xx, excepciones, jobs FAILED. Sin PII financiera. Sentry no está cableado; el puerto existe.

## Métricas

In-process (`MetricsService`). `GET /v1/admin/metrics`. Contadores: `http_requests_total`, `http_5xx_total`, `checkout_created_total`, `checkout_failed_total`, `stock_conflict_total`, `payment_approved_total`, `payment_failed_total`, `refund_failed_total`, `webhook_invalid_total`, `payout_failed_total`, `reconciliation_issue_total`, `dispute_opened_total`, `report_opened_total`. Histogramas: `http_request_duration`, `search_duration`, `checkout_duration`. No hay Grafana en esta fase.

## Health

| Path | Qué |
|------|-----|
| `GET /health` | proceso vivo |
| `GET /ready` | `SELECT 1` en PostgreSQL |

No llama Mercado Pago ni storage en cada probe.

## Feature flags

`FeatureFlagsService` + `loadFeatureFlags` en `@tcg/config`. La UI no lee `process.env`.

Públicos en `GET /v1/config` (`features.*`): collections, prices, wishlist, scanner, stores, auctions, payouts (sin secretos).

| Flag | Default |
|------|---------|
| `ENABLE_REAL_PAYMENTS` | false |
| `ENABLE_PAYOUTS` | true salvo `production` (forzar `true`/`false` en env) |
| `ENABLE_COLLECTIONS` | true (kill switch: `false`) |
| `ENABLE_PRICES` | true (kill switch: `false`) |
| `ENABLE_WISHLIST` | true (kill switch: `false`) |
| `ENABLE_SCANNER` / `STORES` / `AUCTIONS` | false |
| `ERROR_TRACKING_ENABLED` | false |
| `ENABLE_REFUND_RETRY_JOB` | false |
| `JOBS_ENABLED` | false en `test`; true en el resto |

## Kill switches

Códigos: `FEATURE_DISABLED` (403) si el flag de producto está off; `SERVICE_TEMPORARILY_DISABLED` (503) si el kill switch está on.

| Switch | Efecto |
|--------|--------|
| `DISABLE_CHECKOUT` | bloquea `POST` checkout; lectura y órdenes existentes siguen |
| `DISABLE_NEW_LISTINGS` | bloquea crear y reactivar; no oculta listings ACTIVE |
| `DISABLE_PAYOUTS` | bloquea crear/aprobar/procesar/pagar; GET sigue; cancelar/fail siguen |
| `DISABLE_REFUNDS_AUTOMATION` | el job `refund-retry` no ejecuta provider; **admin `POST /v1/admin/refunds/:id/retry` sigue** |

Son env. Admin `/admin/system` es **read-only**. Cambiar exige redeploy.

## Jobs

Sin BullMQ. `JobRunner` inserta `JobRun RUNNING` con unique parcial un RUNNING por `jobName` (igual espíritu que recon). Segunda ejecución concurrente → `SKIPPED`.

Jobs: `expire-checkouts`, `housekeeping` (RUNNING stale → FAILED), `reconciliation`, `refund-retry`, `card-prices` (6 h), `collection-value` (diario), `wishlist-scan` (5 min).

Checkout/pago/refund crítico/payout **no** se mueven a cola.

`refund-retry`: máx. 5 intentos (cuenta `AuditLog` `refund.failed`/`refund.retry`), backoff `refundRetryBackoffMinutes * attempts`, reusa `RefundsService.execute()`. Off por defecto (`ENABLE_REFUND_RETRY_JOB`).

History: `GET /v1/admin/jobs`. SIGTERM: `enableShutdownHooks`, scheduler off, RUNNING → FAILED (`JOB_STALE`).

## Alertas admin

Visibles en dashboard y `/admin/system`. Sin paging. Incluyen refund/payout FAILED, recon CRITICAL, jobs FAILED 24h, disputas >7d, payout PROCESSING + disputa, webhook inválido 1h.

## Riesgos pendientes para 10.7

- Bytes reales de evidencia (hoy storage `deferred`).
- Sentry/APM y export Prometheus.
- BullMQ si el scheduler in-process no basta en multi-instancia (lock DB ya evita doble job).
- Payouts automáticos / MP live (production gate).
- Corrección automática de conciliación.
- Store mutable de flags (hoy env).
- Auto-confirm de órdenes / más housekeeping.
- 10.7 no está en el roadmap numerado; no implementar hasta pedirlo.
