# 15 — Roadmap

Cada fase es un incremento mergeable. No se adelanta la siguiente sin criterios de salida.

```text
FASE 0    Arquitectura y diseño          ✓ scaffold listo
FASE 1    Usuarios + autenticación       ✓
FASE 2    Catálogo TCG                   ✓
FASE 3    Buscador                       ✓
FASE 4    Marketplace (listings)         ✓
FASE 5    Carrito                        ✓
FASE 6    Órdenes                        ✓
FASE 7    Pagos                          ✓ sandbox (live gated)
FASE 8    Envíos                         ✓ MVP
FASE 9    Reputación                     ✓
FASE 9.5A MONEY SAFETY                   ✓
FASE 9.5B SECURITY                       ✓
FASE 9.5C RELEASE GATE                   ✓
FASE 9.6  MP MARKETPLACE (decisión)      ✓ ADR 0008 Opción A (provisional + production gate)
FASE 10A  Admin operations dashboard     ✓
FASE 10B  Orders / payments / refunds    ✓
FASE 10C  Ledger + Payouts (manual)      ✓
FASE 10D  Reconciliation                 ✓
FASE 10.5 Disputas + reports + moderación  ✓
FASE 10.6 Observability + jobs + flags     ✓
FASE 10.7 Legal / privacy / beta copy      ✓
FASE 11.0 Web UX E2E Completion Pass       ✓
FASE 11   Mobile                           ✓
FASE 11.5 Auth consistency Web + Mobile  ✓
FASE 12   Colecciones                    ✓
FASE 13   Historial de precios           ✓
FASE 14   Wishlist + alertas             ✓

CATALOG.1 Game-Specific Dynamic Filters  ✓
CATALOG.2 Real Data & Taxonomy Hardening ✓
UI.1      Visual Refresh                 ✓
PS        Pre-Staging Readiness          ✓
PS.1      Final pre-staging cleanup      ✓

MYL.1     Native MyL demo importer       ✓ pack curado (no scrape)
MYL.2     MyL demo sellers/listings      ✓ `catalog:seed-myl-demo`
SELLER.1  Seller storefront              ✓ `/vendedores/{slug}`
CAT.1     CatalogSubmission (user)       ✓
CAT.2     Admin catalog approval         ✓
MARKET.1  Canonical card + offers        ✓
CONTACT.1 Optional seller WhatsApp       ✓
BULK.1    Listing CSV preview contract   ✓ preview; confirm UI pendiente

--- BETA RELEASE PROGRAM (feature freeze) ---
B0        Release Audit                  ✓
B1        Staging                        🟡 contrato + storage/email (hosting operador)
B2        Security                       ✓
B3        Performance                    ✓
B4        QA                             ✓
B5        Production Infrastructure      ✓
B6        Android Beta                   ✓
B7        iOS TestFlight                 ✓
B8        Closed Beta                    🟡 invitaciones = operador

FASE 15   Scanner                        ⏸ congelada
FASE 16   Tiendas                        ⏸ congelada
FASE 17   Subastas                       ⏸ congelada
FASE 18   Intercambios                   ⏸ congelada
FASE 19   Deck builder                   ⏸ congelada
FASE 20   Optimización de compras        ⏸ congelada
```

Núcleo diferencial post-transaccional (no adelantar hasta que 9.6–10.5 estén resueltos):

```text
SCANNER → COLECCIÓN → PRECIOS → WISHLIST → VENDER / COMPRAR
```

## Relación con MVPs de producto

| MVP | Fases | Resultado |
|-----|-------|-----------|
| 1 Catálogo | 0–3 (+ web mínima) | Gente se registra y explora cartas |
| 2 Marketplace | 4–6 | Publicar y “comprar” sin plata real |
| 3 Transacciones | 7–10 | Marketplace usable en Chile (sandbox → prod) |
| App | 11 | Mismos flujos en Expo (misma API) |
| Retención | 12–14 | Colección, precios, wishlist |
| Diferenciación | 15 | Scanner (antes de tiendas/subastas) |
| B2B | 16 | Tiendas |
| Live | 17 | Subastas |
| Segunda etapa | 18–20 | Intercambios, deck builder, carrito óptimo |

## Fase 0 — salida

