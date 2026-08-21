# 21 — Errores, config y entorno

## Códigos de error (API)

El cliente ramifica por `error.code`, no por el texto.

| code | HTTP | Cuándo |
|------|------|--------|
| `VALIDATION_ERROR` | 400 | DTO |
| `UNAUTHORIZED` | 401 | sin token / expirado |
| `FORBIDDEN` | 403 | rol/ownership |
| `NOT_FOUND` | 404 | |
| `CONFLICT` | 409 | genérico |
| `RATE_LIMITED` | 429 | |
| `INTERNAL` | 500 | |

| code | HTTP | Dominio |
|------|------|---------|
| `EMAIL_TAKEN` | 409 | register |
| `INVALID_CREDENTIALS` | 401 | login (mismo mensaje genérico) |
| `EMAIL_NOT_VERIFIED` | 403 | checkout/vender |
| `ACCOUNT_CONFLICT` | 409 | OAuth |
| `ACCOUNT_BANNED` | 403 | |
| `OAUTH_NOT_CONFIGURED` | 400 | Google/Apple sin client id |
| `SELLER_ONBOARDING_REQUIRED` | 403 | publicar |
| `LISTING_INSUFFICIENT_STOCK` | 409 | cart/checkout |
| `LISTING_NOT_ACTIVE` | 409 | |
| `CART_EMPTY` | 400 | checkout |
| `CHECKOUT_EXPIRED` | 409 | |
| `ORDER_ILLEGAL_TRANSITION` | 409 | |
| `PAYMENT_NOT_HELD` | 409 | release |
| `SHIPPING_METHOD_UNAVAILABLE` | 400 | |
| `IDEMPOTENCY_REPLAY` | 200 | misma respuesta (no error) |

## Config de negocio (`packages/config` + tabla `PlatformConfig` en Fase 10)

| clave | default | |
|-------|---------|--|
| `commissionBps` | 800 | 8.00% |
| `orderConfirmTimeoutDays` | 7 | auto-confirm |
| `checkoutReservationMinutes` | 30 | |
| `shippingFlatClp` | 3990 | tarifa Chilexpress RM→RM (semilla); el resto usa `ShippingRate` |
| `listingMaxImages` | 8 | |
| `listingMinImages` | 1 | |
| `passwordMinLength` | 10 | |
| `accessTokenTtlSec` | 900 | |
| `refreshTokenTtlDays` | 30 | |
| `searchPageSizeDefault` | 20 | |
| `priceRoundToClp` | 10 | sugerencia de precio |
| `priceSuggestFloorBps` | 950 | 95% del min si ≥3 listings |
| `currency` | `CLP` | |
| `country` | `CL` | |

Cambios de comisión **no** recalculan órdenes ya creadas.

## Variables de entorno (API)

```text
NODE_ENV
DATABASE_URL
REDIS_URL                 # desde colas
JWT_ACCESS_SECRET
JWT_ISSUER
APP_WEB_URL
APP_ADMIN_URL
CORS_ORIGINS

GOOGLE_CLIENT_ID
APPLE_CLIENT_ID

MP_ACCESS_TOKEN
MP_WEBHOOK_SECRET
MP_PUBLIC_KEY             # solo clientes, vía endpoint config público limitado

R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_PUBLIC_BASE_URL

RESEND_API_KEY
EMAIL_FROM

EXPO_ACCESS_TOKEN         # push, fase 11
```

Ninguna de estas en el repo. `.env.example` con claves vacías en Fase 0.

## Config pública al cliente

`GET /v1/config` (no auth): `currency`, `country`, condiciones, finishes, `mpPublicKey` si aplica. **Nunca** secrets.
