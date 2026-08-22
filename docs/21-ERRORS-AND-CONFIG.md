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
| `ACCOUNT_CONFLICT` | 409 | OAuth / linking inseguro |
| `ACCOUNT_BANNED` | 403 | |
| `LAST_AUTH_METHOD` | 409 | unlink del último método |
| `PASSWORD_ALREADY_SET` | 400 | cambio de password sin `currentPassword` |
| `OAUTH_NOT_CONFIGURED` | 400 | Google/Apple sin client id |
| `SELLER_ONBOARDING_REQUIRED` | 403 | publicar |
| `LISTING_INSUFFICIENT_STOCK` | 409 | cart/checkout |
| `LISTING_NOT_ACTIVE` | 409 | |
| `CART_EMPTY` | 400 | checkout |
| `CHECKOUT_EXPIRED` | 409 | |
| `ORDER_ILLEGAL_TRANSITION` | 409 | |
| `PAYMENT_NOT_HELD` | 409 | release |
| `REFUND_PROVIDER_ERROR` | 409 | refund MP timeout/error; reintentable |
| `SHIPPING_METHOD_UNAVAILABLE` | 400 | |
| `PAYOUT_ILLEGAL_TRANSITION` | 409 | state machine payout |
| `PAYOUT_UNAVAILABLE` | 409 | obligación lockeada / no available |
| `PAYOUT_PROVIDER_REF_REQUIRED` | 400 | mark-paid sin providerRef |
| `INSUFFICIENT_SELLER_BALANCE` | 409 | payout > available o saldo negativo |
| `RECONCILIATION_IN_PROGRESS` | 409 | ya hay un run RUNNING para el proveedor |
| `IDEMPOTENCY_REPLAY` | 200 | misma respuesta (no error) |
| `FEATURE_DISABLED` | 403 | flag de producto off (`ENABLE_PAYOUTS=false`, etc.) |
| `SERVICE_TEMPORARILY_DISABLED` | 503 | kill switch (`DISABLE_*`) |
| `LEGAL_CONSENT_REQUIRED` | 400 | alta de cuenta sin aceptar términos |

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
| `reconDefaultWindowHours` | 48 | ventana de conciliación |
| `reconStaleRunMinutes` | 15 | RUNNING viejo → FAILED |
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
JWT_ACCESS_SECRET         # obligatorio, ≥32 chars, sin placeholders
JWT_ISSUER
APP_WEB_URL
APP_ADMIN_URL
CORS_ORIGINS

GOOGLE_CLIENT_ID / GOOGLE_CLIENT_ID_WEB / GOOGLE_CLIENT_ID_IOS / GOOGLE_CLIENT_ID_ANDROID
GOOGLE_CLIENT_SECRET          # no requerido para ID tokens
APPLE_CLIENT_ID
APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY_REF   # referencia; nunca la .p8 en git
ENABLE_GOOGLE_AUTH / ENABLE_APPLE_AUTH
AUTH_STUB_OAUTH               # solo test/CI
NEXT_PUBLIC_GOOGLE_CLIENT_ID  # GIS web (mismo valor que GOOGLE_CLIENT_ID_WEB)

MP_ACCESS_TOKEN           # si está set, MP_WEBHOOK_SECRET es obligatorio en runtime
MP_WEBHOOK_SECRET         # HMAC x-signature; fail-closed con token MP
MP_PUBLIC_KEY             # solo clientes, vía endpoint config público limitado

R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_PUBLIC_BASE_URL

RESEND_API_KEY
EMAIL_FROM

EXPO_ACCESS_TOKEN         # push, fase 11

ENABLE_REAL_PAYMENTS / ENABLE_PAYOUTS / ENABLE_* (features futuras)
REAL_PAYMENTS_LEGAL_APPROVED   # solo true fuera del repo, tras revisión legal
DISABLE_CHECKOUT / DISABLE_NEW_LISTINGS / DISABLE_PAYOUTS / DISABLE_REFUNDS_AUTOMATION
JOBS_ENABLED / ENABLE_REFUND_RETRY_JOB / ERROR_TRACKING_ENABLED
```

Ninguna de estas en el repo. `.env.example` con claves vacías en Fase 0.

## Config pública al cliente

`GET /v1/config` (no auth): `currency`, `country`, condiciones, finishes, `legal` (versiones de términos/privacidad), `features` públicos (`enableGoogleAuth`, `enableAppleAuth`, `authStub`). **Nunca** secrets.