- Docs v1.1 aceptados.
- Monorepo pnpm + Turborepo generado (`apps/*`, `packages/*`, `prisma/`, `docker/`) **sin features de producto**.
- `CURSOR.md` y reglas Cursor activas.
- CI lint/typecheck. API: `GET /health` y `GET /ready`.

**Estado: scaffold listo.** Siguiente: Fase 1.

## Fase 1 — salida

- Register, login, OAuth Google/Apple, verify, reset, sessions.
- RBAC en `GET /v1/me` (`@Roles` + `RolesGuard`).
- `AuditLog` + `File` en Prisma (uploads aún no).
- Web mínima: `/ingresar`, `/registro`, `/me`, verificar y recuperar.

**Estado: listo.** Siguiente: Fase 2 (catálogo).

## Fase 2 — salida

- Games, sets, cards, variants.
- Importer al menos de **un** TCG (recomendado MTG/Scryfall por calidad de API) + seed Pokémon mínimo.
- Ficha de carta en API y web.

**Estado: listo.** Siguiente: Fase 3 (buscador). No implementar `/buscar` ni `GET /v1/search/cards` aquí.

## Fase 3 — salida

- `GET /v1/search/cards` con q + filtros.
- Página `/buscar` usable.

**Estado: listo.** Siguiente: Fase 4 (marketplace / listings). No implementar listings ni carrito aquí.

## Fase 4 — salida

- Onboarding vendedor (`SELLER` + dirección).
- CRUD listings (crear, pausar, activar, cancelar) con `variantId` obligatorio en singles.
- Precio mercado / mínimo / sugerido desde listings ACTIVE.
- Web: `/vender`, ficha con vendedores, `/listings/:id`, `/vendedores/:slug`, `/me/publicaciones`.

**Estado: listo.** Siguiente: Fase 5 (carrito). No implementar checkout ni pagos aquí.

## Fase 5 — salida

- `Cart` + `CartItem` (guest `cart` cookie + `userId`).
- `GET/PUT/DELETE /v1/cart` sin reservar stock.
- Merge guest → usuario al login.
- Web: `/carrito`, CTA “Agregar al carrito” en ficha y listing.

**Estado: listo.** Siguiente: Fase 6 (órdenes / checkout). No implementar checkout, pagos ni envíos aquí.

## Fase 6 — salida

- Checkout autenticado (email verificado) → una `Order` por vendedor.
- Reserva stock 30 min; transiciones de orden con 404 IDOR y `ORDER_ILLEGAL_TRANSITION`.
- Web: `/checkout`, `/me/compras`, `/me/ventas`.

**Estado: listo.** Siguiente: Fase 7 (pagos).

## Fase 7 — salida

- Preference Mercado Pago + webhook. `approved` deja `Payment` en **HELD**.
- Confirmación de recepción libera (RELEASED). Tablas `WebhookEvent`, `Refund`, `Payout` (payout operativo en admin).
- `/checkout/retorno` hace poll; no confía en la query de MP.

**Estado: listo.** Siguiente: Fase 8 (envíos). No integrar APIs courier aquí.

## Fase 8 — salida

- `GET /v1/shipping/quote` con tabla RM vs regiones (sin API courier live).
- `Shipment` por orden; tracking/meetup viven en el envío. `GET /v1/shipments/:id` con 404 IDOR.
- Checkout usa la cotización (meetup $0). Web: checkout cotiza, tracking a mano + link carrier.

**Estado: listo.** Siguiente: Fase 9 (reputación). No implementar ratings aquí.

## Fase 9 — salida

- `POST /v1/orders/:id/rating` (comprador, orden `COMPLETED`, una por orden).
- `GET /v1/users/:id/ratings` público. Promedio visible en perfil, listings y ficha.
- Web: valorar en `/me/compras/:id`; estrellas en `/vendedores/:slug`.

**Estado: listo.** Siguiente: Fase 9.5A (money safety). No implementar panel admin aquí.

## Fase 9.5A — Money safety (P0-1, P0-2, P0-3)

Checkout, reservas y cobro Mercado Pago deben ser consistentes bajo concurrencia. Un `approved` tardío **no revive** un checkout `EXPIRED`/`CANCELLED`: se registra el Payment, se audita `HIGH_PRIORITY` y se reembolsa en Mercado Pago (P0-3).

