# 07 — Pagos

## MVP Chile — modelo de cobro

Decisión cerrada: [ADR 0008](adr/0008-marketplace-payment-model.md). Análisis largo: [proposals/MP-MARKETPLACE-ARCHITECTURE.md](proposals/MP-MARKETPLACE-ARCHITECTURE.md).

```text
Comprador
   ↓
1 pago Mercado Pago (Checkout Pro)
   ↓
Cuenta Mercado Pago de la PLATAFORMA
   ↓
Checkout  →  Order A (seller 1)
             Order B (seller 2)
             Order C (seller 3)
   ↓
Ledger interno + Payout posterior
```

Mercado Pago **no** es escrow. Split 1:1 **no** se usa en el MVP. No hay OAuth por vendedor ni `marketplace_fee`.

### Qué significan los estados

```text
Payment.HELD
  ≠ dinero retenido por Mercado Pago.
  = cobro approved; los fondos están en la cuenta MP de la plataforma;
    la obligación con el seller todavía no es liquidable.

Payment.RELEASED
  ≠ liberación / money_release de Mercado Pago.
  = la orden es elegible para liquidación al seller (confirmación o timeout).
    Todavía no hay transferencia. confirm() solo escribe Postgres.

Payout
  = salida real de fondos desde la plataforma hacia el vendedor.
    Única fila que representa plata saliendo. Requiere providerRef externo
    para marcar PAID. MVP: aprobación y transferencia manual (Admin).
```

El webhook `approved` deja `Payment` en **HELD**. Nunca `RELEASED`. Nunca payout.

### Production gate

**No habilitar pagos reales (`MP_ACCESS_TOKEN` de producción, Checkout Pro live) hasta validación contractual/legal/comercial por escrito.** Confirmar al menos: si MP permite cobrar fondos de sellers terceros y liquidarlos después; plazo de retención; refunds/chargebacks; KYC vendedor; IVA/comisiones; responsabilidad ante el comprador; qué pasa si bloquean la cuenta MP de la plataforma.

En runtime: `NODE_ENV=production` + `ENABLE_REAL_PAYMENTS=true` falla el arranque si `REAL_PAYMENTS_LEGAL_APPROVED` no es true. Esa marca no se commitea. Detalle: [LEGAL-BETA.md](LEGAL-BETA.md).

Sandbox y `POST /v1/payments/simulate` (sin token) no están cubiertos por este gate.

La tabla `Payout` existe desde Fase 7. El servicio, `PayoutItem` y el ledger están en Fase **10C** ([FINANCIAL-LEDGER](FINANCIAL-LEDGER.md)). Conciliación MP vs DB es 10D. No habilitar pagos live por 10C.

## Flujo feliz

```text
Compra
 → Preference MP creada
 → Pago aprobado (webhook)
 → Order PAID, Payment HELD
 → Vendedor prepara
 → Despachado / listo para encuentro
 → Entregado
 → Comprador confirma
 → Payment RELEASED
 → Order COMPLETED
 → Elegible para Payout
```

## Timeout de confirmación

Si el comprador no confirma en **N días** tras `DELIVERED` (default 7), el sistema auto-confirma y libera. Configurable en admin. Audit `order.auto_confirmed`.

## Comisión

Default provisional: **8% del subtotal de productos** (no del envío), mínimo $0. El costo de MP:

- Decisión provisional: la plataforma absorbe MP de la comisión, o se suma al total como `paymentFeeClp`.
- **Default: comisión 8% incluye cubrir fee MP estimado; no mostrar fee MP al comprador.** Revisar con números reales antes de producción.

`Order.commissionClp` se calcula al crear la orden y no se recalcula después (snapshot).

## Webhooks Mercado Pago

