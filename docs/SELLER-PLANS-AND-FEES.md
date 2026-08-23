# Planes de vendedor y comisión — M1

Fundación comercial de TCG Market. **No** habilita pagos live, cobro automático de suscripciones, Stripe/MP subscriptions, Scanner, Stores B2B, Auctions ni publicidad.

## Cómo se calculaba antes

Una sola tarifa fija: `commissionClp = floor(subtotalClp * 800 / 10_000)` (8% sobre productos, no envío). El monto se guardaba en `Order.commissionClp` al crear la Order. El ledger usaba ese snapshot (`PLATFORM_FEE` / `SELLER_PAYABLE`). Refunds, disputas y payouts leían `commissionClp` de la Order.

## Política `SELLER_PLANS_V1`

Única fuente: `packages/config/src/seller-plans.ts`. Bps enteros. CLP entero. Floor y después cap.

| Plan | Mensualidad | Comisión | Cap |
|------|-------------|----------|-----|
| FREE | $0 | 600 bps (6%) | $25.000 |
| SELLER_PLUS | $7.990 | 450 bps (4,5%) | $20.000 |
| SELLER_PRO | $14.990 | 350 bps (3,5%) | $17.500 |
| STORE | $24.990 | 300 bps (3%) | $15.000 |

FREE es el default. No se exige suscripción para vender.

## Promo de lanzamiento `LAUNCH_3_PERCENT`

Env:

- `MARKETPLACE_LAUNCH_PROMO_ENABLED`
- `MARKETPLACE_LAUNCH_PROMO_START_AT`
- `MARKETPLACE_LAUNCH_PROMO_END_AT`

Si está activa (`enabled` + ventana `[start, end)`), todos los planes usan 300 bps / cap $15.000. El plan del seller no cambia. Al terminar, las **nuevas** Orders vuelven a la tarifa del plan. Las Orders antiguas conservan snapshot.

No hay scheduler. `MarketplaceFeeService` evalúa el timestamp `at`.

## Plan efectivo

`SellerPlanService.getEffectivePlan(sellerId, at)`:

1. `SellerSubscription` ACTIVE con `startsAt <= at` y (`endsAt` null o `> at`)
2. si no hay, **FREE**

Los controllers no leen `SellerSubscription` directo.

`source`: `MANUAL` en M1. `FUTURE_BILLING_PROVIDER` queda reservado para M2.

## Fee engine

`MarketplaceFeeService.calculate({ sellerId, orderSubtotalClp, at })` es la **única** fuente de comisión de marketplace. No llama a Mercado Pago.

Checkout multi-seller: una Order por seller, quote independiente, con `SELECT … FOR UPDATE` de users y subscriptions activas en la misma transacción que crea las Orders.

## Snapshot de Order

Al crear la Order:

- `commissionClp` = fee de plataforma
- `marketplaceFeePolicyVersion`
- `sellerPlanCode`
- `marketplacePromotionCode`
- `marketplaceFeeBps`
- `marketplaceFeeCapClp`

Una Order creada en PRO sigue PRO aunque el seller pase a FREE. Una Order FREE no se vuelve PRO después. Backfill: no inventar plan/promo histórica; `commissionClp` existente se mantiene.

## Ledger

Sin segundo sistema. `PLATFORM_FEE` = `commissionClp` del snapshot. `SELLER_PAYABLE` = `totalClp - commissionClp`. Signos y append-only no cambian.

## Refunds / disputas / conciliación

Refunds y disputas **no** recalculan con el plan actual. Usan el snapshot. Abrir/cerrar disputa no muta el fee. Conciliación puede abrir `PLATFORM_FEE_SNAPSHOT_MISMATCH` si `PLATFORM_FEE` ≠ snapshot; **no** corrige sola.

## Processor fee

Separado. Si MP no entrega un dato confiable: `null`. UI: “Se calcula por separado”. Nunca “comisión total 9,8%” sin dato real.

## Admin

`POST /v1/admin/sellers/:id/plan` (ADMIN / SUPER_ADMIN). Motivo obligatorio. AuditLog. No mueve dinero.

## M2 (no implementar)

Billing real de suscripciones (Mercado Pago u otro). Accounts receivable, Payment/Order/ledger de mensualidad, IAP, volume discounts automáticos, POS/staff/API B2B.

## Volume discounts futuros

Los umbrales saldrán de datos de beta. No hay escalera 6→5→4→3 automática en M1.