- [x] P0-1 — carrera Mercado Pago vs expiración de checkout
- [x] P0-2 — transiciones financieras con `SELECT … FOR UPDATE` (checkout → orders → listings)
- [x] P0-3 — refund real Mercado Pago

**Estado: listo.** Siguiente: Fase 9.5B (P0-4 JWT, P0-5 firma webhook). No Admin.

## Fase 9.5B — Security (P0-4, P0-5)

- [x] P0-4 — `JWT_ACCESS_SECRET` obligatorio, sin fallback `dev-only-change-me`
- [x] P0-5 — firma webhook Mercado Pago fail-closed si la integración MP está habilitada

**Estado: P0-4 y P0-5 listos.** Siguiente: Fase 9.5C (CI con tests, E2E crítico). No Admin.

## Fase 9.5C — Release gate

Ningún cambio se integra si rompe seguridad, stock, checkout, pagos o build.

- [x] CI con PostgreSQL 16, `prisma migrate deploy`, lint, typecheck, tests, build
- [x] Integración Postgres (concurrencia, refunds, smoke qty=1)
- [x] `MercadoPagoPaymentProvider` fail-closed (sin `approved` ficticio)
- [x] Replay window de webhook (`ts` ≤ 300s) documentada

**Estado: listo.** Siguiente: Fase 9.6 (arquitectura Mercado Pago Marketplace / Split). No Admin.

## Fase 9.6 — Mercado Pago Marketplace (decisión)

- Análisis: [proposals/MP-MARKETPLACE-ARCHITECTURE.md](proposals/MP-MARKETPLACE-ARCHITECTURE.md)
- Canónico corto: [adr/0008-marketplace-payment-model.md](adr/0008-marketplace-payment-model.md)
- Semántica: [07-PAYMENTS](07-PAYMENTS.md)

**Aceptada (provisional):** Opción A — cuenta MP plataforma, un pago por checkout multivendedor, ledger interno, payout posterior. No Split 1:1, no OAuth seller.

`HELD`/`RELEASED` son internos. MP no es escrow. **Production gate:** no plata real hasta validación contractual/legal/comercial.

**Estado: decisión documentada.** 10A–10.6 implementados. No adelantar Mobile.

## Fase 10 — Admin de dinero (cuatro incrementos)

Diseño: [proposals/FASE-10-ADMIN-MONEY.md](proposals/FASE-10-ADMIN-MONEY.md). Misma API. Sin pantallas que muten la DB a mano.

| Inc | Qué | Prisma | Estado |
|-----|-----|--------|--------|
| **10A** | Dashboard: GMV, órdenes, dinero aproximado, alertas; listados lectura | no | **listo** |
| **10B** | Consola órdenes/pagos/refunds; retry refund | no (estados Refund existentes) | **listo** |
| **10C** | `PayoutItem`, ledger append-only, `PayoutProvider` manual, saldo seller | sí | **listo** |
| **10D** | Conciliación MP vs DB; `ReconciliationRun`/`Issue`; job `pnpm recon:day` | sí | **listo** |

Payouts del MVP: **manuales**. No automatizar transferencias el día uno.

**10D listo.** Semántica: [RECONCILIATION.md](RECONCILIATION.md).

## Fase 10.5 — Moderación y soporte

**Estado: implementado** (sin `SupportCase` / chat). Contrato: [TRUST-AND-MODERATION.md](TRUST-AND-MODERATION.md).

- `Dispute`, `DisputeMessage`, `DisputeEvidence`, `Report`, `ListingRevision`, `ModerationAction`, `SellerSuspension`.
- Una disputa activa por orden. No mueve dinero. Report no suspende solo.
- UI: `/me/disputas`, reportar listing, admin `/admin/disputes|reports|moderation`.
- MODERATOR: disputas/reportes/pause listing. No ledger/payouts. Suspender seller: ADMIN+.

## Fase 10.6 — Observability + jobs + flags

**Estado: implementado.** Contrato: [OBSERVABILITY-AND-OPERATIONS.md](OBSERVABILITY-AND-OPERATIONS.md). Runbook: [runbooks/BETA-OPERATIONS.md](runbooks/BETA-OPERATIONS.md).

