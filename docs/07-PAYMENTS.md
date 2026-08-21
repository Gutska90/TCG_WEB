# 07 — Pagos

## Principio

El comprador paga a la **plataforma** (Mercado Pago). El vendedor **no** recibe el dinero en el momento del cobro. Se libera tras confirmación de recepción o timeout.

Esto es un flujo de **retención / escrow operativo**, no necesariamente split de MP Marketplace. Decisión v1.0:

**Opción A (MVP):** la cuenta MP de la plataforma recibe el 100%. Internamente `Payment.status = HELD`. Un proceso (manual en el primer mes, luego payout batch) paga al vendedor (transferencia o MP payout) menos comisión. Requiere disciplina operativa y `AuditLog`.

**Opción B (después):** Mercado Pago Marketplace / split / money out al vendedor con retención.

v1.0 implementa **Opción A** en código de estados. `Payment.status` `HELD`/`RELEASED` describe el escrow **operativo interno**, no un split de Mercado Pago. Split 1:1 (OAuth del vendedor + `marketplace_fee`) es decisión de Fase 9.6, antes de producción con dinero real. Los payouts pueden ser semi-manuales en admin al inicio, con tabla:

```text
Payout
  sellerId, amountClp, status, providerRef, period
```

Agregar `Payout` al schema en Fase 7.

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

Sin `MP_ACCESS_TOKEN` el provider mockea el refund (dev / tests). Con token, siempre va a `/v1/payments/{id}/refunds`.

Reembolsos parciales: modelar `Refund` (amountClp, reason) en Fase 7.

## Disputas

`POST /v1/orders/:id/dispute` abre `DISPUTED` + `Report` o entidad `Dispute`. Admin resuelve. El dinero permanece HELD hasta resolución.

## Legal y riesgo

- Contratos: la plataforma es intermediaria; textos legales los define el negocio (no Cursor).
- IVA/comisiones: consultar contador. El software guarda montos netos/brutos como se defina.
- Chargebacks MP: marcar Payment y Order, notificar admin.

## Lo que no se hace

- Liberar pago al vendedor en el webhook `approved`.
- Confiar en `success_url` para marcar PAID.
- Pagar a vendedores sin `AuditLog`.
- Implementar Bitcoin u otras pasarelas en MVP.
