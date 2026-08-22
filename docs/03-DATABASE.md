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
  termsVersion, privacyVersion nullable  // versión LEGAL aceptada al registrarse
  acceptedAt nullable                    // instante de consentimiento legal (no marketing)
  marketingOptIn Boolean default false   // opt-in separado; no se mezcla con términos
  deletionRequestedAt nullable           // solicitud de baja; no borra Order/Payment/Refund/Ledger/AuditLog
  createdAt, updatedAt, deletedAt        // deletedAt = desactivación; no hard delete financiero

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

Feedback                 // 10.7 beta; no es SupportCase
  userId nullable, ip nullable
  category (ACCOUNT | BUY | SELL | DISPUTE | REFUND | ABUSE | OTHER)
  message, screen nullable, appVersion nullable, requestId nullable
  createdAt
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
  capturedOn date      // un punto por (variante, source, día UTC)
  capturedAt
  unique(variantId, source, capturedOn)
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
  userId unique            // MVP: una Default por usuario
  name default 'Default'
  isDefault default true
  // Privada. Sin share/followers.

CollectionItem             // lote de compra (no unique variant+condition)
  collectionId, variantId, condition
  quantity (>= 1)
  purchasePriceClp nullable  // precio unitario CLP; costo lote = qty × precio
  purchasedAt nullable date
  notes nullable
  indexes (collectionId, createdAt), (collectionId, variantId, condition), variantId
  // Mismo printing con distinto costo = filas distintas. Ver COLLECTIONS.md.

Listing.sourceCollectionItemId nullable  // trazabilidad vender-desde-colección; al COMPLETED descuenta el lote (idempotente)

CollectionValueSnapshot    // Fase 13 — job diario
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

Refund                  // Fase 7 / P0-3
  paymentId, amountClp, reason, status, providerRefundId unique

Payout                  // Fase 7 tabla; **service 10C**
  sellerId, amountClp, status PENDING|APPROVED|PROCESSING|PAID|FAILED|CANCELLED
  method MANUAL, providerRef, periodStart, periodEnd
  approvedById, approvedAt, paidAt, lastError
  PAID exige providerRef no vacío (check SQL)

PayoutItem              // 10C
  payoutId, orderId, grossClp, commissionClp, netClp
  locksOrder  // unique parcial (order_id) WHERE locks_order — impide double payout

LedgerEntry             // 10C append-only, sin updatedAt
  sellerId?, entryType, amountClp, orderId?, paymentId?, refundId?, payoutId?
  idempotencyKey unique
  metadata Json
  createdAt

ReconciliationRun       // 10D
  provider, startedAt, finishedAt?, status RUNNING|COMPLETED|FAILED
  checkedPayments, checkedRefunds, issuesFound, criticalIssues
  createdById?, metadata
  unique parcial: un RUNNING por provider

ReconciliationIssue     // 10D — no corrige dinero
  runId, issueType, severity INFO|WARNING|CRITICAL
  entityType, entityId?, providerPaymentId?, providerRefundId?
  expectedStatus?, actualStatus?, expectedAmountClp?, actualAmountClp?
  fingerprint, details Json, status OPEN|ACKNOWLEDGED|RESOLVED|IGNORED
  resolvedAt?, resolvedById?, resolutionNote?
  unique parcial: fingerprint WHERE status = OPEN

Dispute                    // 10.5 — no mueve dinero
  orderId, openedById, buyerId, sellerId, assignedAdminId?
  reason, status, resolution?
  openedAt, resolvedAt?
  unique parcial: un dispute activo por orderId

DisputeMessage
  disputeId, authorId, body, isInternalAdminNote, createdAt

DisputeEvidence            // inmutable
  disputeId, uploadedById, fileId, evidenceType, description?
  PHOTO | VIDEO | DOCUMENT | OTHER

Report
  reporterId, targetType USER|LISTING|IMAGE, targetId, reason, description?
  status OPEN|IN_REVIEW|RESOLVED|DISMISSED
  assignedAdminId?, resolvedAt?
  unique parcial: mismo reporter+target+reason si OPEN/IN_REVIEW

ListingRevision            // append-only
  listingId, actorId, source, reason?
  before Json, after Json

ModerationAction           // append-only
  actorAdminId, targetType, targetId, actionType, reason, metadata

SellerSuspension           // historial; liftedAt null = activa
  sellerId, reason, createdById, liftedAt?, liftedById?
  unique parcial: una activa por seller

SupportCase                // NO en 10.5 (sin chat de soporte)

JobRun                     // 10.6 — historial de jobs, sin secretos
  jobName, status RUNNING|COMPLETED|FAILED|SKIPPED
  startedAt, finishedAt?, durationMs?
  errorCode?, errorMessage?, correlationId?, metadata
  unique parcial: un RUNNING por jobName

