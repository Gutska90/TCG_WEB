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
| GET | `/v1/config` | no | currency, condiciones, finishes, `legal` (versiones), flags públicos; sin secretos |
| GET | `/v1/disputes/:id/evidence/:evidenceId/file` | dueño o staff | stream de bytes (no bucket público). Sin objeto: `FILE_NOT_STORED` |

---

## Auth — Fase 1

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/v1/auth/register` | no | email, password, displayName, `acceptTerms: true`, `marketingOptIn?` |
| POST | `/v1/auth/login` | no | email, password → access + refresh |
| POST | `/v1/auth/refresh` | refresh | rota refresh |
| POST | `/v1/auth/logout` | sí | revoca sesión |
| POST | `/v1/auth/forgot-password` | no | siempre 202 |
| POST | `/v1/auth/reset-password` | no | token + new password |
| POST | `/v1/auth/verify-email` | no | token |
| POST | `/v1/auth/resend-verification` | sí | |
| POST | `/v1/auth/oauth/google` | no | idToken + `acceptTerms` en alta nueva |
| POST | `/v1/auth/oauth/apple` | no | identityToken + `acceptTerms` en alta nueva |
| POST | `/v1/auth/oauth/test` | no | solo `AUTH_STUB_OAUTH` (CI) |
| GET | `/v1/auth/sessions` | sí | sesiones activas (alias `/v1/me/sessions`) |
| DELETE | `/v1/auth/sessions/:id` | sí | |
| POST | `/v1/auth/sessions/revoke-all` | sí | cierra las demás; conserva la actual |
| GET | `/v1/me/auth-identities` | sí | métodos de acceso |
| POST | `/v1/me/auth-identities/link/google` | sí | `{ idToken }` |
| POST | `/v1/me/auth-identities/link/apple` | sí | `{ identityToken }` |
| POST | `/v1/me/auth-identities/link/test` | sí | solo stub |
| DELETE | `/v1/me/auth-identities/:provider` | sí | `GOOGLE` \| `APPLE`; no deja la cuenta inaccesible |
| POST | `/v1/me/password` | sí | agregar/cambiar password |

---

## Users

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/v1/me` | sí | usuario + profile + roles + consentimiento legal |
| GET | `/v1/me/balance` | sí | saldo seller derivado del ledger (`pendingClp` / `availableClp` / `reservedClp` / `paidClp` / `netClp`) |
| PATCH | `/v1/me` | sí | displayName, bio, comuna, `marketingOptIn` |
| POST | `/v1/me/deletion-request` | sí | desactiva la cuenta; no borra Order/Payment/Refund/Ledger/AuditLog |
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

`GET /v1/search/cards` (público, 60 req/min/IP). Requisito: p95 < 300 ms en catálogo MVP (Postgres). Medición: [runbooks/PERFORMANCE.md](runbooks/PERFORMANCE.md).

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

## Colección — Fase 12

Privada. Detalle en [COLLECTIONS.md](COLLECTIONS.md). Flag `ENABLE_COLLECTIONS`. Ítem ajeno → 404.

| Método | Path | Auth | Notas |
|--------|------|------|-------|
| GET | `/v1/me/collections` | sí | asegura Default |
| POST | `/v1/me/collections` | sí | idempotente; MVP una sola |
| GET | `/v1/me/collections/:id` | dueño | |
| PATCH | `/v1/me/collections/:id` | dueño | rename |
| GET | `/v1/me/collection/summary` | sí | KPIs + P/L |
| GET | `/v1/me/collection/items` | sí | q, game, set, condition, duplicates, sort (`recent`\|`name`\|`estimatedValue`\|`quantity`), page. `estimatedValue` pagina en SQL (no carga todos los lotes). |
| POST | `/v1/me/collection/items` | sí | lote: variantId, condition, quantity, costo/fecha/notas opcionales |
| GET | `/v1/me/collection/items/:id` | dueño | |
| PATCH | `/v1/me/collection/items/:id` | dueño | |
| DELETE | `/v1/me/collection/items/:id` | dueño | |
| POST | `/v1/me/collection/items/bulk-delete` | sí | `{ ids }` máx. 50 |
| GET | `/v1/me/collection/sets` | sí | progreso por set |
| GET | `/v1/me/collection/sets/:setId` | sí | faltantes paginados |