- Logging JSON, `X-Request-Id`, métricas in-process, error tracking deshabilitado por defecto.
- Feature flags + kill switches (env). Scheduler in-process + `JobRun` (un RUNNING por jobName).
- Dispute activa excluye obligación de `availableClp` y cancela payout PENDING/APPROVED.
- Suspender seller auto-pausa listings ACTIVE; restore no reactiva.
- Evidencia privada `GET /v1/disputes/:id/evidence/:evidenceId/file`.

## Fase 10.7 — Legal / privacy / beta copy / release compliance

**Estado: implementado.** Contrato: [LEGAL-BETA.md](LEGAL-BETA.md). Stores: [release/STORE-READINESS.md](release/STORE-READINESS.md).

- Páginas `/terminos` `/privacidad` `/marketplace` `/refunds` `/ayuda`.
- Signup exige aceptación (checkbox no preseleccionado). Versiones `LEGAL.termsVersion` / `privacyVersion` en `User`.
- Marketing opt-in separado. Reconsentimiento automático: no en esta fase (`legal.stale` detectable).
- Copy de pagos sin escrow/retención de Mercado Pago. Compra Protegida = reglas internas.
- Baja = desactivación; no se borran Order/Payment/Refund/Ledger/AuditLog.
- `POST /v1/feedback` con rate limit. Gate `REAL_PAYMENTS_LEGAL_APPROVED` en producción.
- `ENABLE_REAL_PAYMENTS` sigue en `false`. No pagos live.

## Fase 11.0 — Web UX E2E Completion Pass

**Estado: implementado.** QA manual: [release/WEB-BETA-QA.md](release/WEB-BETA-QA.md).

Pass de usabilidad sobre la web ya existente (buyer, seller, trust). No es Mobile. No Scanner/Stores/Auctions/Collection/Prices/Wishlist. No pagos live.

- Flujos buyer/seller completables por un tester externo (loading, vacío, error, disabled, éxito, sin callejones).
- Checkout sandbox explícito (“Pago de prueba / sandbox”). Retorno con polling al backend.
- Timeline de orden derivada de timestamps/estado (sin inventar eventos).
- Auth email/password completa en web; `legal.stale` no bloquea; sin botones OAuth rotos.
- Playwright: `buyer-happy-path`, `seller-happy-path`, `dispute-path`. Seed `pnpm beta:seed`.
- Gate: `pnpm test:e2e` además de lint/typecheck/test/integration/build.

Siguiente (hecho): Fase 11 Mobile.

## Fase 11 — Mobile

**Estado: listo (MVP beta).** Siguiente: Fase 11.5 Auth (hecho). Push/stores submit siguen diferidos. No adelantar Colección (12).

React Native / Expo Router contra **la misma API**. Tabs (Fase 12): Inicio, Buscar, Colección, Favoritos, Carrito, Perfil. Sin scanner/stores. Auth email + SecureStore para refresh. Checkout sandbox + deep link `tcgplatform://checkout-return` con polling (no se confía el query). Compras, ventas, listings seller, disputas, reportes, feedback. Notificaciones in-app/push: placeholder honesto (API aún no existe). EAS perfiles development/preview/production. QA: [release/MOBILE-BETA-QA.md](release/MOBILE-BETA-QA.md).

## Fase 11.5 — Auth consistency (listo)

Google (web + mobile) y Apple (iOS) sobre la misma API e `AuthIdentity`. Linking explícito, unlink seguro, password para usuarios OAuth, rotación de refresh, settings `/me/seguridad` y `/security`. Consentimiento legal en alta OAuth. Stub de CI (`AUTH_STUB_OAUTH`). Ver [AUTH-IDENTITY-AND-SESSIONS.md](AUTH-IDENTITY-AND-SESSIONS.md).

**No incluido (diferido, no es Fase 12):** push tokens, universal links de host público, submit a stores.

**Estado: listo.** Colecciones entregadas en Fase 12.

## FASE 12 — Colecciones ✓

Colección personal Web + Mobile. Lotes de compra, resumen, valor estimado live de listings ACTIVE, P/L solo con costo+estimado, progreso de set (cartas, no variantes), faltantes, vender-desde-colección (prefill, sin auto-crear listing). Al COMPLETED, descuento de lote si hay `sourceCollectionItemId`. Ver [COLLECTIONS.md](COLLECTIONS.md).

