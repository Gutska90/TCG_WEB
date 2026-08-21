# 03 — Base de datos

Motor: **PostgreSQL 16+**. ORM: **Prisma**. Todas las tablas se declaran en `prisma/schema.prisma`. Nombres de modelo en PascalCase; tablas en `snake_case`.

CLP se persiste como `Int` (pesos). UUIDs `uuid` v7 o `cuid` — **decisión: `uuid`**. Timestamps `timestamptz`. Soft-delete solo donde se indica.

## Convenciones

- Cada tabla de negocio tiene `id`, `createdAt`, `updatedAt`.
- FKs con `onDelete` explícito.
- Índices listados bajo cada modelo.
- Campos game-specific de una carta van en `Card.attributes Json` — no columnas `pokemonHp`, `mtgManaCost`, etc.

## Enums

```prisma
enum Role {
  USER
  SELLER
  STORE
  MODERATOR
  ADMIN
  SUPER_ADMIN
}

enum AuthProvider {
  EMAIL
  GOOGLE
  APPLE
}

enum CardCondition {
  NM
  LP
  MP
  HP
  DMG
}

enum CardLanguage {
  EN
  ES
  JA
  KO
  ZH
  PT
  FR
  DE
  IT
}

enum CardFinish {
  NORMAL
  HOLO
  REVERSE_HOLO
  FOIL
  ETCHED
  FIRST_EDITION
  UNLIMITED
  GRADED
  OTHER
}

enum ListingStatus {
  DRAFT
  ACTIVE
  PAUSED
  SOLD
  CANCELLED
}

enum ProductType {
  SINGLE
  SEALED
  ACCESSORY
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  PREPARING
  SHIPPED
  READY_FOR_MEETUP
  DELIVERED
  CONFIRMED
  COMPLETED
  CANCELLED
  DISPUTED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  APPROVED
  REJECTED
  HELD
  RELEASED
  REFUNDED
}

enum ShippingMethod {
  CHILEXPRESS
  BLUE_EXPRESS
  MEETUP
  COORDINATED
  STORE_PICKUP
}

enum ShipmentStatus {
  PENDING
  LABEL_CREATED
  IN_TRANSIT
  DELIVERED
  FAILED
  CANCELLED
}

enum NotificationChannel {
  IN_APP
  EMAIL
  PUSH
}

enum AuctionStatus {
  SCHEDULED
  LIVE
  ENDED
  CANCELLED
  SETTLED
}
```

## Modelos — Identidad

```text
User
  id, email unique, emailVerifiedAt, passwordHash nullable
  displayName, avatarFileId, slug unique nullable
  tokenVersion Int default 0
  roles Role[]          // Postgres array o tabla UserRole
  isBanned, bannedAt, bannedReason
  createdAt, updatedAt, deletedAt

UserRole                // preferible a array si hay que auditar
  userId, role, grantedAt, grantedById

AuthIdentity
  userId, provider, providerSubject unique(provider, providerSubject)

Session
  userId, refreshTokenHash, userAgent, ip, expiresAt, revokedAt

Profile
  userId unique
  bio, region, comuna, country default 'CL'
  sellerOnboardedAt
  storeId nullable

Address
  userId, label
  recipientName, phone, line1, line2, comuna, region, postalCode
  isDefaultShipping, isDefaultBilling

EmailVerificationToken
  userId, tokenHash unique, expiresAt, consumedAt

PasswordResetToken
  userId, tokenHash unique, expiresAt, consumedAt
```

Un usuario puede tener varios roles. `SELLER` se otorga al completar onboarding. `STORE` implica membresía en `StoreMember`.

## Modelos — Catálogo (agnóstico)

```text
TcgGame
  slug unique          // pokemon, magic, one-piece
  name
  publisher
  isActive
  sortOrder

Set (Prisma: `TcgSet`, tabla `sets`)
  gameId
  code                 // "SV3", "MH3"
  slug                 // URL-safe, unique por game: "151", "mh3"
  name
  releasedAt
  printedTotal, total
  imageUrl             // URL de origen (icono Scryfall, etc.)
  imageFileId
  unique(gameId, code)
  unique(gameId, slug)

Card
  setId
  number               // "006/165" o "6"
  slug                 // unique por set: "charizard-ex"
  name
  rarity
  supertype
  attributes Json
  imageUrl             // URL de origen (Scryfall, etc.), no blob propio
  unique(setId, number, name)  // ajustar si un número tiene varias caras
  unique(setId, slug)

CardVariant
  cardId
  language CardLanguage
  finish CardFinish
  finishDetail String   // default ""; vacío en unique (NULL en PG no colisiona)
  isDefault
  externalIds Json     // { scryfallId, tcgplayerId, pokemonTcgApiId }
  unique(cardId, language, finish, finishDetail)

CardPrice
  variantId
  source               // LISTING_MIN | LISTING_AVG | SALE | IMPORT
  priceClp Int
  capturedAt
  index(variantId, capturedAt)
```

Agregar un TCG nuevo = filas, no migraciones de columnas.

## Búsqueda (Fase 3)

Sin tablas nuevas. Extensiones PostgreSQL `pg_trgm` y `unaccent`, función `immutable_unaccent_lower(text)` e índices GIN sobre nombre/número de carta, nombre/código de set y nombre/slug de juego. Prisma no expresa esos índices; viven en la migración `fase_3_search`.

Filtros de precio usan `Listing` (Fase 4).

## Modelos — Marketplace

