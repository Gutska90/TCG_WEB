# 04 — API

Base path: `/v1`. JSON. UTF-8. Errores con forma única.

Autenticación: header `Authorization: Bearer <accessToken>`.  
Idempotencia: header `Idempotency-Key` en POST de checkout y pagos.

## Errores

```json
{
  "error": {
    "code": "LISTING_INSUFFICIENT_STOCK",
    "message": "No hay stock suficiente",
    "details": { "listingId": "...", "available": 1 }
  }
}
```

HTTP: 400 validación, 401 no autenticado, 403 sin permiso, 404, 409 conflicto, 429, 500.

Paginación: `?page=1&pageSize=20` → `{ items, page, pageSize, total }`.  
Máximo `pageSize=100`.

## Convenciones

- Recursos en plural.
- Filtros en query string.
- Nunca devolver `passwordHash`, tokens crudos, payloads MP completos al cliente.
- DTOs de entrada validados. Tipos en `packages/types` y schemas en `packages/validation`.

## Salud y config pública

| Método | Path | Auth | Notas |
|--------|------|------|-------|
| GET | `/health` | no | liveness |
| GET | `/ready` | no | postgres ok |
| GET | `/v1/config` | no | currency, condiciones, finishes; sin secretos |

---

## Auth — Fase 1

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/v1/auth/register` | no | email, password, displayName |
| POST | `/v1/auth/login` | no | email, password → access + refresh |
| POST | `/v1/auth/refresh` | refresh | rota refresh |
| POST | `/v1/auth/logout` | sí | revoca sesión |
| POST | `/v1/auth/forgot-password` | no | siempre 202 |
| POST | `/v1/auth/reset-password` | no | token + new password |
| POST | `/v1/auth/verify-email` | no | token |
| POST | `/v1/auth/resend-verification` | sí | |
| POST | `/v1/auth/oauth/google` | no | idToken |
| POST | `/v1/auth/oauth/apple` | no | identityToken |
| GET | `/v1/auth/sessions` | sí | sesiones activas |
| DELETE | `/v1/auth/sessions/:id` | sí | |

---

## Users

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/v1/me` | sí | usuario + profile + roles |
| PATCH | `/v1/me` | sí | displayName, bio, comuna |
| GET | `/v1/users/:id` | no | perfil público (id o slug) |
| POST | `/v1/me/seller-onboarding` | sí | activa rol SELLER |
| GET | `/v1/me/addresses` | sí | |
| POST | `/v1/me/addresses` | sí | |
| DELETE | `/v1/me/addresses/:id` | sí | |

---