**No incluido (Fase 15+):** scanner, CSV import, share, folders, PDF.

**Estado: listo.** Historial de precios entregado en Fase 13. Wishlist en Fase 14.

## FASE 13 — Historial de precios ✓

Serie diaria `CardPrice` (`LISTING_MIN`, `LISTING_AVG`, `SALE`) por variante con actividad. Ficha web/móvil: rangos 1m/3m/6m/1a, última venta, mediana 30d, menor listing, confianza, índice **TCG Market Chile** (ventas COMPLETED, no terceros). `CollectionValueSnapshot` y variación 30 días en resumen de colección. Flag `ENABLE_PRICES`. Ver [17-COLLECTION-PRICES-WISHLIST](17-COLLECTION-PRICES-WISHLIST.md).

**No incluido (Fase 15+):** scanner, CSV import, share, folders, PDF, import de TCGPlayer/Cardmarket como precio Chile.

**Estado: listo.** Wishlist entregada en Fase 14.

## FASE 14 — Wishlist + alertas ✓

Wishlist privada (no favoritos ni colección). Precio objetivo CLP, alerta `WISHLIST_HIT` al aparecer listing ACTIVE ≤ objetivo, sin spam del mismo listing; si baja más, avisa de nuevo. `PRICE_DROP` opt-in. Web `/me/wishlist` y `/me/notificaciones`; mobile `/wishlist`. Flag `ENABLE_WISHLIST`. Al `Order.COMPLETED`, descuento de lote con `sourceCollectionItemId` (idempotente) y CTA “Añadir a colección” en la compra. Ver [17-COLLECTION-PRICES-WISHLIST](17-COLLECTION-PRICES-WISHLIST.md).

**No incluido (Fase 15+):** scanner, push tokens, tiendas, subastas.

**Estado: listo.** Siguiente: **UI.1 Visual Refresh** (hecho). **CATALOG.1** filtros por juego (hecho). Luego B0–B8. Fases 15–20 congeladas hasta cerrar B8.

## CATALOG.1 — Game-Specific Dynamic Filters ✓

Filtros de búsqueda por `game.slug` con `Card.attributes` JSON validado. Sin columnas Prisma por TCG. Metadata `GET /v1/games/:slug/filters`. Search `attr.*` con whitelist. Support **PARTIAL** mientras no existan importers oficiales (Pokémon API, Konami, MyL, Digimon, Gundam). Doc: [catalog/GAME-FILTERS](catalog/GAME-FILTERS.md), [catalog/CARD-ATTRIBUTES](catalog/CARD-ATTRIBUTES.md).

**No incluido:** Scanner, Deck Builder, facet counts, Digimon/Gundam seed.

**Estado: listo.** Siguiente: **CATALOG.2** (hecho). No inicia Fase 15.

## CATALOG.2 — Real Data & Taxonomy Hardening ✓

Corrige taxonomías de CATALOG.1 con data real (fixtures verificadas + Pokémon TCG API importer + Scryfall P/T y `cardTypes[]`). Showcase ficticio se marca `SYNTHETIC` y no prueba filtros. Support sigue **PARTIAL**. Doc: [catalog/GAME-FILTERS](catalog/GAME-FILTERS.md), [catalog/CARD-ATTRIBUTES](catalog/CARD-ATTRIBUTES.md), [catalog/REAL-DATA-SOURCES](catalog/REAL-DATA-SOURCES.md), [catalog/CATALOG2-AUDIT](catalog/CATALOG2-AUDIT.md).

**No incluido:** Scanner, Deck Builder, import masivo production, FULL support, legality MyL.

**Estado: listo.** No inicia Fase 15.

## UI.1 — Visual Refresh ✓

Refresh visual marketplace (web + mobile) entre Fase 14 y el Beta Release Program. Tokens, Light/Dark/System, header TCG MARKET, home, search, ficha, colección, wishlist, carrito/checkout, perfil. **Sin** cambios de API, Prisma, pagos, ledger, jobs ni flags. **No** inicia Scanner.

Doc: [design/DESIGN-SYSTEM.md](design/DESIGN-SYSTEM.md).

