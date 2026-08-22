# Propuesta Fase 10 — Admin de dinero

**Estado:** 10A, 10B y 10C implementados. 10D sigue diseño.  
**Prisma:** 10C migra `LedgerEntry`, `PayoutItem` y estados de `Payout`.  
**Decisión de cobro:** [ADR 0008](../adr/0008-marketplace-payment-model.md).

Misión de Fase 10: **operar dinero, sellers y órdenes.** No es un CMS.

```text
10A  Operations dashboard
10B  Orders / payments / refunds console
10C  Ledger + Payouts (manual)
10D  Reconciliation
```

Después: 10.5 disputas/reportes (`SupportCase` ahí, no aquí). Luego Mobile.

Toda mutación: API Nest + service de dominio + `AuditLog`. **Nunca** UPDATE directo desde el admin a `Order`/`Payment`/`Refund`/`Payout`.

Production gate de [07-PAYMENTS](../07-PAYMENTS.md): 10A–10D se pueden construir contra sandbox. No habilitan plata real.

---

## 10A — Operations dashboard

**Objetivo:** ver en un vistazo si el marketplace es operable.

Ruta web admin: `/admin` (app `apps/admin`, puerto 3002). Listados lectura: `/admin/orders|payments|refunds|users|listings`.

```text
GMV (órdenes PAID+ en ventana)
Órdenes por estado
Pagos HELD / RELEASED / REFUNDED
Refunds PENDING|FAILED
Payouts pendientes (cuando exista 10C; si no, 0)

DINERO (aproximado 10A; exacto con ledger en 10C)
  Cobrado MP           SUM(Payment.amountClp) status in (HELD, RELEASED)
  Pendiente sellers    SUM(Order.totalClp - commissionClp) donde Payment HELD
                       o RELEASED sin PayoutItem
  Comisión plataforma  SUM(Order.commissionClp) de esos pagos
  Refunds pendientes   SUM(Refund.amountClp) PENDING|FAILED
  Payouts pendientes   SUM(Payout.amountClp) PENDING|APPROVED|PROCESSING
```

Alertas: `refund_failed`, webhook inválido reciente, checkout expirado con cobro, payout `FAILED`.

**Prisma:** ninguno. Lecturas agregadas.

**API:** `GET /v1/admin/dashboard` (`ADMIN` + `SUPER_ADMIN`; no MODERATOR). Respuesta CLP enteros + counts. Listados lectura en `/v1/admin/orders|payments|refunds|users|listings`.

**Fuera de 10A:** CRUD catálogo, impersonation, feature flags UI, retry refund, payouts, ledger.

---

## 10B — Orders & payments & refunds

**Estado:** implementado. Sin migración Prisma.

**Objetivo:** encontrar una orden/pago y ejecutar acciones de dominio.

Rutas web: `/admin/orders/:id`, `/admin/payments/:id`, `/admin/refunds/:id`.

Detalle: buyer, seller, items, subtotal/envío/comisión, Payment (sin `rawPayload`), Refunds, shipment, timeline (`AuditLog`), acciones:

| Acción | Quién | Service |
|--------|-------|---------|
| Cancel | ADMIN+ | `OrdersService.cancel` |
| Retry refund | ADMIN+ | `RefundsService.execute` |

Flag / open dispute: **no** en 10B (10.5). `POST /v1/admin/orders/:id/refund` no se añadió: el refund nace del cancel de una orden pagada.

### Refund — política 10B (sin enum nuevo)

Prisma sigue: `PENDING | COMPLETED | FAILED`.

- `COMPLETED`: retry no-op (no llama al proveedor).
- `FAILED` y `PENDING`: retry permitido. `PENDING` cubre “creado y no ejecutado” y respuesta pending de MP ([07-PAYMENTS](../07-PAYMENTS.md)).
- `lastError` se lee del último `AuditLog` `refund.failed`, no de una columna.
- `PROCESSING` / `attemptCount` / `processingAt` **aplazados** (no migrar en 10B).

Invariantes: monto del `Payment` persistido; `X-Idempotency-Key = refund.id`; no marcar `Order REFUNDED` si MP falla.

**API:**

| Método | Path |
|--------|------|
| GET | `/v1/admin/orders/:id` |
| GET | `/v1/admin/payments/:id` |
| GET | `/v1/admin/refunds/:id` |
| POST | `/v1/admin/orders/:id/cancel` `{ reason }` |
| POST | `/v1/admin/refunds/:id/retry` body vacío |