```text
Listing
  sellerId
  storeId nullable     // Fase 15; columna lista, sin FK a Store
  variantId nullable   // null solo si productType != SINGLE en el futuro
  productType default SINGLE
  title                // denormalizado para sellados; singles usan Card.name
  condition CardCondition?
  quantity Int
  quantityReserved Int default 0
  priceClp Int
  status ListingStatus
  description
  allowsMeetup Boolean
  allowsShipping Boolean
  graded Boolean
  grader String?       // PSA, BGS
  grade String?        // "10"
  publishedAt

ListingImage
  listingId, fileId, sortOrder

Cart
  userId unique nullable
  guestToken unique nullable
  // CHECK: userId IS NOT NULL OR guestToken IS NOT NULL (migración fase_5_cart)

CartItem
  cartId, listingId, quantity
  unique(cartId, listingId)

Checkout / Order / OrderItem   // Fase 6; no se crean en Fase 5

Order                      // una por vendedor por checkout
  orderNumber unique
  buyerId
  sellerId
  status
  subtotalClp, shippingClp, commissionClp, totalClp
  shippingMethod
  shippingAddressId
  notes
  paidAt, shippedAt, deliveredAt, confirmedAt, completedAt

OrderItem
  orderId, listingId, variantId
  titleSnapshot, condition, quantity, unitPriceClp

Payment
  orderId
  provider             // MERCADOPAGO
  providerPaymentId
  status
  amountClp
  rawPayload Json
  heldAt, releasedAt, refundedAt

Shipment
  orderId unique
  method, status
  carrier, trackingCode
  meetupAt, meetupPlace
  labelUrl

ShippingRate
  originZone, destZone, method, priceClp
  unique(originZone, destZone, method)

SellerRating
  orderId unique
  fromUserId, toUserId
  stars Int 1..5
  comment
  isPublic
```

Checkout: el carrito puede tener N vendedores; el servicio crea N `Order` + un `Checkout` agrupador.

`Shipment` concentra tracking y meetup. `Order.shippingMethod` y `shippingClp` quedan como snapshot del checkout.

```text
Checkout
  buyerId
  mercadoPagoPreferenceId
  status
  totalClp
```

Un pago MP puede cubrir varias órdenes (preference con items). Internamente se reparte.

## Modelos — Colección, social, tiendas, subastas

```text
Favorite
  userId, variantId
  unique(userId, variantId)

WishlistItem
  userId, variantId
  targetPriceClp
  notifyBelow Boolean default true
  unique(userId, variantId)

Collection
  userId, name default 'Default'

CollectionItem
  collectionId, variantId
  quantity, condition
  purchasePriceClp nullable
  notes

CollectionValueSnapshot    // Fase 12 — job diario
  collectionId, capturedOn date, valueClp, breakdown Json
  unique(collectionId, capturedOn)

Store
  slug unique, name, description
  logoFileId, bannerFileId
  addressId
  socials Json
  isVerified

StoreMember
  storeId, userId, role  // OWNER | STAFF
  unique(storeId, userId)

Auction                 // Fase 16 — modelar, no implementar
  listingOrVariant
  sellerId
  startsAt, endsAt
  startPriceClp, currentPriceClp, minIncrementClp
  status

AuctionBid
  auctionId, bidderId, amountClp

Notification
  userId, type, title, body, data Json
  readAt, channel

NotificationPreference
  userId, type, inApp, email, push

Report
  reporterId, targetType, targetId, reason, status

AuditLog
  actorId nullable
  action, entityType, entityId
  metadata Json
  ip, createdAt

File
  id, bucket, key, mime, size, uploadedById, status

WebhookEvent            // Fase 7
  provider, providerEventId unique, payload Json, processedAt

Refund                  // Fase 7
  paymentId, amountClp, reason, status, providerRefundId

Payout                  // Fase 7
  sellerId, amountClp, status, providerRef, periodStart, periodEnd

ShippingRate            // Fase 8
  originZone, destZone, method, priceClp
```

## Qué se crea en cada fase

| Fase | Tablas nuevas |
|------|----------------|
| 1 Auth | User, UserRole, AuthIdentity, Session, Profile, EmailVerificationToken, PasswordResetToken |
| 2 Catálogo | TcgGame, TcgSet (`sets`), Card, CardVariant |
| 2 Favoritos | Favorite |
| 3 Búsqueda | extensiones `pg_trgm` + `unaccent`, índices GIN (sin tablas) |
| 4 Marketplace | Address, Listing, ListingImage, CardPrice (mínimo) |
| 5 Carrito | Cart, CartItem |
| 6 Órdenes | Checkout, Order, OrderItem |
| 7 | Payment, AuditLog (si no está antes — **AuditLog desde Fase 1**) |
| 8 | Shipment, ShippingRate |
| 9 | SellerRating |
| 12 | Collection, CollectionItem |
| 13 | CardPrice series (ya existe) |
| 14 | WishlistItem |
| 15 | Store, StoreMember |
| 16 | Auction, AuctionBid |

`AuditLog` y `File` se crean en Fase 1.

## Integridad a proteger en servicios

- `quantityReserved <= quantity`.
- No vender más que `quantity - quantityReserved`.
- Al pagar: reservar stock; al cancelar: liberar.
- `Order.sellerId` debe coincidir con `Listing.sellerId` de todos sus items.
- Un `SellerRating` por `Order`.
- Precios de listing `> 0`.

## Datos de catálogo (legal)

Importar desde fuentes públicas/licenciables (Scryfall para MTG, Pokémon TCG API, fuentes One Piece documentadas). Guardar `externalIds` y atribución. **Prohibido** scrapear TCGMatch u otro marketplace.
