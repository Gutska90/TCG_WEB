# 07 — Pagos

## Principio

El comprador paga a la **plataforma** (Mercado Pago). El vendedor **no** recibe el dinero en el momento del cobro. Se libera tras confirmación de recepción o timeout.

Esto es un flujo de **retención / escrow operativo**, no necesariamente split de MP Marketplace. Decisión v1.0:

**Opción A (MVP):** la cuenta MP de la plataforma recibe el 100%. Internamente `Payment.status = HELD`. Un proceso (manual en el primer mes, luego payout batch) paga al vendedor (transferencia o MP payout) menos comisión. Requiere disciplina operativa y `AuditLog`.

**Opción B (después):** Mercado Pago Marketplace / split / money out al vendedor con retención.

v1.0 implementa **Opción A** en código de estados. Los payouts pueden ser semi-manuales en admin al inicio, con tabla:

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
- Verificar firma/secret.
- Idempotente por `providerPaymentId`.
- Nunca confiar en el return URL del browser: el estado de pago **solo** cambia por webhook (o consulta API MP server-side).
- Guardar evento crudo en tabla `WebhookEvent` (Fase 7).

Estados MP → internos:

| MP | Interno |
|----|---------|
| approved | APPROVED + HELD, Order PAID |
| rejected / cancelled | REJECTED, Order CANCELLED, liberar stock |
| refunded | REFUNDED |

## Cancelaciones y reembolsos

| Momento | Quién | Efecto |
|---------|-------|--------|
| PENDING_PAYMENT | comprador o timeout | cancel, sin cobro |
| PAID, no enviado | vendedor o comprador (acuerdo) | refund MP, stock back |
| SHIPPED | solo disputa | no refund automático |
| DISPUTED | admin | refund total/parcial, liberación o chargeback interno |

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
