# 11 — Admin

## App

`apps/admin` — Next.js en puerto 3002. No vive bajo el mismo layout que el marketplace. Cookie/sessionStorage distinta (`tcg.admin.accessToken`). Login en `/admin/ingresar`.

Auth: mismos JWT que la API. RBAC: 10A–10D `@Roles(...ADMIN_OPS_ROLES)` (`ADMIN`, `SUPER_ADMIN`). **MODERATOR no accede a 10A–10D.** 10.5 usa `MODERATION_ROLES` (`MODERATOR`, `ADMIN`, `SUPER_ADMIN`); suspender seller sigue siendo `ADMIN_OPS_ROLES`.

Misión Fase 10: **operar dinero, sellers y órdenes.** Incrementos: [proposals/FASE-10-ADMIN-MONEY.md](proposals/FASE-10-ADMIN-MONEY.md).

## 10A — Operations dashboard (implementado)

Rutas web: `/admin`, `/admin/orders`, `/admin/payments`, `/admin/refunds`, `/admin/users`, `/admin/listings`.

API (solo lectura):

| Método | Path | Quién |
|--------|------|--------|
| GET | `/v1/admin/dashboard` | ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/orders` | ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/payments` | ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/refunds` | ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/users` | ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/listings` | ADMIN, SUPER_ADMIN |

Dashboard calculado en servidor (aggregate/groupBy/count). Día calendario `America/Santiago`.

**OPERACIÓN:** usuarios, vendedores, listings ACTIVE, órdenes creadas hoy, pendientes de envío (`PAID`/`PREPARING`), disputadas, refunds PENDING/FAILED.

**DINERO (CLP enteros):** GMV hoy y 30d (`SUM(Order.subtotalClp)` de estados pagados); count/monto HELD y RELEASED; cobrado MP (HELD+RELEASED); pendiente sellers HELD neto; comisión abierta HELD+RELEASED; refunds PENDING+FAILED; payouts `Payout.status = PENDING` (sin PayoutItem).

**ALERTAS (solo si count > 0):** refunds FAILED; payment vs order inconsistente; checkout EXPIRED/CANCELLED con cobro; listings SOLD/CANCELLED con `quantityReserved > 0`; `WebhookEvent.processedAt` null (>60s).

Listados: paginación, filtros, búsqueda, `createdAt desc`. Sin escritura. Sin `passwordHash`, `refreshTokenHash`, `rawPayload`, identidades OAuth.

Lecturas 10A no generan `AuditLog`.

## 10B — Orders, payments, refunds (implementado)

Rutas web: `/admin/orders/:id`, `/admin/payments/:id`, `/admin/refunds/:id`.

| Método | Path | Quién |
|--------|------|--------|
| GET | `/v1/admin/orders/:id` | ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/payments/:id` | ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/refunds/:id` | ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/orders/:id/cancel` | ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/refunds/:id/retry` | ADMIN, SUPER_ADMIN |

**Detalle de orden:** buyer/seller (email), ítems, shipment, checkout, payment (sin `rawPayload`), refunds, timeline `AuditLog` sanitizado.

**Cancel:** body `{ reason }` obligatorio (mín. 3). Reutiliza `OrdersService.cancel` (locks checkout → orders → listings). `PENDING_PAYMENT` libera reserva. `PAID`/`PREPARING` crea/ejecuta refund vía `RefundsService`. `SHIPPED+` → `ORDER_ILLEGAL_TRANSITION`. Si el proveedor falla: `Refund FAILED`, Order **no** pasa a `REFUNDED`.

**Retry refund:** reutiliza `RefundsService.execute`. Monto del `Payment` persistido, nunca del cliente. `COMPLETED` es no-op idempotente (no llama al proveedor). `FAILED` y `PENDING` se reintentan (`PENDING` cubre refund creado y no ejecutado, o respuesta pending de MP). Rate limit 20/min.

**Auditoría de mutación:** `admin.order.cancel` / `admin.refund.retry` con `actorId`, `reason`, `beforeStatus`, `afterStatus`. GET no audita.

Sin flag, disputa, `POST .../refund` genérico, ni migración Prisma (`PROCESSING` / `lastError` en columna se aplazan; el error operacional se lee del último `refund.failed`).

## 10C — Payouts y saldo (implementado)

Rutas web: `/admin/payouts`, `/admin/payouts/:id`, `/admin/sellers/:id/balance`, `/admin/ledger`. Ledger solo lectura.

| Método | Path | Quién |
|--------|------|--------|
| GET | `/v1/admin/payouts` | ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/payouts` | ADMIN, SUPER_ADMIN — `{ sellerId, orderIds? }` |
| GET | `/v1/admin/payouts/:id` | ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/payouts/:id/approve` | ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/payouts/:id/mark-processing` | ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/payouts/:id/mark-paid` | ADMIN, SUPER_ADMIN — `{ providerRef, reason? }` |
| POST | `/v1/admin/payouts/:id/fail` | ADMIN, SUPER_ADMIN — `{ reason }` |
| POST | `/v1/admin/payouts/:id/cancel` | ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/sellers/:id/balance` | ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/ledger` | ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/ledger/adjustments` | **SUPER_ADMIN** — `{ sellerId, amountClp, reason }` |
| GET | `/v1/me/balance` | usuario autenticado (su propio saldo) |

Semántica, invariantes y ejemplos: [FINANCIAL-LEDGER](FINANCIAL-LEDGER.md). `ManualPayoutProvider` no transfiere. Mutaciones 20 req/min. Auditoría `payout.*` y `ledger.adjustment`. GET no audita.