**Estado: listo.** Siguiente en repo: **PS Pre-Staging Readiness** (hecho). Luego B0–B8. No Scanner.

## PS — Pre-Staging Readiness ✓

Cierra lo que **no** depende de cuentas externas (dominio, Railway, Neon, R2, Resend, Apple, EAS). Objetivo: cuando existan esas cuentas, el despliegue sea pegar secretos, DNS, migrar y publicar.

Orden de este bloque: UI/UX → auditoría de release → P0/P1 de código → seed de vitrina → performance local → QA documentado → branding + templates de email. **No** inicia Scanner, Tiendas ni Subastas.

Entregado en repo:

- Seed de vitrina (`seedShowcase` en `pnpm beta:seed`): Pokémon, Magic, One Piece + Yu-Gi-Oh y Mitos y Leyendas **solo demo**, sellers ficticios, listings, historial `LISTING_MIN`, colección y wishlist del buyer. `SHOWCASE_COLLECTION_SIZE` para lotes grandes locales.
- Templates HTML de correo (verificar, reset, notificaciones). El envío real sigue bloqueado sin Resend/SMTP.
- Hardening web: skeletons, 404/500, `reason=expired`, banner offline, anti doble-submit en checkout.
- Índices de listado/precios/wishlist/colección revisados; script `pnpm db:explain`.
- Identidad mobile documentada (`cl.tcgplatform.app`, scheme `tcgplatform`) **sin** abrir Expo.
- Guías: [TESTER-GUIDE](release/TESTER-GUIDE.md), [QA-MANUAL](release/QA-MANUAL.md), [PRE-STAGING-READINESS](audits/PRE-STAGING-READINESS.md).

**Estado: listo en repo.** P0 de publicación = operador (B1/B6/B7/B8). `ENABLE_REAL_PAYMENTS=false`. **PS.1** env staging + hide synthetic en REST catálogo + runbook de bootstrap.

## PS.1 — Final pre-staging cleanup ✓

Deja `main` listo para B1: `.env.staging.example` con `SHOW_SYNTHETIC_CATALOG=false`, preflight WARNING si el showcase sintético sigue visible, hide en search **y** `GET /v1/games|sets|cards`, seed-reference sin listings, runbook [STAGING-CATALOG](runbooks/STAGING-CATALOG.md). No Scanner.

**Estado: listo.** Siguiente: cuentas B1 (operador). No Fase 15.

## MYL.1 / MYL.2 — Demo Mitos y Leyendas ✓

Catálogo canónico vs inventario: el dueño/admin controla `Card`; el vendedor solo crea `Listing` sobre un `variantId`. **No** hay `CatalogSubmission` todavía (CAT.1).

- **No scrapear** MyL Serena, Stribog, Tradeck ni otros marketplaces. Los scripts Java/Python de un repo anterior no se portan.
- Pack curado en `apps/api/src/catalog/myl-demo` (`source=myl-demo-pack`, `sourceQuality=CURATED_VERIFIED`, `verified=false`). Stats incompletos a propósito (PARTIAL).
- `pnpm catalog:import-myl` — upsert de cartas/sets, sin listings.
- `pnpm catalog:seed-myl-demo` — reference + pack + 3 vendedores demo + listings. Idempotente. Correos `@example.test`.

## SELLER.1 — Storefront del vendedor ✓

`/vendedores/{slug}` es una mini tienda: header (comuna, reputación, ventas, stock), búsqueda/filtros (q, juego, edición, condición, orden) y grid de `ProductCard`. CTA principal sigue siendo el listing → carrito. **No** WhatsApp como checkout. **No** Fase 16 Stores B2B.

**No en este incremento:** CAT.1 cola de cartas, CONTACT.1, BULK.1, CART.1/2, Scanner, Auctions, pagos live.

## Feature freeze (B0–B8)

Durante el Beta Release Program **no** se implementa Scanner, Stores, Auctions, Trades, Deck Builder, Cart Optimizer, pagos live ni payouts automáticos. El orden de Fases 15–20 no cambia; solo se pospone hasta B8.

Auditoría canónica: [audits/BETA-RELEASE-AUDIT-2026-08.md](audits/BETA-RELEASE-AUDIT-2026-08.md).

