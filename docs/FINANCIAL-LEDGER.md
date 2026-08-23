# Ledger financiero interno (Fase 10C)

Fuente de verdad operacional de dinero **interno**. No es contabilidad SII. No concilia Mercado Pago (eso es 10D). No transfiere a bancos.

Modelo de cobro vigente: [ADR 0008](adr/0008-marketplace-payment-model.md) (Opción A). Mercado Pago cobra en la cuenta de la **plataforma**. `HELD` / `RELEASED` son estados internos. **Payout** es la única salida de dinero hacia el seller.

## Piezas

| Pieza | Rol |
|-------|-----|
| `LedgerEntry` | Append-only. Nunca UPDATE. Correcciones = nuevo asiento (`ADJUSTMENT` o `PAYOUT_REVERSED`). |
| `Payout` + `PayoutItem` | Lote de obligaciones a liquidar. MVP: `ManualPayoutProvider` (registra `providerRef`; no transfiere). |
| `SellerBalanceService` | Deriva `pendingClp`, `availableClp`, `reservedClp`, `paidClp`, `netClp` **solo** del ledger. |

No hay columna `User.balance`. El cliente **no** envía `amountClp` ni `commissionClp` de payout.

## Tipos y signo (cuenta seller)

`amountClp` es siempre entero. En filas con `sellerId`:

| `entryType` | Cuándo | Signo | Efecto |
|-------------|--------|-------|--------|
| `PAYMENT_CAPTURED` | Payment pasa a `HELD` | `+neto` | pending |
| `SELLER_PAYABLE` | `confirm()`: Order `COMPLETED` + Payment `RELEASED` (misma tx) | `+neto` | pending→available |
| `PLATFORM_FEE` | misma tx que `SELLER_PAYABLE` | `+commissionClp` | `sellerId` null (plataforma) |
| `REFUND` | Refund `COMPLETED` que afecta al seller | `−neto` | baja pending o available |
| `PAYOUT_RESERVED` | se crea el payout | `−monto` | available→reserved |
| `PAYOUT_PAID` | `mark-paid` con `providerRef` | `+monto` | cierra reserved; suma `paidClp` |
| `PAYOUT_REVERSED` | cancel de payout aún no procesado | `+monto` | reserved→available |
| `ADJUSTMENT` | solo `SUPER_ADMIN` + reason + `AuditLog` | ± | available |

`neto = Order.totalClp − Order.commissionClp` (snapshot de comisión TCG Market; no se recalcula con el plan actual). El processor fee no entra en este asiento.

## Ejemplos (subtotal $100.000, FREE 6% = $6.000, neto $94.000)

## Balances

```text
pendingClp    = Σ PAYMENT_CAPTURED − Σ SELLER_PAYABLE + Σ REFUND de órdenes sin SELLER_PAYABLE
availableClp  = (Σ SELLER_PAYABLE + Σ REFUND post-payable + Σ PAYOUT_RESERVED + Σ PAYOUT_REVERSED + Σ ADJUSTMENT) − disputedClp
disputedClp   = Σ SELLER_PAYABLE de órdenes con disputa activa, sin REFUND y sin payout PROCESSING/PAID
reservedClp   = −(Σ PAYOUT_RESERVED + Σ PAYOUT_PAID + Σ PAYOUT_REVERSED)
paidClp       = Σ PAYOUT_PAID
netClp        = pendingClp + availableClp + reservedClp + disputedClp
```

Un `availableClp < 0` es deuda visible (típico: refund después de payout `PAID`). Bloquea **nuevos** payouts hasta recuperar saldo.

## Idempotencia

Unique:

- `idempotencyKey`
- un `PAYMENT_CAPTURED` / `SELLER_PAYABLE` / `PLATFORM_FEE` por `orderId`
- un `REFUND` por `refundId`
- un `PAYOUT_RESERVED` / `PAYOUT_PAID` / `PAYOUT_REVERSED` por `payoutId`