`POST /v1/listings` acepta `sourceCollectionItemId` opcional (dueño). No descuenta la colección.

---

## Files

| Método | Path | Auth |
|--------|------|------|
| POST | `/v1/files/uploads` | sí | `{ mime, size, purpose }` → `{ fileId, uploadUrl, storage }` |
| POST | `/v1/files/:id/complete` | sí | marca READY solo si el objeto existe (o driver `deferred`) |
| GET | `/v1/files/:id` | no | stream listing/avatar READY. Evidencia y otros: 404 |

`purpose` LISTING/AVATAR: MIME `image/jpeg`, `image/png`, `image/webp`. DISPUTE_EVIDENCE: allowlist en config. Sin R2/S3 (local/CI), `storage: "deferred"` y `uploadUrl: null`; `complete` no exige bytes. Con R2 o `S3_ENDPOINT`, `storage: "object"`, PUT prefirmado, `complete` hace HeadObject (`FILE_NOT_READY` si falta). Staging/prod fallan al boot si no hay storage. `GET` no usa bucket público. ListingView.images incluye `url: /v1/files/:id`.

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

Sugerencia de precio: `GET /v1/variants/:id/price-suggestion` → `{ market, minListing, suggested }`. Con `ENABLE_PRICES`, `market` puede ser el `LISTING_AVG` de 7 días.

Historial (Fase 13, pública, flag `ENABLE_PRICES`): `GET /v1/variants/:id/prices?range=1m|3m|6m|1a` (default `3m`) → `{ currency, range, current, min, avg, max, volumeSold, lastSaleClp, avg30dClp, median30dClp, minListingClp, confidence, points, disclaimer }`. `current` es el índice interno TCG Market Chile (mediana de ventas COMPLETED 30d, outliers 0.5×–2× fuera; si no hay ventas, avg de listings). Job `card-prices` cada 6 h: `LISTING_MIN` / `LISTING_AVG` / `SALE` uno por (variante, source, día calendario America/Santiago). `SALE` imputa `Order.completedAt` (no `OrderItem.createdAt`). CLI `pnpm --filter @tcg/api prices:capture`. Job `collection-value` diario persiste `CollectionValueSnapshot`. Resumen de colección incluye `change30dClp`.

Wishlist (Fase 14, flag `ENABLE_WISHLIST`): `GET /v1/me/wishlist`; `PUT /v1/me/wishlist/:variantId` `{ targetPriceClp, notifyBelow? }`; `DELETE` mismo path. Un ítem por `(userId, variantId)`. Job `wishlist-scan` (5 min) + ping al publicar/editar listing: si `min ACTIVE <= target` emite `WISHLIST_HIT` (in-app siempre; no spam del mismo listing+precio; si baja más, avisa de nuevo). `PRICE_DROP` (≥10% vs `LISTING_MIN` de hace 7 días) es opt-in (`GET/PATCH /v1/me/notification-preferences`). `GET /v1/me/notifications` lista in-app. B8 también persiste eventos de orden (`SALE_MADE`, `PURCHASE_MADE`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `ORDER_CONFIRMED`, `ORDER_CANCELLED`, `ORDER_DISPUTED`, `RATING_RECEIVED`). Push tokens siguen reservados.

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
| POST | `/v1/orders/:id/dispute` | comprador/vendedor | legado: solo `Order.DISPUTED` |
| POST | `/v1/orders/:id/disputes` | comprador/vendedor | crea `Dispute`; 10.5 |
| GET | `/v1/disputes/:id` | parte o staff | oculta notas internas a parties |
| GET | `/v1/me/disputes` | sí | |
| POST | `/v1/disputes/:id/messages` | parte o staff | |
| POST | `/v1/disputes/:id/evidence` | parte o staff | `{ fileId, evidenceType }` |
| POST | `/v1/reports` | sí | rate limit + anti-duplicado |
| GET | `/v1/me/reports` | sí | |

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