- Endpoint público `/v1/webhooks/mercadopago`.
- Verificar firma/secret (**fail-closed** si Mercado Pago está habilitado: hay `MP_ACCESS_TOKEN`. No depende de `NODE_ENV === production`).
- `ts` del header entra en el HMAC. La plataforma también rechaza firmas con `|now - ts| > 300s` (replay). MP no documenta esa ventana como requisito; es defensa nuestra, más `WebhookEvent` unique.
- Sin token MP (mock local): el webhook se rechaza; el cobro simulado es `POST /v1/payments/simulate`. `MercadoPagoPaymentProvider` no inventa pagos `approved`.
- Idempotente por `WebhookEvent` (`UNIQUE(provider, provider_event_id)` + `INSERT … ON CONFLICT DO NOTHING` + `SELECT … FOR UPDATE`). No usar find-then-create.
- Nunca confiar en el return URL del browser: el estado de pago **solo** cambia por webhook (o consulta API MP server-side).
- Guardar evento crudo en tabla `WebhookEvent` (Fase 7).
- El procesamiento de `approved`/`rejected` ocurre **en la misma transacción** que marca `processedAt`, después de bloquear el grafo checkout.

Estados MP → internos:

| MP | Checkout interno | Efecto |
|----|------------------|--------|
| approved | `PENDING_PAYMENT` (aunque `expiresAt` ya pasó, si nadie expiró aún) | `Payment` **HELD**, `Order` **PAID**, se consume la reserva. **Nunca** `RELEASED`. |
| approved | `PAID` | Idempotente. Sin segundo `AuditLog`. |
| approved | `EXPIRED` o `CANCELLED` | **No se revive.** Se registra `Payment` `APPROVED`, `Refund` `PENDING` (`late_payment_after_expiry`), `Order` sigue terminal, audit `checkout.late_payment` (`HIGH_PRIORITY`). Luego se llama a Mercado Pago (`refundPayment`). Si MP confirma, `Refund COMPLETED` + `Payment REFUNDED` (`providerRefundId` persistido). Si MP falla, `Refund FAILED` y el cobro queda para reintento. |
| approved | webhook repetido (mismo `providerEventId`) | No-op tras `processedAt`. |
| rejected / cancelled | `PENDING_PAYMENT` | `REJECTED`, `Order` `CANCELLED`, liberar stock |
| refunded | `PENDING_PAYMENT` | igual que rejected; chargeback post-`PAID` es deuda P1 |

### Concurrencia (P0-1 / P0-2)

Toda transición de dinero/stock del checkout toma locks en este orden (evita deadlocks):

1. `checkouts` `FOR UPDATE`
2. `orders` de ese checkout (`id` ASC) `FOR UPDATE`
3. `listings` de esos ítems (`id` ASC) `FOR UPDATE`

Después del lock se **relee** el estado. No se confía en lecturas previas a la transacción.

`applyApproved` **no** llama a expirar antes de pagar: si el checkout sigue `PENDING_PAYMENT`, el cobro gana y conserva la unidad reservada. Si la expiración ya committeó, el cobro entra al camino tardío (arriba).

`createCheckout` solo bloquea listings (`id` ASC) porque el checkout aún no existe.

SQL `FOR UPDATE` vive en `apps/api/src/orders/checkout.lock.ts` (no en controllers). Prisma no expone `FOR UPDATE` en el client típico; se usa `$queryRaw` encapsulado.

## Cancelaciones y reembolsos

| Momento | Quién | Efecto |
|---------|-------|--------|
| PENDING_PAYMENT | comprador o timeout | cancel, sin cobro |
| PAID, no enviado | vendedor o comprador (acuerdo) | refund MP real, stock back **después** de confirmación del proveedor |
| SHIPPED | solo disputa | no refund automático |
| DISPUTED | admin | refund total/parcial, liberación o chargeback interno |

Reembolsos: `Refund` (`amountClp`, `reason`, `providerRefundId` unique). El monto sale siempre del `Payment` persistido, nunca del body del cliente.

### P0-3 — refund real Mercado Pago

`OrdersService` no habla HTTP con MP. El contrato es `PaymentProvider` (`createPreference`, `getPayment`, `refundPayment`); la implementación es `MercadoPagoPaymentProvider`.

Flujo:

1. Crear `Refund PENDING` + audit `refund.requested` (`REFUND_REQUESTED`). Orden y Payment **no** pasan a `REFUNDED`.
2. Llamar `refundPayment` **fuera** del lock de dinero, con `X-Idempotency-Key = refund.id` y `amountClp` del `Payment`.
3. Si MP responde `approved` (o “already refunded”): `Refund COMPLETED`, persistir `providerRefundId`, `Payment REFUNDED`, `Order REFUNDED` si estaba `PAID`/`PREPARING`, restaurar stock, audit `refund.completed`.
4. Si timeout / HTTP / pago inexistente: `Refund FAILED`, audit `refund.failed`. Order **no** queda `REFUNDED`. El caller puede reintentar.
5. Un webhook `refunded` posterior es idempotente: no duplica refund ni stock.

Sin `MP_ACCESS_TOKEN` en no-producción se usa `LocalPaymentProvider`. Tests: `FakePaymentProvider`. `MercadoPagoPaymentProvider` no inventa `approved` ni refunds. Con token, refund siempre va a `/v1/payments/{id}/refunds`.

Reembolsos parciales: modelar `Refund` (amountClp, reason) en Fase 7.

## Ledger y payouts (10C)

Detalle con ejemplos: [FINANCIAL-LEDGER](FINANCIAL-LEDGER.md).

`confirm()` (Order `COMPLETED` + Payment `RELEASED`) asienta en la misma transacción `SELLER_PAYABLE` y `PLATFORM_FEE`. El webhook `approved` asienta `PAYMENT_CAPTURED` (neto seller, pending). Refund `COMPLETED` asienta `REFUND` (idempotente).

Payouts MVP: `ManualPayoutProvider`. Admin crea lote → aprueba → `PROCESSING` → registra `providerRef` → `PAID`. No hay transferencia MP/banco. `PAID` es terminal. Un seller con `availableClp < 0` (refund post-payout) no recibe payouts nuevos.

`GET /v1/me/balance` y `GET /v1/admin/sellers/:id/balance` derivan el saldo del ledger. El body de payout no acepta `amountClp` ni `commissionClp`.

## Conciliación (10D)

Detalle: [RECONCILIATION.md](RECONCILIATION.md). `PaymentProvider.searchPayments` / `listRefunds` alimentan `ReconciliationService`. El servicio no contiene lógica Mercado Pago. Un run `FAILED` no se presenta como completo. No hay corrección automática de dinero.

Job: `pnpm recon:day` (no BullMQ). Production no corre contra live salvo `RECON_ALLOW_LIVE=true`.

## Disputas

`POST /v1/orders/:id/disputes` abre entidad `Dispute` y pasa la orden a `DISPUTED`. `POST /v1/orders/:id/dispute` (legado) solo cambia el estado. Mientras `DISPUTED`, `Payment` sigue `HELD`. Admin resuelve el caso en 10.5 **sin** transferir dinero; refund/payout siguen las consolas 10B/10C.

## Legal y riesgo

Ver Production gate arriba y [ADR 0008](adr/0008-marketplace-payment-model.md). El software no autoriza el modelo comercial.

- Contratos y copy de “pago protegido”: humanos. Copy de usuario: pago recibido por la plataforma (aún no liquidable); orden elegible para liquidación; liquidación registrada/pagada. No usar “Mercado Pago retiene” / escrow del procesador. Ver [LEGAL-BETA.md](LEGAL-BETA.md).
- IVA/comisiones: consultar contador. El ledger operacional **no** es contabilidad SII.
- Chargebacks MP: caen sobre la **cuenta plataforma**. Cola admin (Fase 10B / 10.5).

## Lo que no se hace

- Liberar pago al vendedor en el webhook `approved`.
- Tratar `HELD`/`RELEASED` como estados de Mercado Pago.
- Confiar en `success_url` para marcar PAID.
- Pagar a vendedores sin `Payout` + `AuditLog` + `providerRef`.
- Implementar Split, OAuth seller, Bitcoin u otras pasarelas en MVP.
- Poner `MP_ACCESS_TOKEN` de producción sin el production gate.