## Catálogo — Fase 2

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/v1/games` | no | TCG activos |
| GET | `/v1/games/:slug` | no | |
| GET | `/v1/games/:slug/sets` | no | |
| GET | `/v1/games/:slug/sets/:setSlug` | no | resolver SEO |
| GET | `/v1/games/:slug/sets/:setSlug/cards/:cardSlug` | no | ficha por slugs |
| GET | `/v1/games/:slug/cards` | no | paginado |
| GET | `/v1/sets/:id` | no | |
| GET | `/v1/sets/:id/cards` | no | paginado |
| GET | `/v1/cards/:id` | no | carta + variantes + precios resumidos |
| GET | `/v1/variants/:id` | no | variante + listings activos |
| GET | `/v1/search/cards` | no | q, game, set, rarity, language, finish, sort |

Respuesta de ficha `/v1/cards/:id` (MVP 2+ listings):

```json
{
  "id": "...",
  "name": "Charizard ex",
  "game": { "slug": "pokemon", "name": "Pokémon" },
  "set": { "name": "151", "code": "MEW" },
  "number": "006/165",
  "rarity": "Double Rare",
  "variants": [...],
  "market": {
    "currency": "CLP",
    "marketPrice": 14990,
    "minListing": 12500,
    "avgListing": 15320,
    "activeListings": 34
  }
}
```

SEO web usa slugs; la API también expone las mismas fichas por id. `market.*` se calcula en vivo desde listings ACTIVE (Fase 4). `GET /v1/variants/:id` incluye esas publicaciones.

---

## Búsqueda — Fase 3

`GET /v1/search/cards` (público, 60 req/min/IP):

| Query | |
|-------|--|
| `q` | nombre, número, set, juego (acentos-insensitive) |
| `game` | slug (`pokemon`, `magic`, `one-piece`) |
| `set` | slug o código |
| `rarity` | contiene, case-insensitive |
| `language` | `CardLanguage` |
| `finish` | `CardFinish` |
| `sort` | `relevance` (default), `releasedAt` o `price` |
| `priceMin`, `priceMax` | CLP; filtra cartas con listing ACTIVE en rango |
| `page`, `pageSize` | igual que el resto del catálogo |

Sin `q` ni filtros: `{ items: [], total: 0 }`.

Respuesta: `Paginated<SearchCardView>` (`CardSummaryView` + `gameName`, `setName`, `setCode`).

---

## Favoritos — Fase 2

| Método | Path | Auth |
|--------|------|------|
| GET | `/v1/me/favorites` | sí |
| PUT | `/v1/me/favorites/:variantId` | sí |
| DELETE | `/v1/me/favorites/:variantId` | sí |

---

## Files

| Método | Path | Auth |
|--------|------|------|
| POST | `/v1/files/uploads` | sí | `{ mime, size, purpose }` → `{ fileId, uploadUrl, storage }` |
| POST | `/v1/files/:id/complete` | sí | marca READY |

Sin R2 configurado, `storage: "deferred"` y `uploadUrl: null`. `complete` deja el File READY (metadatos). Object storage real no se inventa.

---

## Listings — Fase 4

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/v1/listings` | no | filtros: variantId, sellerId, condition, min/max price |
| GET | `/v1/listings/:id` | no | dueño también ve pausadas |
| GET | `/v1/me/listings` | SELLER | las propias |
| POST | `/v1/listings` | SELLER | crear |
| PATCH | `/v1/listings/:id` | dueño | |
| POST | `/v1/listings/:id/pause` | dueño | |
| POST | `/v1/listings/:id/activate` | dueño | |
| DELETE | `/v1/listings/:id` | dueño | cancela |

`POST /v1/listings` body:

```json
{
  "variantId": "...",
  "condition": "NM",
  "quantity": 1,
  "priceClp": 17990,
  "imageFileIds": ["..."],
  "allowsMeetup": true,
  "allowsShipping": true,
  "description": ""
}
```

Sugerencia de precio: `GET /v1/variants/:id/price-suggestion` → `{ market, minListing, suggested }`.

---

## Carrito — Fase 5

| Método | Path | Auth |
|--------|------|------|
| GET | `/v1/cart` | sí o guest |
| PUT | `/v1/cart/items` | sí o guest | `{ listingId, quantity }` (setea, no incrementa) |
| DELETE | `/v1/cart/items/:listingId` | sí o guest |

Cookie httpOnly `cart` = `Cart.guestToken`. Si hay sesión y cookie, se hace merge (cantidades se suman, tope = stock disponible) y se borra la cookie guest.

No reserva `quantityReserved`. Stock insuficiente → `LISTING_INSUFFICIENT_STOCK`. Listing no ACTIVE → `LISTING_NOT_ACTIVE`. No se puede agregar una publicación propia (`FORBIDDEN`).

Respuesta:

```json
{
  "id": "...",
  "groups": [
    {
      "seller": { "id": "...", "displayName": "...", "slug": "..." },
      "items": [
        {
          "listingId": "...",
          "quantity": 2,
          "lineTotalClp": 24000,
          "purchasable": true,
          "issue": null,
          "listing": {}
        }
      ],
      "subtotalClp": 24000
    }
  ],
  "items": [],
  "productTotalClp": 24000,
  "itemCount": 2
}
```

`issue`: `LISTING_NOT_ACTIVE` | `LISTING_INSUFFICIENT_STOCK` | `OWN_LISTING`. El envío se cotiza en `GET /v1/shipping/quote` (Fase 8). `POST /v1/checkout` es Fase 6.

---

## Checkout — Fase 6

| Método | Path | Auth |
|--------|------|------|
| POST | `/v1/checkout` | sí | crea Checkout + Orders PENDING_PAYMENT |

`POST /v1/checkout`:

```json
{
  "shippingSelections": [
    { "sellerId": "...", "method": "CHILEXPRESS", "addressId": "..." }
  ]
}
```

