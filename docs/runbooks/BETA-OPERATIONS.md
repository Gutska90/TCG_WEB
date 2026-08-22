# Runbook — operaciones beta

Sin secretos. Acciones humanas. Kill switches = env + redeploy.

## Checkout falla

1. Ver `/admin/system` y métricas `checkout_failed_total` / `stock_conflict_total`.
2. Si es incidente: `DISABLE_CHECKOUT=true` (no rompe órdenes pagadas).
3. Logs con `X-Request-Id` del comprador.
4. No reintentar cobros a mano contra MP live.

## Refunds FAILED

1. `/admin/refunds?status=FAILED`.
2. Admin retry (`POST /v1/admin/refunds/:id/retry`) aunque `DISABLE_REFUNDS_AUTOMATION=true`.
3. El job `refund-retry` solo si `ENABLE_REFUND_RETRY_JOB=true` y el kill switch está off.
4. Máx. 5 intentos. No crear un segundo Refund al mismo pago.

## Payout FAILED

1. `/admin/payouts`. Revisar `lastError` y ledger.
2. No marcar PAID sin `providerRef` real (manual).
3. `DISABLE_PAYOUTS=true` si hay duda de dinero.
4. Saldo negativo: no crear payouts hasta `ADJUSTMENT` SUPER_ADMIN o recuperación.

## Conciliación CRITICAL

1. `/admin/reconciliation`. Abrir issues CRITICAL.
2. **No** editar Payment/Ledger/Payout para “cuadrar”.
3. Acknowledge/resolve con nota. Corrección de dinero es asiento o refund/payout de dominio.

## Seller negativo

1. `/admin/sellers/:id/balance` (`availableClp < 0`).
2. Típico: refund post-PAID. Bloquea payouts nuevos. No borrar ledger.

## Webhook MP inválido repetido

Alerta `webhook_invalid_spike`. Revisar firma, reloj, `MP_WEBHOOK_SECRET`. No abrir CORS ni loggear el payload.

## DB no responde

`GET /ready` → 503. `GET /health` puede seguir 200. No servir tráfico. Restaurar Postgres. No `db push`.

## Job queda RUNNING

Housekeeping marca stale (~20 min). En deploy, SIGTERM también. Si sigue: inspeccionar `GET /v1/admin/jobs/:id`. No borrar la fila a mano si hay unique RUNNING; fallarla permite el siguiente run.

## Seller con disputa

Disputa activa congela payout de esa orden. PENDING/APPROVED se cancelan. PROCESSING: no tocar; coordinar fail/paid. PAID: traza, no revertir. Resolver disputa no paga ni reembolsa solo.

## Cuándo un kill switch

| Switch | Cuándo |
|--------|--------|
| `DISABLE_CHECKOUT` | errores de cobro/stock masivos |
| `DISABLE_NEW_LISTINGS` | spam/fraude de publicaciones |
| `DISABLE_PAYOUTS` | duda de dinero, recon CRITICAL, saldo raro |
| `DISABLE_REFUNDS_AUTOMATION` | retries MP peligrosos; admin retry sigue |

## Seller disputado + suspender

Suspender pausa listings ACTIVE y bloquea payouts nuevos. No cancela órdenes pagadas. Al restaurar, reactivar listings a mano.

## Legal / pagos live

No encender `ENABLE_REAL_PAYMENTS` ni `REAL_PAYMENTS_LEGAL_APPROVED` desde el repo. Copy de usuario: no decir que Mercado Pago retiene o que hay escrow del procesador. Baja de cuenta: desactivar, no borrar ledger. Feedback: `/admin/feedback` (cola simple). Detalle: [LEGAL-BETA.md](../LEGAL-BETA.md).
