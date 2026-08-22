# 18 — Notificaciones

Tres canales: **in-app**, **email**, **push** (Expo, Fase 11+). El dominio genera un evento; un `NotificationsService` decide canales según `NotificationPreference`.

## Eventos

| type | Cuándo | In-app | Email | Push | Fase |
|------|--------|--------|-------|------|------|
| `AUTH_VERIFY_EMAIL` | registro | | ✓ | | 1 |
| `AUTH_PASSWORD_RESET` | forgot | | ✓ | | 1 |
| `SALE_MADE` | vendedor, orden PAID | ✓ | ✓ | ✓ | 7 |
| `PURCHASE_MADE` | comprador, orden PAID | ✓ | ✓ | ✓ | 7 |
| `PAYMENT_APPROVED` | alias de compra; no duplicar si ya hay PURCHASE_MADE | ✓ | | | 7 |
| `ORDER_SHIPPED` | tracking o mark ship | ✓ | ✓ | ✓ | 8 |
| `ORDER_DELIVERED` | | ✓ | ✓ | ✓ | 8 |
| `ORDER_CONFIRMED` | liberación | ✓ | ✓ | | 7–8 |
| `ORDER_CANCELLED` | | ✓ | ✓ | | 6 |
| `ORDER_DISPUTED` | | ✓ | ✓ | | 7 |
| `RATING_RECEIVED` | | ✓ | | ✓ | 9 |
| `WISHLIST_HIT` | listing ≤ objetivo | ✓ | ✓ | ✓ | 14 |
| `PRICE_DROP` | min listing bajó X% vs 7d (opt-in) | ✓ | ✓ | ✓ | 14 |
| `AUCTION_BID` | | ✓ | | ✓ | 16 |
| `AUCTION_ENDING` | | ✓ | ✓ | ✓ | 16 |
| `AUCTION_WON` / `AUCTION_OUTBID` | | ✓ | ✓ | ✓ | 16 |
| `MESSAGE` | | ✓ | | ✓ | post-MVP |
| `ADMIN_BROADCAST` | | ✓ | opcional | opcional | 10 |

`PAYMENT_APPROVED` y `PURCHASE_MADE` no se envían los dos al comprador. Usar **solo** `PURCHASE_MADE` + `SALE_MADE`.

## Modelo

Ya definido: `Notification`, `NotificationPreference`.

Defaults al crear usuario: transaccionales (venta/compra/envío) on en los tres canales; `PRICE_DROP` off; marketing off (no hay marketing en MVP).

## API

| Método | Path | Fase |
|--------|------|------|
| GET | `/v1/me/notifications` | 7 / 14 |
| POST | `/v1/me/notifications/:id/read` | 7 / 14 |
| POST | `/v1/me/notifications/read-all` | 7 / 14 |
| GET/PATCH | `/v1/me/notification-preferences` | 7 / 14 |
| POST | `/v1/me/push-tokens` | 11 (reservado) |
| DELETE | `/v1/me/push-tokens/:id` | 11 |

## Entrega

- MVP 1–2: emails de auth síncronos o cola mínima.
- MVP 3: BullMQ. Fallo de email no revierte la orden.
- Push: Expo Push API. Token por dispositivo.
- In-app: persistir siempre que el type tenga In-app ✓. Badge = unread count.

## Copy (es-CL, ejemplos)

- `SALE_MADE`: “Vendiste {cardName} por ${price}.”
- `ORDER_SHIPPED`: “{sellerName} despachó tu pedido {orderNumber}.”
- `WISHLIST_HIT`: “{cardName} apareció por ${price}.”

No HTML de competidores. Templates propios en `apps/api` o `packages/email`.