Respuesta: `{ id, status, totalClp, expiresAt, orders, mercadopago: { initPoint, sandboxInitPoint, mock } }`.

Una Order por vendedor. Reserva `quantityReserved` (no descuenta `quantity` hasta el pago). Expira a los 30 minutos y libera stock.

`GET /v1/checkouts/:id` — comprador; para poll de retorno.

Header `Idempotency-Key` opcional: misma clave + comprador devuelve el mismo checkout.

---

## Órdenes

| Método | Path | Auth |
|--------|------|------|
| GET | `/v1/orders` | comprador o vendedor (filtro `as=buyer\|seller`) |
| GET | `/v1/orders/:id` | participante o admin |
| POST | `/v1/orders/:id/prepare` | vendedor |
| POST | `/v1/orders/:id/ship` | vendedor | tracking |
| POST | `/v1/orders/:id/deliver` | vendedor o sistema |
| POST | `/v1/orders/:id/confirm` | comprador | libera pago |
| POST | `/v1/orders/:id/cancel` | reglas de estado |
| POST | `/v1/orders/:id/dispute` | comprador/vendedor |

---

## Pagos — Fase 7

| Método | Path | Auth |
|--------|------|------|
| POST | `/v1/payments/mercadopago/preference` | sí | `{ checkoutId }` si no se creó en checkout |
| POST | `/v1/payments/simulate` | sí | **solo** si `MP_ACCESS_TOKEN` está vacío (desarrollo) |
| POST | `/v1/webhooks/mercadopago` | firma MP | |

Webhook `approved` → `Payment.status = HELD` y `Order PAID`. **Nunca** `RELEASED` ni payout al vendedor en ese evento. `confirm` del comprador pasa HELD → RELEASED.

Sin keys MP, `mercadopago.mock: true` y el retorno ofrece simular pago. El estado de pago no se toma de `success_url`.

---

## Envíos — Fase 8

| Método | Path | Auth |
|--------|------|------|
| GET | `/v1/shipping/quote` | sí | `sellerId` + `method` + `comuna` destino |
| GET | `/v1/shipments/:id` | participante | 404 si no es parte |

`GET /v1/shipping/quote` responde `{ sellerId, method, originComuna, destComuna, originZone, destZone, priceClp }`. Zonas: `RM` vs `REGIONS`. Meetup: `$0`. `STORE_PICKUP`: `SHIPPING_METHOD_UNAVAILABLE`. Sin tarifa: el método no se ofrece. Sin llamada live a Chilexpress/Blue.

`GET /v1/shipments/:id` incluye `trackingCode` ingresado a mano y `trackingUrl` al carrier si aplica. `labelUrl` queda vacío hasta integración courier.

---

## Valoraciones — Fase 9

| Método | Path | Auth |
|--------|------|------|
| POST | `/v1/orders/:id/rating` | comprador | `{ stars: 1..5, comment?, isPublic? }` |
| GET | `/v1/users/:id/ratings` | no | paginado; solo `isPublic` |

Una valoración por orden (comprador → vendedor) cuando la orden está `COMPLETED`. Duplicado → `CONFLICT`. Quien no es el comprador → `404`. El vendedor valorando al comprador queda para más adelante.

`GET /v1/users/:id/ratings` incluye `summary: { averageStars, count }`. El perfil público y los listings llevan el mismo resumen.

---

## Admin — Fase 10

Prefijo `/v1/admin/*`. Guards `MODERATOR+`.

Usuarios, listings, orders, payments, reports, games/sets/cards CRUD, métricas dashboard, bans.

Detalle en [11-ADMIN](11-ADMIN.md).

---

## Futuro (no implementar)

Paths reservados. Contratos en [17](17-COLLECTION-PRICES-WISHLIST.md), [18](18-NOTIFICATIONS.md). **No** devolver stubs 200.

- `/v1/me/collections`, `/v1/me/wishlist`
- `/v1/variants/:id/prices`
- `/v1/me/notifications`, `/v1/me/push-tokens`
- `/v1/auctions`, `/v1/stores`, `/v1/scan`

## Versionado

Cambios breaking → `/v2`. Campos nuevos opcionales son non-breaking.