`MODERATOR` **no** accede a 10B. Retry/cancel: `ADMIN` + `SUPER_ADMIN`.

---

## 10C — Ledger + Payouts

**Estado: implementado.** Semántica canónica: [FINANCIAL-LEDGER.md](../FINANCIAL-LEDGER.md).

**Objetivo:** saber **cuánto dinero pertenece a quién** y liquidar sellers a mano. Payouts **no** se automatizan.

```text
Admin revisa → aprueba → transfiere por fuera → registra providerRef → PAID
```

### PayoutItem

**Objetivo:** explicar un lote: “por esto le transferimos $187.430 a Juan”.

| Campo | Tipo | Notas |
|-------|------|--------|
| id | uuid | |
| payoutId | uuid | FK Payout |
| orderId | uuid | unique: una orden en a lo más un payout no cancelado |
| grossClp | int | `Order.totalClp` snapshot |
| commissionClp | int | `Order.commissionClp` snapshot |
| netClp | int | `grossClp - commissionClp`; debe ser ≥ 0 |
| createdAt | timestamptz | |

**Relaciones:** `Payout` 1—N `PayoutItem`; `Order` 0—1 `PayoutItem` (órdenes `COMPLETED` + `Payment RELEASED`).

**Invariantes:**

- `sum(PayoutItem.netClp) = Payout.amountClp`.
- Solo órdenes del `Payout.sellerId`.
- No incluir `REFUNDED` / `DISPUTED`.
- Insertar items y payout en la misma transacción.

**Prisma:** tabla nueva `payout_items`. Ampliar `Payout` (abajo).

### Payout (ampliar tabla existente)

Hoy: `sellerId, amountClp, status PENDING\|PAID\|FAILED, providerRef, periodStart, periodEnd`.

Diseño:

```text
status     PENDING | APPROVED | PROCESSING | PAID | FAILED | CANCELLED
method     MANUAL | MERCADOPAGO | BANK      // MVP: MANUAL
providerRef  nullable; obligatorio para pasar a PAID
approvedById, approvedAt
paidAt
lastError
```

**Nunca** `PAID` sin `providerRef` (id transferencia banco / id transferencia MP / referencia interna del comprobante).

**API:**

| Método | Path |
|--------|------|
| GET | `/v1/admin/payouts` |
| POST | `/v1/admin/payouts` | body: `sellerId`, `orderIds?` (sin `amountClp`) |
| POST | `/v1/admin/payouts/:id/approve` |
| POST | `/v1/admin/payouts/:id/mark-processing` |
| POST | `/v1/admin/payouts/:id/mark-paid` | `{ providerRef, reason? }` |
| POST | `/v1/admin/payouts/:id/fail` | `{ reason }` |
| POST | `/v1/admin/payouts/:id/cancel` |
| GET | `/v1/admin/sellers/:id/balance` |
| GET | `/v1/admin/ledger` |
| POST | `/v1/admin/ledger/adjustments` | SUPER_ADMIN; `{ sellerId, amountClp, reason }` |
| GET | `/v1/me/balance` | pending / available / reserved / paid / net |

### Seller balance

**Objetivo:** no hacer `SUM(Order.total)` suelto.

Derivado del ledger (preferido) o, si 10C entrega ledger en el mismo incremento, de vistas:

| Bolsa | Significado |
|-------|-------------|
| Pendiente | `Payment.HELD` (neto) — aún no elegible |
| Disponible | `Payment.RELEASED` neto **sin** `PayoutItem` en payout no cancelado |
| En revisión | `DISPUTED` o refund en vuelo que afecta el neto |

Admin ficha seller: gross, fees, refunds, paid out, outstanding.

### LedgerEntry (inmutable)

**Objetivo:** libro operacional. **No** es contabilidad SII. Nunca `UPDATE` ni `DELETE`. Solo `INSERT`.

```text
LedgerEntry
  id
  accountType     PLATFORM_CASH | PLATFORM_FEE | SELLER_PENDING | SELLER_PAYABLE
  accountId       uuid  // User.id para seller_*; constante plataforma para PLATFORM_*
  entryType       PAYMENT_RECEIVED | PLATFORM_COMMISSION | SELLER_PENDING_ACCRUAL
                  | SELLER_RELEASE | REFUND | PAYOUT | ADJUSTMENT
  amountClp       int   // signo: + aumenta esa cuenta
  orderId? paymentId? refundId? payoutId?
  idempotencyKey  unique  // evita doble asiento (p.ej. paymentId+entryType)
  createdAt       // sin updatedAt de negocio
  createdById?    // null = sistema (webhook)
```