| Fase | Qué | Estado |
|------|-----|--------|
| **B0** Release Audit | Inventario real post-F14; P0/P1; GO/NO-GO | [BETA-RELEASE-AUDIT-2026-08](audits/BETA-RELEASE-AUDIT-2026-08.md) ✓ |
| **B1** Staging | Contrato 12-factor, R2/Minio, Resend/SMTP, fail-fast, `ENABLE_REAL_PAYMENTS=false`. Hosting: operador | 🟡 [OPERATOR-KICKOFF](release/OPERATOR-KICKOFF.md) |
| **B2** Security | CSP/HSTS Next + Helmet API, `pnpm audit:deps`, `applySaleDeduction` en el tx de confirm, `loginHref` seguro, `ADMIN_IP_ALLOWLIST`, Listing.seller Restrict | ✓ |
| **B3** Performance | Load test search/card/collection/prices/wishlist/checkout/admin; SALE=`completedAt`; calendario Chile; captura/wishlist paginadas; sort estimado SQL | ✓ |
| **B4** QA | Checklists web/mobile/admin (F12–14 + in-app); Playwright admin refund/payout; Maestro opcional. Staging cloud = operador B1 | ✓ [B4-QA](release/B4-QA.md) |
| **B5** Production infrastructure | Sentry (`SENTRY_DSN`), backups/restore, Redis líder de jobs (sin BullMQ) | ✓ [PRODUCTION](runbooks/PRODUCTION.md) |
| **B6** Android Beta | EAS preview interno (no Play submit) | ✓ [B6-ANDROID-BETA](release/B6-ANDROID-BETA.md) |
| **B7** iOS TestFlight | EAS + Apple (no App Store submit) | ✓ [B7-IOS-TESTFLIGHT](release/B7-IOS-TESTFLIGHT.md) |
| **B8** Closed Beta | Testers invitados, sandbox, sin plata real | 🟡 invitaciones = operador. In-app `SALE_MADE`/`PURCHASE_MADE`/envío/cancel/disputa/rating ✓ [B8-CLOSED-BETA](release/B8-CLOSED-BETA.md) |

## M1 — Seller Plans + Fee Engine

**Estado: listo.** Planes FREE / PLUS / PRO / STORE, caps, promo `LAUNCH_3_PERCENT`, snapshot por Order, admin manual. **No** pagos live, **no** billing de suscripción, **no** Scanner/Stores/Auctions. Doc: [SELLER-PLANS-AND-FEES](SELLER-PLANS-AND-FEES.md).

## M2 — Subscription Billing (futuro, no implementar)

Cobro real de mensualidades (Mercado Pago u otro). `SellerSubscription.source = FUTURE_BILLING_PROVIDER`. No forma parte de M1.

## Fases 13–17

| Fase | Qué |
|------|-----|
| 13 Historial de precios | ventas reales + listings; mediana; confianza; TCG Market Price |
| 14 Wishlist + alertas | carta + condición + idioma + precio máx; alerta al aparecer listing |
| 15 Scanner | identificar / colección / vender / precio / lote inventario |
| 16 Tiendas | Store, StoreMember, inventario, CSV, panel, pedidos, retiro en tienda |
| 17 Subastas | WebSocket, bids, anti-sniping, cierre seguro, idempotencia |

## Fases 18–20 (segunda etapa)

Intercambios / “Tengo–Quiero”, deck builder, optimizador de carrito. Torneos/eventos y detección asistida de falsificaciones se modelan después.

## Fases 11+

No se implementan pantallas “de mentira” que llamen APIs inexistentes. Fase 11 no muestra tab Escanear. El centro de notificaciones in-app existe (Fase 14); push tokens siguen diferidos.

## Criterio para cambiar el roadmap

Un cambio de orden se documenta aquí **antes** de ejecutarlo. Default: 10A→10B→10C→10D→10.5→10.6 antes de Mobile.

Backlog de producto (confianza, compra, colección, comunidad, ops): [23-PRODUCT-BACKLOG](23-PRODUCT-BACKLOG.md). No adelantar esas features porque “destacan”. El optimizador de carrito es prioridad de producto alta y Fase 20 de código; subirlo se decide aquí primero.