Prefijo `/v1/admin/*`. Guards por incremento. Contratos: [proposals/FASE-10-ADMIN-MONEY.md](proposals/FASE-10-ADMIN-MONEY.md). **No** stubs 200.

| Inc | Paths |
|-----|--------|
| 10A | `GET /v1/admin/dashboard`; listados lectura `GET /v1/admin/orders`, `/payments`, `/refunds`, `/users`, `/listings` |
| 10B | `GET /v1/admin/orders/:id`, `GET /v1/admin/payments/:id`, `GET /v1/admin/refunds/:id`, `POST /v1/admin/orders/:id/cancel`, `POST /v1/admin/refunds/:id/retry` |
| 10C | `GET/POST /v1/admin/payouts`; `POST .../approve\|mark-processing\|mark-paid\|fail\|cancel`; `GET /v1/admin/sellers/:id/balance`; `GET /v1/admin/ledger`; `POST /v1/admin/ledger/adjustments` (`SUPER_ADMIN`); `GET /v1/me/balance` |
| 10D | `POST /v1/admin/reconciliation/run`; `GET .../runs`, `GET .../runs/:id`; `GET .../issues`, `GET .../issues/:id`; `POST .../acknowledge\|resolve\|ignore`; `GET /v1/admin/reconciliation` (dashboard) |
| 10.5 | `GET/POST /v1/admin/disputes`; assign/status/resolve; `GET/POST /v1/admin/reports`; `POST /v1/admin/listings/:id/pause\|restore`; `POST /v1/admin/sellers/:id/suspend\|restore` (ADMIN/SUPER_ADMIN); `GET /v1/admin/moderation/actions`. MODERATOR entra a 10.5, **no** a 10A–10D. |
| 10.6 | `GET /v1/admin/system`; `GET /v1/admin/jobs`; `GET /v1/admin/jobs/:id`; `GET /v1/admin/metrics`. Kill switches y flags son env (lectura). Usuario: `GET /v1/disputes/:disputeId/evidence/:evidenceId/file`. |
| 10.7 | `POST /v1/feedback`; `GET /v1/admin/feedback`; `POST /v1/me/deletion-request`. `GET /v1/config` incluye `legal`. |
| 11.5 | OAuth Google/Apple, `/v1/me/auth-identities*`, `/v1/me/password`, sessions revoke-all, `GET /v1/config` features `enableGoogleAuth` / `enableAppleAuth` / `authStub` |
| 12 | `/v1/me/collections*`, `/v1/me/collection/items*`, `/v1/me/collection/summary`, `/v1/me/collection/sets*` |
| 14 | `GET/PUT/DELETE /v1/me/wishlist/:variantId`; `GET /v1/me/notifications*`; `GET/PATCH /v1/me/notification-preferences`; job `wishlist-scan` |

`HELD`/`RELEASED` en respuestas de admin son estados internos (ver [07-PAYMENTS](07-PAYMENTS.md)), no money_release de MP. El copy de usuario usa las frases de [LEGAL-BETA.md](LEGAL-BETA.md).

---

## Futuro (no implementar)

Paths reservados. Contratos en [17](17-COLLECTION-PRICES-WISHLIST.md), [18](18-NOTIFICATIONS.md). **No** devolver stubs 200.

- `/v1/me/push-tokens`
- `/v1/auctions`, `/v1/stores`, `/v1/scan`

## Versionado

Cambios breaking → `/v2`. Campos nuevos opcionales son non-breaking.