**Asientos (ejemplo $50.000 cobro, comisión $4.000, neto $46.000):**

```text
approved / HELD
  PLATFORM_CASH              +50.000   PAYMENT_RECEIVED
  PLATFORM_FEE               +4.000    PLATFORM_COMMISSION
  SELLER_PENDING             +46.000   SELLER_PENDING_ACCRUAL

RELEASED (confirm)
  SELLER_PENDING             -46.000   SELLER_RELEASE
  SELLER_PAYABLE             +46.000   SELLER_RELEASE

PAYOUT PAID
  SELLER_PAYABLE             -46.000   PAYOUT
  PLATFORM_CASH              -46.000   PAYOUT

REFUND total mientras HELD
  invertir asientos del approved (nuevas filas, no update)
```

Invariantes:

- Para un `paymentId` + `entryType` hay a lo más una fila (`idempotencyKey`).
- `PLATFORM_CASH` neto ≈ cobros MP − refunds MP − payouts (conciliar en 10D).
- Saldo seller disponible = `SUM(SELLER_PAYABLE)` para ese `accountId`.
- `ADJUSTMENT` solo `SUPER_ADMIN` + audit + motivo.

**Prisma:** tabla `ledger_entries`. Sin `updatedAt` de mutación. Append-only enforced in service (RLS opcional después).

**API:** `GET /v1/admin/ledger?accountId&from&to` (`ADMIN+`). Sellers: movimientos en `/v1/me/balance/ledger`.

### PayoutProvider

**Objetivo:** el dominio no depende de cómo sale la plata.

```typescript
interface PayoutProvider {
  send(input: {
    payoutId: string;
    sellerId: string;
    amountClp: number;
    idempotencyKey: string;
  }): Promise<{ providerRef: string; status: "accepted" | "settled" }>;
  getStatus(providerRef: string): Promise<"pending" | "paid" | "failed">;
}
```

| Implementación | Cuándo |
|----------------|--------|
| `ManualPayoutProvider` | MVP. `send` no transfiere: el admin ya transfirió; `mark-paid` persiste `providerRef`. |
| `MercadoPagoPayoutProvider` | Futuro. |
| `BankTransferProvider` | Futuro. |

Binding: igual que `PaymentProvider` (Nest token). Production no-manual requiere el production gate **y** volumen.

---

## 10D — Reconciliation

**Objetivo:** detectar webhook perdido, doble cobro, refund desfasado, hueco de ledger. **No corrige dinero.**

Ruta: `/admin/reconciliation`. Contrato: [RECONCILIATION.md](../RECONCILIATION.md).

### ReconciliationRun / ReconciliationIssue

| Campo | Notas |
|-------|--------|
| Run | `RUNNING` \| `COMPLETED` \| `FAILED`; un RUNNING por provider |
| Issue types | missing local/provider, status/amount, unknown/duplicate, ledger `PAYMENT_CAPTURED` / `SELLER_PAYABLE` / `REFUND`, `PAYOUT_LEDGER_MISMATCH` |
| severity | `INFO` \| `WARNING` \| `CRITICAL` |
| status | `OPEN` \| `ACKNOWLEDGED` \| `RESOLVED` \| `IGNORED` |
| fingerprint | unique parcial si `OPEN`; runs repetidos reutilizan el OPEN |

**Job diario:** `pnpm recon:day` (sin BullMQ). No live por defecto.

**Prisma:** `reconciliation_runs`, `reconciliation_issues`.

**API:** `POST /v1/admin/reconciliation/run`, `GET` runs/issues, `POST` acknowledge/resolve/ignore.

---

## Impacto Prisma (cuando se nombre cada incremento)

| Incremento | Cambio |
|------------|--------|
| 10A | ninguno |
| 10B | ninguno (estados Refund actuales; error vía AuditLog) |
| 10C | `PayoutItem`; ampliar `Payout.status/method`; `LedgerEntry` — **migrado** |
| 10D | `ReconciliationRun`, `ReconciliationIssue` |

Actualizar [03-DATABASE](../03-DATABASE.md) y [04-API](../04-API.md) **en el mismo PR que la migrate**. Este documento es el contrato previo.

---

## 10.5 (recordatorio, no este incremento)

`Dispute`, `Report`, evidencia, `SupportCase` (login, error de pago, dirección, seller, refund que no es disputa de mercancía). No crearlas en 10A–10D.
