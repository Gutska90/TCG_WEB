# Conciliación financiera (Fase 10D)

Compara el estado **interno** (Payment, Refund, Ledger, Payout) con Mercado Pago y abre `ReconciliationIssue`. **No corrige dinero.** No hay asientos automáticos, no hay refund automático, no hay payout automático.

Modelo de cobro: [ADR 0008](adr/0008-marketplace-payment-model.md) (Opción A). Semántica interna: [FINANCIAL-LEDGER](FINANCIAL-LEDGER.md).

## Qué compara

| Lado local | Lado proveedor | Issues |
|------------|----------------|--------|
| `Payment` en la ventana | `searchPayments` / `getPayment` | missing local/provider, status, amount, duplicado, desconocido |
| `Refund` | `listRefunds` | missing local/provider, status, amount |
| Ledger esperado | (solo Postgres) | `PAYMENT_CAPTURED`, `SELLER_PAYABLE`, `REFUND`, `PAYOUT_PAID` |

Ventana por defecto: **48 h** (`PLATFORM.reconDefaultWindowHours`). Manual: `{ hours }` o `{ from, to }`.

## Qué NO corrige

- No cambia `Payment.status`, `Refund.status` ni `Payout.status`.
- No inserta `LedgerEntry`.
- No llama a `refundPayment` ni a payouts.
- No resuelve un issue porque el proveedor “ya coincidió” en un run posterior: si el OPEN se cerró a mano y la discrepancia vuelve, se abre **otro** OPEN.

El copy de admin: **ESTO NO CORRIGE AUTOMÁTICAMENTE DINERO.**

## Mapeo de estados (provider → interno)

Solo `ReconciliationService` usa estas reglas; no hay JSON de Mercado Pago dentro del servicio (el `PaymentProvider` ya normalizó).

| Proveedor | Local válido | Si no |
|-----------|--------------|--------|
| `approved` | `HELD` o `RELEASED` | `PAYMENT_STATUS_MISMATCH` (CRITICAL si local `REFUNDED`) |
| `refunded` | `REFUNDED` | CRITICAL si local `HELD`/`RELEASED` |
| `rejected` / `cancelled` | `REJECTED` | mismatch |
| `pending` / `in_process` | `PENDING` | mismatch |

Pago del proveedor con `external_reference` = checkout nuestro y sin `Payment` local → `PAYMENT_MISSING_LOCAL` (webhook perdido). Sin checkout → `UNKNOWN_PROVIDER_PAYMENT`.

Refund `COMPLETED` local sin refund aprobado en el proveedor → `REFUND_MISSING_PROVIDER` CRITICAL. Local `FAILED` + proveedor `approved` → CRITICAL. Local `PENDING` + proveedor `approved` → WARNING.

## Ledger (solo issues)

| Condición | Issue |
|-----------|--------|
| Payment `HELD`/`RELEASED` sin `PAYMENT_CAPTURED` | `LEDGER_MISSING_PAYMENT_CAPTURED` |
| Payment `RELEASED` + Order `COMPLETED` sin `SELLER_PAYABLE` | `LEDGER_MISSING_SELLER_PAYABLE` |
| Refund `COMPLETED` sin asiento `REFUND` | `LEDGER_MISSING_REFUND` |
| Payout `PAID` sin `PAYOUT_PAID` | `PAYOUT_LEDGER_MISMATCH` |

## Anti-duplicado (fingerprint)

`fingerprint = sha256(issueType|entityType|entityId|providerPaymentId|providerRefundId|expected|actual|montos)`.

Índice único parcial: `(fingerprint) WHERE status = 'OPEN'`.

**Decisión:** un run posterior **reutiliza** el issue OPEN (actualiza `runId` y `details.lastRunId`). No crea un segundo OPEN. Si el issue estaba `RESOLVED`/`IGNORED` y la discrepancia sigue, se crea un OPEN nuevo.

## Concurrencia

Índice único parcial: un `ReconciliationRun` `RUNNING` por `provider`. No se usa `pg_advisory_lock` (el pool de Prisma no garantiza la misma sesión). Un segundo `POST /run` → `RECONCILIATION_IN_PROGRESS`. Un `RUNNING` de más de 15 minutos se marca `FAILED` al iniciar el siguiente.

Error del proveedor: el run queda `FAILED`. No se marcan issues parciales como conciliación completa (la persistencia de issues ocurre **después** de terminar las llamadas al proveedor).

## Runs

| Manual | `POST /v1/admin/reconciliation/run` ADMIN/SUPER_ADMIN, 5 req/min |
| Diario | `pnpm recon:day` — cron sugerido `0 6 * * *` America/Santiago. **No BullMQ.** |

El job diario **no** corre contra live por defecto:

- `NODE_ENV=production` exige `RECON_ALLOW_LIVE=true`
- sin `MP_ACCESS_TOKEN` hace skip (exit 0)

Si el provider no está configurado, un run manual **completa** con `providerSkipped: true` y solo revisa ledger/payouts locales.

## Flujo de revisión

1. Ejecutar run (manual o diario).
2. Filtrar issues `OPEN` / `CRITICAL` en `/admin/reconciliation`.
3. Contrastar Payment/Refund/ledger a mano.
4. `acknowledge` (visto) → `resolve` `{ note }` o `ignore`.
5. Corregir dinero **por los flujos de dominio** (retry refund, ajuste SUPER_ADMIN, payout), nunca desde conciliación.

## Ejemplos

```text
MP approved + local HELD          → OK
MP approved + local RELEASED      → OK
MP refunded + local REFUNDED      → OK
MP approved + local REFUNDED      → PAYMENT_STATUS_MISMATCH
MP refunded + local HELD          → PAYMENT_STATUS_MISMATCH CRITICAL
local HELD sin fila MP            → PAYMENT_MISSING_PROVIDER CRITICAL
MP con nuestro checkout, sin Payment → PAYMENT_MISSING_LOCAL CRITICAL
Refund COMPLETED, MP vacío        → REFUND_MISSING_PROVIDER CRITICAL
Order COMPLETED RELEASED sin SELLER_PAYABLE → LEDGER_MISSING_SELLER_PAYABLE
```

## Seguridad

ADMIN/SUPER_ADMIN. Sin `rawPayload`, sin token en logs ni en `details`. Timeouts del provider 10–15 s. `FakePaymentProvider` en tests cubre missing/mismatch/duplicado.