Payouts pendientes del dashboard: `PENDING` + `APPROVED` + `PROCESSING`.

## 10D — Reconciliation (implementado)

Rutas web: `/admin/reconciliation`, `/admin/reconciliation/runs/:id`, `/admin/reconciliation/issues/:id`.

Contrato: [RECONCILIATION.md](RECONCILIATION.md). Copy: **ESTO NO CORRIGE AUTOMÁTICAMENTE DINERO.**

| Método | Path | Quién |
|--------|------|--------|
| GET | `/v1/admin/reconciliation` | ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/reconciliation/run` | ADMIN, SUPER_ADMIN — `{ hours? }` o `{ from, to }` · 5 req/min |
| GET | `/v1/admin/reconciliation/runs` | ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/reconciliation/runs/:id` | ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/reconciliation/issues` | ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/reconciliation/issues/:id` | ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/reconciliation/issues/:id/acknowledge` | ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/reconciliation/issues/:id/resolve` | ADMIN, SUPER_ADMIN — `{ note }` |
| POST | `/v1/admin/reconciliation/issues/:id/ignore` | ADMIN, SUPER_ADMIN |

Mutaciones de issue 20 req/min. Auditoría `recon.run.*` / `recon.issue.*`. GET no audita. No se expone `rawPayload` ni tokens.

## 10.5 — Disputas, reportes y moderación (implementado)

Rutas web: `/admin/disputes`, `/admin/disputes/:id`, `/admin/reports`, `/admin/reports/:id`, `/admin/moderation`.

Contrato: [TRUST-AND-MODERATION.md](TRUST-AND-MODERATION.md). Copy: **esto no mueve dinero.**

| Método | Path | Quién |
|--------|------|--------|
| GET | `/v1/admin/disputes` | MODERATOR, ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/disputes/:id` | MODERATOR, ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/disputes/:id/assign` | MODERATOR, ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/disputes/:id/status` | MODERATOR, ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/disputes/:id/resolve` | MODERATOR, ADMIN, SUPER_ADMIN — `{ outcome, note }` |
| GET | `/v1/admin/reports` | MODERATOR, ADMIN, SUPER_ADMIN |
| GET | `/v1/admin/reports/:id` | MODERATOR, ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/reports/:id/assign` | MODERATOR, ADMIN, SUPER_ADMIN |
| POST | `/v1/admin/reports/:id/resolve` | MODERATOR, ADMIN, SUPER_ADMIN — `{ outcome, note }` |
| POST | `/v1/admin/listings/:id/pause` | MODERATOR, ADMIN, SUPER_ADMIN — `{ reason }` |
| POST | `/v1/admin/listings/:id/restore` | MODERATOR, ADMIN, SUPER_ADMIN — `{ reason }` |
| POST | `/v1/admin/sellers/:id/suspend` | **ADMIN, SUPER_ADMIN** — `{ reason }` |
| POST | `/v1/admin/sellers/:id/restore` | **ADMIN, SUPER_ADMIN** — `{ reason }` |
| GET | `/v1/admin/moderation/actions` | MODERATOR, ADMIN, SUPER_ADMIN |

Mutaciones 20 req/min. `SupportCase` no existe. MODERATOR no hereda ledger/payouts/recon.

## Módulos (más adelante)

| Módulo | Capacidades | Desde |
|--------|-------------|-------|
| Usuarios | buscar, roles, ban | 10B+ (10A: listado lectura) |
| Catálogo | CRUD, reimportar | no 10A |
| Configuración | comisión, timeouts, flags | SUPER_ADMIN; no 10A |
| Soporte | `SupportCase` / chat | post-10.5 |
| Tiendas | Fase 16 | |
| Subastas | Fase 17 | |

## Autorización fina

- `MODERATOR`: disputas, reportes, pausar/restaurar listings, notas internas. **No** dashboard 10A, **no** montos de payout, **no** mark-paid, **no** retry refund, **no** suspender sellers, **no** conciliación.
- `ADMIN`: 10A–10.5 incluido suspender seller.
- `SUPER_ADMIN`: roles, config, `ADJUSTMENT` de ledger.

Toda acción destructiva o financiera: `AuditLog` con actor, before/after.

## UX

Tabla + filtros. Oscuro para diferenciar contexto interno. Badges de `OrderStatus` / `PaymentStatus` / `RefundStatus` / `ListingStatus` existentes.

## Fuera de admin

El import de catálogo es **job CLI**, no scraping en request HTTP largo.

## Production gate

Admin de sandbox ≠ autorización de `MP_ACCESS_TOKEN` live. Ver [ADR 0008](adr/0008-marketplace-payment-model.md).

## 10.6 — Sistema y jobs

Rutas: `/admin/system`, `/admin/jobs`, `/admin/jobs/:id`.

API: `GET /v1/admin/system`, `GET /v1/admin/jobs`, `GET /v1/admin/jobs/:id`, `GET /v1/admin/metrics` (ADMIN/SUPER_ADMIN).

Flags y kill switches **read-only** (env + redeploy). No hay store mutable en DB.

Alertas extra en dashboard: refunds/payouts FAILED, recon CRITICAL, jobs FAILED 24h, disputas >7d, payout PROCESSING con disputa activa, webhook inválido 1h.

## 10.7 — Feedback beta

Ruta: `/admin/feedback`. API: `GET /v1/admin/feedback` (ADMIN/SUPER_ADMIN). Lista simple. No es helpdesk. No expone passwordHash ni versiones legales en el listado de usuarios.

Checklist staff y Playwright: [release/ADMIN-BETA-QA.md](release/ADMIN-BETA-QA.md).