ShippingRate            // Fase 8



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
| 10A | (ninguna; lecturas) |
| 10B | (ninguna; `lastError` desde `AuditLog`; sin enum `PROCESSING`) |
| 10C | `PayoutItem`, `LedgerEntry`; ampliar `Payout` |
| 10D | `ReconciliationRun`, `ReconciliationIssue` |
| 10.5 | `Dispute`, `DisputeMessage`, `DisputeEvidence`, `Report`, `ListingRevision`, `ModerationAction`, `SellerSuspension` (`SupportCase` aplazado) |
| 10.6 | `JobRun` |
| 10.7 | `Feedback`; columnas de consentimiento/baja en `User` |
| 12 | Collection, CollectionItem; `Listing.sourceCollectionItemId` |
| 13 | CardPrice series (ya existe); CollectionValueSnapshot |
| 14 | WishlistItem |
| 15 | Store, StoreMember |
| 16 | Auction, AuctionBid |

`AuditLog` y `File` se crean en Fase 1.

## Integridad a proteger en servicios

- `quantityReserved <= quantity`.
- No vender más que `quantity - quantityReserved`.
- Al pagar: reservar stock; al cancelar: liberar.
- Transiciones de checkout/pago: lock `FOR UPDATE` checkout → orders → listings (ver [07-PAYMENTS](07-PAYMENTS.md)).
- `Order.sellerId` debe coincidir con `Listing.sellerId` de todos sus items.
- Un `SellerRating` por `Order`.
- `LedgerEntry` append-only (Fase 10C): nunca UPDATE/DELETE; correcciones con asiento compensatorio.
- `Payout.status = PAID` solo con `providerRef` no vacío.
- Un `Order` en a lo más un `PayoutItem` con `locks_order` (payout no cancelado).
- `SELLER_PAYABLE` / `PLATFORM_FEE`: a lo más uno por `orderId` (`idempotencyKey`).
- Saldo seller = `SUM(LedgerEntry)` por tipo; no hay columna `balance` mutable.
- Payout nuevo bloqueado si `availableClp < amount` o `availableClp < 0` (deuda post-payout).
- Conciliación 10D no muta Payment/Refund/Ledger/Payout; solo inserta/actualiza `ReconciliationIssue`.
- Un `ReconciliationRun` `RUNNING` por `provider`.
- Un issue `OPEN` por `fingerprint` (runs repetidos reutilizan el OPEN).
- Conciliación 10D no muta Payment/Refund/Ledger/Payout; solo `ReconciliationIssue`.
- Un `ReconciliationRun` `RUNNING` por `provider` a la vez.
- Un `ReconciliationIssue` `OPEN` por `fingerprint`.
- Una disputa activa (`OPEN`/`WAITING_*`/`UNDER_REVIEW`) por `Order`.
- Dispute 10.5 no muta Payment/Refund/Ledger/Payout.
- `ListingRevision`, `DisputeEvidence` y `ModerationAction` son append-only.
- Un `SellerSuspension` activo (`liftedAt` null) por seller: bloquea listings nuevos, reactivar y payouts nuevos. No cancela órdenes pagadas. Al suspender se pausan listings ACTIVE; restore no los reactiva.
- Orden con disputa activa: no entra a `availableClp` ni a PayoutItem nuevo. Payout PENDING/APPROVED se cancela. PROCESSING no se toca. Ledger histórico no se borra.
- Un `JobRun` `RUNNING` por `jobName`.

## Fase 10C — Ledger + Payouts (migrado)

Contrato: [proposals/FASE-10-ADMIN-MONEY.md](proposals/FASE-10-ADMIN-MONEY.md) y [FINANCIAL-LEDGER.md](FINANCIAL-LEDGER.md).

```text
LedgerEntryType  PAYMENT_CAPTURED | SELLER_PAYABLE | PLATFORM_FEE | REFUND
                 | PAYOUT_RESERVED | PAYOUT_PAID | PAYOUT_REVERSED | ADJUSTMENT
PayoutItem       payoutId, orderId, grossClp, commissionClp, netClp, locksOrder
Payout           + APPROVED/PROCESSING/CANCELLED, method MANUAL, paidAt, lastError
```

## Fase 10D — Reconciliation (migrado)

Contrato: [RECONCILIATION.md](RECONCILIATION.md). No corrige dinero.

```text
ReconciliationRun     provider, window en metadata, RUNNING|COMPLETED|FAILED
ReconciliationIssue   fingerprint unique si OPEN; ACKNOWLEDGED|RESOLVED|IGNORED
```

## Fase 10.5 — Trust & moderation (migrado)

Contrato: [TRUST-AND-MODERATION.md](TRUST-AND-MODERATION.md). `SupportCase` no se crea.

```text
Dispute / Message / Evidence
Report
ListingRevision append-only
ModerationAction append-only
SellerSuspension (historial; liftedAt null = activa)
```
- Precios de listing `> 0`.

## Datos de catálogo (legal)

Importar desde fuentes públicas/licenciables (Scryfall para MTG, Pokémon TCG API, fuentes One Piece documentadas). Guardar `externalIds` y atribución. **Prohibido** scrapear TCGMatch u otro marketplace.