Retry de `confirm()` o de refund `COMPLETED` no duplica asientos.

## Payout

Estados: `PENDING → APPROVED → PROCESSING → PAID`.

También: `PENDING|APPROVED → CANCELLED`; `PROCESSING → FAILED`; `FAILED → PROCESSING` (retry manual). `PAID` es terminal y exige `providerRef` no vacío (check SQL).

Una orden con `locks_order = true` no puede entrar en otro payout (índice único parcial). Cancelar pone `locks_order = false` y asienta `PAYOUT_REVERSED`.

`POST /v1/admin/payouts` `{ sellerId, orderIds? }`. Si no hay `orderIds`, toma obligaciones available (hay `SELLER_PAYABLE`, no hay `REFUND` de esa orden, no está lockeada, **sin disputa activa**). El monto lo calcula el servidor. Transacción + `FOR UPDATE` seller / payouts abiertos / órdenes del seller.

Disputa activa (10.6): cancela payout `PENDING`/`APPROVED` que incluya la orden. No muta ledger histórico. `PROCESSING` y `PAID` se dejan.

## Refunds vs payout — política MVP

| Caso | Qué pasa |
|------|----------|
| A. Refund **antes** de `SELLER_PAYABLE` | `PAYMENT_CAPTURED` + `REFUND`. Pending y available quedan 0. No hay saldo seller positivo fantasma. |
| B. Refund **después** de payable, **antes** de payout (o payout `PENDING`/`APPROVED`) | `REFUND` reduce available. Si había payout abierto no procesado, se **cancela** (`refund_before_payout`). |
| C. Refund **después** de `PROCESSING` o `PAID` | No se oculta. Se asienta `REFUND`. El payout `PROCESSING` **no** se auto-cancela (ops debe `fail` o completar). Tras `PAID`, el seller queda en **deuda** (`availableClp < 0`) y no puede recibir payouts nuevos. |

La comisión `PLATFORM_FEE` reconocida en el release **no** se reversa en 10C (la plataforma absorbe el fee MP del refund post-completa). Conciliación cash MP es 10D.

## Ejemplos (subtotal $100.000, FREE 6% = $6.000, neto $94.000; Orders viejas pueden tener 8% snapshot)

**Venta + release**

```text
HELD      PAYMENT_CAPTURED  seller  +100.000
confirm   SELLER_PAYABLE    seller  +94.000
confirm   PLATFORM_FEE      (plat)  +6.000
balance   pending 0 / available 94.000
```

**Refund antes de confirm (caso A)**

```text
HELD      PAYMENT_CAPTURED  +73.600
refund    REFUND            −73.600
balance   0 / 0 / 0
```

**Payout manual**

```text
create    PAYOUT_RESERVED   −73.600   available 0 / reserved 73.600
mark-paid PAYOUT_PAID       +73.600   reserved 0 / paid 73.600 / net 0
```

**Refund post-payout (caso C)**

```text
… PAID como arriba …
refund    REFUND            −73.600
balance   available −73.600 / paid 73.600 / net −73.600
nuevo payout → INSUFFICIENT_SELLER_BALANCE
```

## Backfill

Órdenes históricas de desarrollo pueden no tener ledger. Script **idempotente**, no corre solo en production:

```text
pnpm ledger:backfill
```

Inspecciona pagos `HELD`/`RELEASED`/`REFUNDED`, crea `PAYMENT_CAPTURED` faltantes, `SELLER_PAYABLE`/`PLATFORM_FEE` si la orden está `COMPLETED` o el pago `RELEASED`, y `REFUND` de refunds `COMPLETED`. Un segundo run solo incrementa `skippedDuplicates`.

## Lo que 10C no hace

Reconciliación MP, payouts automáticos, `MercadoPagoPayoutProvider`, transferencias bancarias, disputas, reports, live `MP_ACCESS_TOKEN`.

La conciliación 10D está en [RECONCILIATION.md](RECONCILIATION.md): detecta huecos de ledger/MP; **no** inserta asientos.
