# Auditoría técnica — TCG Platform

**Fecha:** 20 agosto 2026  
**Alcance:** código y `/docs` en `main` tras Fase 9 (reputación).  
**Método:** lectura de la spec obligatoria, `prisma/schema.prisma`, `apps/api/src`, `apps/web`, `apps/admin`, `apps/mobile`, CI y paquetes compartidos.  
**Restricción:** este documento no implementa cambios. No adelanta Fase 10 (Admin).

Nombre de trabajo del producto: **TCG Market Chile**. Backend único NestJS + PostgreSQL.

---

## Dictamen

La plataforma está **bien encaminada como MVP de marketplace chileno**, con decisiones correctas en el núcleo: Prisma como única fuente de esquema, dinero en CLP entero, comisión snapshot en servidor, stock reservado con `UPDATE … WHERE` atómico, webhook de Mercado Pago que deja el pago en `HELD` (nunca `RELEASED`), y patrón IDOR 404 en órdenes, envíos y ratings.

No está lista para operar dinero real. Los huecos críticos están en **concurrencia del checkout vs. cobro**, **reembolsos que no hablan con Mercado Pago**, **secretos que fallan abiertos**, **webhooks sin prueba de idempotencia real**, y **ausencia de jobs** (expirar reservas, auto-confirmar recepción). El roadmap marca Fases 0–9 como listas; eso es cierto para el *happy path* documentado de cada fase, no para el criterio de salida de [01-REQUIREMENTS.md](../01-REQUIREMENTS.md) MVP 3 ni para [07-PAYMENTS.md](../07-PAYMENTS.md) en producción.

**Recomendación:** no abrir Fase 10 (Admin) hasta cerrar una **Fase 9.5 — Hardening** (propuesta al final). Admin sobre un flujo financiero con carreras y reembolsos locales agrava el riesgo operativo.

| Severidad | Cantidad |
|-----------|----------|
| P0 crítico | 5 |
| P1 alta | 16 |
| P2 importante | 18 |
| P3 mejora | 12 |

---

## Scorecard (27 áreas)

Leyenda: **OK** alineado a la fase actual · **PARCIAL** existe con huecos · **GAP** ausente o en contradicción con `/docs` · **N/A** fuera de la fase actual (no es deuda de Fase 9).

| # | Área | Estado | Comentario corto |
|---|------|--------|------------------|
| 1 | Arquitectura | PARCIAL | Monorepo API-first correcto. Webpack Nest, Redis sin uso, stack web distinto a `docs/02`. |
| 2 | Modelo de datos | PARCIAL | Fases 1–9 bien migradas + CHECKs. Enums muertos (`CONFIRMED`, `APPROVED`). `Listing.storeId` sin `Store`. |
| 3 | Auth | PARCIAL | Email+password, refresh reuse, OAuth API. Web sin Google/Apple. JWT con fallback inseguro. |
| 4 | RBAC | PARCIAL | `RolesGuard` global. Sin CASL. `@Roles(ADMIN)` en listings no da poder de moderación. |
| 5 | Catálogo | PARCIAL | 3 juegos + Scryfall. Pokémon/One Piece solo seed. Fotos listing no se muestran. |
| 6 | Search | OK | FTS `pg_trgm`/`unaccent`, filtros, sort. Falta medición p95. |
| 7 | Listings | PARCIAL | CRUD + ownership 404. Fotos deferred. Orden reputación no aplica en SQL. |
| 8 | Stock | PARCIAL | Reserva/consumo atómicos. Expiración perezosa; carrera con el cobro. |
| 9 | Cart | OK | Guest cookie, merge, sin reservar. Guest race menor. |
| 10 | Checkout | PARCIAL | Totales en servidor. `Idempotency-Key` opcional. Expiración 30 min frágil. |
| 11 | Orders | PARCIAL | Transiciones + audit. `CONFIRMED` no se usa. Disputa no congela nada extra. |
| 12 | Payments | PARCIAL | HELD correcto. Refund/Payout son tablas vacías de comportamiento. |
| 13 | Mercado Pago | PARCIAL | Preference + webhook. `simulate` bien acotado. Firma y reconcilación incompletas. |
| 14 | Webhooks | PARCIAL | Unique `(provider, eventId)` insuficiente (TOCTOU, `Date.now()`, firma opcional). |
| 15 | Shipping | OK | Tabla RM/REGIONS, meetup $0, `STORE_PICKUP` rechazado. Quote usa Prisma fuera del `tx`. |
| 16 | Ratings | OK | Una por orden `COMPLETED`, IDOR 404, promedio público. Falta “% a tiempo”. |
| 17 | Seguridad | PARCIAL | Helmet, CORS, argon2id, Zod. Secretos, MIME, token en `sessionStorage`. |
| 18 | Concurrencia | GAP | Sin `FOR UPDATE` / isolation en checkout, expire, webhook, refresh. |
| 19 | Idempotencia | PARCIAL | Checkout key opcional. Webhook unique sin lock. Simulate no es idempotente. |
| 20 | Tests | PARCIAL | ~16 specs Vitest, Prisma mockeado. Sin webhook fixtures, testcontainers ni E2E. |
| 21 | CI/CD | GAP | Solo lint + typecheck. No test, no `pnpm audit`, no Postgres, no deploy. |
| 22 | Observabilidad | GAP | Logger Nest default. Sin Pino, request-id, métricas ni alertas MP. |
| 23 | Performance | PARCIAL | Search razonable. Catálogo `SkipThrottle`. Sin índices/SLA medidos. |
| 24 | SEO | GAP | Rutas slug sí; `robots: noindex` global, sin sitemap, sin `generateMetadata`. |
| 25 | Accesibilidad | GAP | Algunos `<label>`. Imagen de carta `alt=""`. Sin objetivo WCAG medido. |
| 26 | Mobile readiness | N/A | Placeholder Expo Fase 0. Honesto. No listo. |
| 27 | Admin readiness | N/A | Scaffold “Fase 0”. Sin `/v1/admin`. Correcto no adelantar. |

---

## Lo que está bien (no tocar en 9.5 salvo tests)

- Un solo backend; web/admin/mobile no importan Prisma.
- CLP `Int`, comisión `commissionClp(subtotal)` snapshot, `orders_total_matches` = subtotal + envío (la comisión no se cobra al comprador).
- `reserveStock` / `consumeReservedStock` con `UPDATE … WHERE quantity - quantity_reserved >= qty` (no read-modify-write).
- Webhook `approved` → `Payment.status = HELD`, `Order PAID`. Comentario explícito de no payout.
- `POST /v1/payments/simulate` rechaza si hay `MP_ACCESS_TOKEN`.
- Return URL de MP no marca pagado; `/checkout/retorno` hace poll a `GET /v1/checkouts/:id`.
- IDOR: órdenes, shipments, ratings, files, addresses responden 404, no 403.
- Guards globales `AccessAuthGuard` + `RolesGuard` + `ThrottlerGuard`.
- Refresh reuse: refresh revocado revoca todas las sesiones del usuario.
- CHECKs SQL de dinero, stock `quantity_reserved <= quantity`, carrito identidad, ratings 1–5.
- `STORE_PICKUP` existe en el enum y la API lo rechaza (Fase 15).
- Tipos en `packages/types` / Zod en `packages/validation`. Casi no hay `any` de producto.

---

## Evaluación por área

### 1. Arquitectura

Cumple el principio API-first: mutaciones pasan por Nest. Módulos reales: `auth`, `users`, `catalog`, `search`, `listings`, `cart`, `orders`, `payments`, `shipping`, `ratings`, `files`, `audit`. No hay controladores stub 200 de Fases 11–17.

Desvíos respecto a [02-ARCHITECTURE.md](../02-ARCHITECTURE.md):

- Passport no se usa; JWT se verifica a mano en `AccessAuthGuard`. Aceptable si se documenta.
- BullMQ/Redis: Redis está en Compose y `REDIS_URL` en `.env.example`, **ningún código lo consume**.
- Web: sin TanStack Query, sin shadcn, sin Zustand. `packages/ui` es solo `cx()`. Fetch ad hoc + `sessionStorage`.
- `CheckoutController` vive en `PaymentsModule` para inyectar `PaymentsService` (el `OrdersModule` no importa pagos). Acoplamiento circular evitado con un parche de módulos.
- Nest `webpack: true` + `webpack-node-externals` por pnpm hoisting de Prisma/argon2. Deuda operativa: hay que reiniciar el API tras `prisma generate`.

### 2. Modelo de datos

Prisma cubre Fases 1–9. No hay `WishlistItem`, `Collection`, `Store`, `Auction`, `Notification`, `Report` — correcto (no adelantar tablas de fases futuras).

Huecos / enums mal usados:

- `OrderStatus.CONFIRMED` nunca se persiste; `confirm()` salta a `COMPLETED`.
- `PaymentStatus.APPROVED` nunca se escribe; el flujo usa `PENDING` → `HELD` → `RELEASED`.
- `ListingStatus.DRAFT` y `ShipmentStatus.LABEL_CREATED` / `IN_TRANSIT` / `FAILED` no tienen transiciones.
- `Listing.storeId` UUID suelto sin FK (previsto Fase 15). Riesgo: basura silenciosa si alguien lo llena.
- `Profile.storeId` está en [03-DATABASE.md](../03-DATABASE.md) y **no** en Prisma.
- `User.slug` es `unique` NOT NULL; el doc lo marca nullable.
- IDs `@default(uuid())` = UUID v4, no v7 como sugiere el doc.
- `SchemaMeta` residual de Fase 0.

Integridad buena en migraciones (`listings_reserved_lte_quantity`, `listings_single_has_variant`, montos).

### 3. Auth

Implementado: register/login, verify, reset, sessions, Google/Apple **en API**, cookie `Refresh` httpOnly SameSite=Lax, access 15 min, refresh 30 días, `tokenVersion`, ban check.

Huecos:

- Login/registro web **solo email+password**. OAuth no tiene UI.
- Access token en `sessionStorage` (`apps/web/lib/api.ts`), no “en memoria” como [05-AUTH.md](../05-AUTH.md).
- Login/refresh **devuelven `refreshToken` en JSON** además de la cookie. XSS en la web puede leer el body.
- Rotación de refresh no es atómica: revoke + `issueTokens` en dos pasos.
- `JWT_ACCESS_SECRET` cae a `"dev-only-change-me"` si falta env (`auth.module.ts`).
- Rate limit forgot-password es por IP (Throttler), no email+IP como el doc.

### 4. RBAC

`@Roles` + `RolesGuard`. Prohibición `if (user.isAdmin)` respetada. Ownership en servicios.

Problemas:

- Sin `PoliciesGuard`/CASL. Staff (`MODERATOR|ADMIN|SUPER_ADMIN`) puede **confirmar y liberar pago** de cualquier orden (`requireBuyer` trata staff como comprador). Hoy no hay UI para otorgar esos roles, pero un row en `user_roles` basta.
- `@Roles("…ADMIN…")` en `ListingsController` **no** permite pausar listings ajenos: `requireOwnedMutable` exige `sellerId === userId`. El rol admin en el controller es cosmética.
- `GET /v1/me` exige uno de los roles listados; un usuario sin `USER` (solo imaginable por data corrupta) queda fuera.

### 5. Catálogo

Games/sets/cards/variants, ficha por slug e id, favoritos, Scryfall, seed de 3 juegos. Importer Pokémon TCG API y One Piece **no existen** (Fase 2 pedía al menos un TCG; Scryfall cumple el mínimo).

Fotos de listing: `File` deferred (`uploadUrl: null`); `complete` marca `READY` sin bytes. La ficha `/listings/:id` **no renderiza** `images`. El comprador compra a ciegas. Contrario a [06-MARKETPLACE.md](../06-MARKETPLACE.md) (fotos obligatorias visibles).

### 6. Search

`GET /v1/search/cards` con `q`, filtros, `priceMin/Max`, sort relevance/releasedAt/price. Queries parametrizadas (`Prisma.sql`). Empty criteria → `{ items: [], total: 0 }`. Throttle 60/min. Página `/buscar` alineada.

Falta: medición p95 < 300 ms de [01-REQUIREMENTS.md](../01-REQUIREMENTS.md). Catálogo entero tiene `@SkipThrottle()`.

### 7. Listings

CRUD, `variantId` obligatorio, onboarding + email verificado, price suggestion, perfil `/vendedores/:slug`. Orden público: solo `priceClp asc`, no reputación después del precio (el doc lo pide). Admin no modera.

### 8. Stock

Política correcta: carrito no reserva; checkout sí; `PAID` consume `quantity` y baja reserved. CHECK SQL. `releaseStock` / `restoreSoldStock` **no verifican** `rows === 1` (fallo silencioso).

Expiración **solo perezosa** (`expireIfNeeded` al leer checkout/orden o al aplicar pago). Si nadie vuelve, el stock queda reservado indefinidamente.

### 9. Cart

Cookie `cart` httpOnly, merge al login, `OWN_LISTING` 403, stock check al PUT. Guest: dos tabs sin cookie pueden crear dos carritos. Merge no cubre todos los races de unique `userId`.

### 10. Checkout

Totales y envío se calculan **en el servicio** (`quoteFromPlaces` + `commissionClp` + `reserveStock`). La web suma quotes solo para mostrar; el POST no manda montos. Bien.

`Idempotency-Key` opcional. `GET /v1/checkouts/:id` intenta `createPreference` en cada poll (llamadas extra a MP).

### 11. Orders

Máquina de estados en `OrdersService` (no en controllers). Audit en transiciones. Disputa: solo `status = DISPUTED` y pisa `notes`; no hay entidad `Report`/`Dispute`; el dinero sigue `HELD` (correcto) pero no hay resolución.

`confirm` exige `DELIVERED` + pago `HELD`. No hay auto-confirm a N días ([07-PAYMENTS.md](../07-PAYMENTS.md)).

### 12–14. Payments / Mercado Pago / Webhooks

Preference con `external_reference = checkoutId`, `notification_url`, `auto_return`. Payload MP no se expone al cliente (`toPaymentView` solo status/montos/fechas).

Problemas graves: firma opcional fuera de `production`, idempotencia del webhook incompleta, `applyRejected` ignora `refunded` si la orden ya no está `PENDING_PAYMENT`, cancelación `PAID` marca `Refund` local `PENDING` **sin API MP**, `Payout` sin servicio.

### 15. Shipping

Quote RM vs REGIONES, meetup $0, tracking a mano + URL carrier. `quoteFromPlaces` usa `this.prisma` **dentro** del `$transaction` de checkout (otra conexión). Baja probabilidad, mal patrón.

### 16. Ratings

Alineado a Fase 9. Promedio solo `isPublic`. Perfil doc pide “123 ventas · 98% a tiempo”: no hay conteo de ventas ni puntualidad.

### 17–19. Seguridad, concurrencia, idempotencia

Ver hallazgos P0/P1. Helmet + CORS allowlist + cookies SameSite. Sin CSRF token (aceptable mientras el access no vaya en cookie). MIME de files es `z.string()`, no allowlist de imagen. `files.complete` no comprueba objeto en storage.

### 20–21. Tests y CI

16 archivos `*.spec.ts`, todo con Prisma mock. `orders.service.spec` cubre HELD vs RELEASED (bueno). **No hay** `payments.service.spec`, ni fixture de webhook, ni testcontainers, ni Playwright en el repo (sí aparece transitivo en el lockfile).

`.github/workflows/ci.yml`: `pnpm install` + lint + typecheck. **No corre `pnpm test`**. Sin servicio Postgres. Sin `pnpm audit`. Sin job de migrate/deploy ([14-DEPLOYMENT.md](../14-DEPLOYMENT.md)).

### 22–23. Observabilidad y performance

Sin Pino JSON, sin request-id, sin métricas, sin alerta de webhook fallido. Health: `/health` liveness, `/ready` ping Prisma. Logs de verificación de email en dev si no hay Resend.

Performance: search con GIN; listings cargan reputación en un `groupBy` extra (OK). Webpack watch + Prisma cache es el dolor local más visible.

### 24–25. SEO y accesibilidad

Rutas canónicas `/{game}/{set}/{card}` existen. Layout global: `robots: { index: false, follow: false }`. Sin `sitemap.xml`, sin OG por ficha, sin `generateMetadata`. Contrario a [09-WEB.md](../09-WEB.md) si se interpretara como “ya lanzado”; coherente con “no indexar hasta marca/legal”. Hay que decidirlo explícitamente.

A11y: formularios de auth tienen label. Ficha de carta usa `alt=""`. Sin skip link, sin contraste auditado, sin WCAG 2.2 AA en checkout.

### 26–27. Mobile y Admin

`apps/mobile`: pantalla única “Fase 0”. `apps/admin`: copy “auth RBAC llega en Fase 10”. Ninguno llama APIs inventadas. **No implementar Admin hasta cerrar 9.5.**

---

## Hallazgos

Cada hallazgo: problema, archivo(s), riesgo, solución, esfuerzo (Small / Medium / Large), fase recomendada.

### P0 — Crítico

#### P0-1 — Cobro de Mercado Pago vs. expiración de checkout

- **Problema:** `applyApproved` llama primero a `expireIfNeeded`. Si `expiresAt` ya pasó, se libera stock y el checkout queda `EXPIRED`; después el cobro `approved` lanza `CHECKOUT_EXPIRED`. El dinero ya está en MP. La inversa concurrente (expire y consume a la vez) también deja cobro sin orden pagada.
- **Archivos:** `apps/api/src/orders/orders.service.ts` (`expireIfNeeded`, `applyApproved`); `apps/api/src/payments/payments.service.ts`.
- **Riesgo:** dinero capturado sin orden; stock liberado y posiblemente revendido; chargebacks; pérdida de confianza.
- **Solución:** no expirar un checkout con pago `approved` en MP. En el webhook: `SELECT … FOR UPDATE` del checkout; si está expirado **y** MP dice approved → reabrir o crear compensación (refund automático). Job de expiración que consulte MP antes de soltar stock. Preferencia MP con `expiration` alineada a `expiresAt`.
- **Esfuerzo:** Large.
- **Fase:** 9.5.

#### P0-2 — Transiciones financieras sin lock de fila

- **Problema:** `expireIfNeeded`, `applyApproved`, `applyRejected` y `cancel` leen status fuera de transacción (o en transacción sin `FOR UPDATE`). Isolation default Read Committed. Dos workers pueden intercalar expire + pay o dos expires.
- **Archivos:** `apps/api/src/orders/orders.service.ts`.
- **Riesgo:** stock reserved inconsistente, pagos `HELD` huérfanos, excepciones en `consumeReservedStock` que abortan el webhook.
- **Solución:** una sola transacción por checkout: `UPDATE checkouts SET … WHERE id = $id AND status = 'PENDING_PAYMENT' RETURNING *` o `FOR UPDATE`. Rechazar transiciones si `rowCount !== 1`.
- **Esfuerzo:** Medium.
- **Fase:** 9.5.

#### P0-3 — Cancelación PAID no reembolsa en Mercado Pago

- **Problema:** `cancel()` en `PAID`/`PREPARING` crea `Refund` `PENDING`, pone `Payment` `REFUNDED`, restaura stock. **No** llama a `/v1/payments/{id}/refunds` de MP. El comprador no recupera el dinero. El vendedor ve orden reembolsada.
- **Archivos:** `apps/api/src/orders/orders.service.ts`; no hay cliente de refund en `payments.service.ts`.
- **Riesgo:** fraude percibido, incumplimiento de [07-PAYMENTS.md](../07-PAYMENTS.md), exposición legal.
- **Solución:** servicio `PaymentsService.refund(payment)` dentro de la misma saga: primero refund MP (idempotente por `providerRefundId`), luego persistir `COMPLETED`. Si MP falla, no marcar `REFUNDED` local. Prohibir “reembolso solo en DB”.
- **Esfuerzo:** Medium.
- **Fase:** 9.5.

#### P0-4 — JWT con secreto por defecto

- **Problema:** `JwtModule.registerAsync` usa `config.get("JWT_ACCESS_SECRET") ?? "dev-only-change-me"`. Un deploy sin env firma access tokens con un secreto público del repo.
- **Archivos:** `apps/api/src/auth/auth.module.ts`; `.env.example` (`change-me-in-local`).
- **Riesgo:** account takeover total.
- **Solución:** fail-fast al boot si `NODE_ENV=production` o si el secreto está vacío / es uno de los placeholders. Rotar `tokenVersion` al cambiar secreto.
- **Esfuerzo:** Small.
- **Fase:** 9.5 (inmediato).

#### P0-5 — Webhook MP aceptado sin firma fuera de production

- **Problema:** si `MP_WEBHOOK_SECRET` está vacío y `NODE_ENV !== "production"`, `verifySignature` retorna. Un API expuesto en staging/`development` acepta POSTs falsos a `/v1/webhooks/mercadopago`. En mock, `fetchMpPayment` inventa `{ status: "approved" }` si no hay access token.
- **Archivos:** `apps/api/src/payments/payments.service.ts` (`verifySignature`, `fetchMpPayment`).
- **Riesgo:** marcar checkouts como pagados sin dinero.
- **Solución:** exigir firma siempre que el proceso escuche en red pública. Distinguir `MP_MOCK=true` local vs. sandbox real. En sandbox: verificar firma **y** GET `/v1/payments/:id`. Nunca fiarse del body. Rechazar webhook si mock.
- **Esfuerzo:** Medium.
- **Fase:** 9.5.

---

### P1 — Alta prioridad

#### P1-1 — Idempotencia de webhook incompleta

- **Problema:** unique `(provider, providerEventId)` existe, pero: (1) el create no es upsert atómico; (2) `processedAt` se escribe **después** de `applyApproved`; si este lanza, MP reintenta en bucle; (3) `eventId` cae a `Date.now()` si no hay `id`/`data.id`.
- **Archivos:** `apps/api/src/payments/payments.service.ts`; `prisma/schema.prisma` `WebhookEvent`.
- **Riesgo:** 500 a MP, duplicados lógicos, eventos irreproducibles.
- **Solución:** `INSERT … ON CONFLICT DO NOTHING RETURNING`; procesar solo si `processedAt IS NULL` con lock; `eventId` = `data.id` + `type` obligatorio, si no 400; marcar `processedAt` en la misma transacción que el pago, o `failedAt` + retry acotado.
- **Esfuerzo:** Medium.
- **Fase:** 9.5.

#### P1-2 — Sin tests de webhook / dinero real

- **Problema:** [13-TESTING.md](../13-TESTING.md) exige fixtures MP e idempotencia. `payments.service.ts` no tiene spec. CI no corre tests.
- **Archivos:** (ausente) `apps/api/src/payments/payments.service.spec.ts`; `.github/workflows/ci.yml`.
- **Riesgo:** regresiones P0 sin red.
- **Solución:** tests con payload MP de documentación + firma HMAC; dos deliveries iguales; expire vs approved. CI: Postgres service + `pnpm test`.
- **Esfuerzo:** Medium.
- **Fase:** 9.5.

#### P1-3 — Reservas de stock que no expiran solas

- **Problema:** no hay cron/cola. `quantityReserved` solo baja si alguien pega el checkout o llega un webhook.
- **Archivos:** `apps/api/src/orders/orders.service.ts`.
- **Riesgo:** listings “sin stock” con carritos abandonados.
- **Solución:** job cada minuto: `expiresAt < now() AND status = PENDING_PAYMENT`, con el lock de P0-2 y consulta MP (P0-1).
- **Esfuerzo:** Medium (incluye Redis/Bull o `pg_cron` mínimo).
- **Fase:** 9.5.

#### P1-4 — No hay auto-confirmación a 7 días

- **Problema:** `PLATFORM.orderConfirmTimeoutDays = 7` no se usa. Pagos `HELD` para siempre si el comprador no confirma. [07-PAYMENTS.md](../07-PAYMENTS.md) lo exige.
- **Archivos:** `packages/config/src/index.ts`; (ausente) job en API.
- **Riesgo:** vendedores impagos; dinero retenido indefinido.
- **Solución:** job `order.auto_confirmed` + audit. No hace falta Admin para el default 7.
- **Esfuerzo:** Medium.
- **Fase:** 9.5.

#### P1-5 — Payout inexistente

- **Problema:** `Payment RELEASED` no crea `Payout`. [07-PAYMENTS.md](../07-PAYMENTS.md) Opción A: payout semi-manual en admin. Sin admin y sin script, **no hay camino a pagar al vendedor**.
- **Archivos:** `prisma/schema.prisma` `Payout`; ningún service.
- **Riesgo:** marketplace cobra y no liquida.
- **Solución:** en 9.5, script/CLI `payout:pending` listando `RELEASED` sin payout + audit (no UI admin). UI en Fase 10.
- **Esfuerzo:** Medium.
- **Fase:** 9.5 (CLI) / 10 (UI).

#### P1-6 — Webhook `refunded` ignorado tras PAID

- **Problema:** `applyRejected` sale si `checkout.status !== PENDING_PAYMENT`. Chargeback/refund MP sobre orden pagada no mueve `Order` ni stock.
- **Archivos:** `apps/api/src/payments/payments.service.ts`; `orders.service.ts` `applyRejected`.
- **Riesgo:** plataforma cree tener plata que MP ya revirtió.
- **Solución:** rama `applyChargeback` para `PAID+`: marcar `DISPUTED`/`REFUNDED`, alertar, no silenciar.
- **Esfuerzo:** Medium.
- **Fase:** 9.5.

#### P1-7 — Fotos de listing fake y no visibles

- **Problema:** `FilesService.complete` marca READY sin upload. Wizard “Registrar foto” no sube bytes. Ficha listing no muestra imágenes. HP/DMG/graded no exigen fotos extra.
- **Archivos:** `apps/api/src/files/files.service.ts`; `apps/web/app/vender/page.tsx`; `apps/web/app/listings/[id]/page.tsx`; `packages/validation` `createFileUploadSchema`.
- **Riesgo:** fraude de fotos; comprador no ve el artículo; MIME arbitrario.
- **Solución:** allowlist `image/jpeg|png|webp`; no `READY` sin objeto (o flag `storage: deferred` **no usable** en listings de prod); mostrar `fileId`/URL en ficha. R2 real puede esperar a deploy, pero el contrato no debe fingir fotos.
- **Esfuerzo:** Medium.
- **Fase:** 9.5.

#### P1-8 — CI no ejecuta tests ni audit de dependencias

- **Problema:** [13-TESTING.md](../13-TESTING.md) y [12-SECURITY.md](../12-SECURITY.md) piden test + `pnpm audit`. El workflow no lo hace.
- **Archivos:** `.github/workflows/ci.yml`.
- **Riesgo:** main verde con tests rotos; CVEs.
- **Solución:** job `test` con Postgres 16; `pnpm test`; `pnpm audit --audit-level=high` (o allowlist).
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P1-9 — Access token XSS-reachable + refresh en JSON

- **Problema:** `sessionStorage` + `refreshToken` en body de login/refresh.
- **Archivos:** `apps/web/lib/api.ts`; `apps/api/src/auth/auth.controller.ts`.
- **Riesgo:** XSS (React mitiga, no elimina) = sesión robada 30 días.
- **Solución:** access solo en memoria; respuesta web sin `refreshToken` (solo cookie `HttpOnly`). Header `X-Client: web`.
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P1-10 — MIME y complete de files sin allowlist

- **Problema:** `mime: z.string()`; `complete` no verifica storage ni magic bytes.
- **Archivos:** `packages/validation/src/index.ts`; `apps/api/src/files/files.service.ts`.
- **Riesgo:** SVG/HTML almacenado y servido = XSS almacenado cuando exista R2 público.
- **Solución:** allowlist + tamaño; `complete` 409 si no hay objeto (salvo mock explícito de dev).
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P1-11 — Legal / Términos no enlazados

- **Problema:** solo `/legal/fuentes`. [12-SECURITY.md](../12-SECURITY.md) exige términos, privacidad y política de encuentro en registro y checkout. Copy legal es humano; las **rutas y checkboxes** son software.
- **Archivos:** `apps/web/app/layout.tsx`; `apps/web/app/registro/page.tsx`; `apps/web/app/checkout/page.tsx`.
- **Riesgo:** operar (aunque sea sandbox público) sin consentimiento trazable.
- **Solución:** páginas placeholder “borrador” + checkbox `acceptedTermsAt` (campo Profile o Audit). No inventar texto legal definitivo.
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P1-12 — Disputas incompletas vs. MVP 3

- **Problema:** `POST /v1/orders/:id/dispute` no crea `Report`/`Dispute`. Admin no existe. Dinero queda HELD sin cola de resolución.
- **Archivos:** `apps/api/src/orders/orders.service.ts`; docs `06`/`07`.
- **Riesgo:** disputas invisibles.
- **Solución:** 9.5: persistir disputa (tabla mínima o `AuditLog` + status) y endpoint interno listable por CLI. Entidad completa + UI en Fase 10.
- **Esfuerzo:** Medium.
- **Fase:** 9.5 (persistencia) / 10 (resolución).

#### P1-13 — `releaseStock` silencioso

- **Problema:** no comprueba `rowCount`. Doble expire o expire tras consume deja reserved desfasado sin error.
- **Archivos:** `apps/api/src/orders/stock.ts`.
- **Riesgo:** `quantity_reserved` residual o CHECK violation más tarde.
- **Solución:** exigir 1 fila o log+métrica de inconsistencia; nunca `GREATEST` tapando bugs.
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P1-14 — Quote de envío fuera de la transacción de checkout

- **Problema:** `quoteFromPlaces` usa `this.prisma` llamado desde `$transaction(tx => …)`. Tarifas y stock no comparten snapshot; posible pool deadlock.
- **Archivos:** `apps/api/src/shipping/shipping.service.ts`; `orders.service.ts` `createCheckout`.
- **Riesgo:** total cobrado ≠ tarifa leída; errores intermitentes bajo carga.
- **Solución:** pasar `tx` o leer `ShippingRate` con el mismo client.
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P1-15 — Observabilidad nula para dinero

- **Problema:** [14-DEPLOYMENT.md](../14-DEPLOYMENT.md) pide Pino, request-id, alertas de webhook fallido. Hay `Logger` de Nest en el filter.
- **Archivos:** `apps/api/src/main.ts`; `apps/api/src/common/filters/http-error.filter.ts`.
- **Riesgo:** incidentes MP invisibles.
- **Solución:** Pino JSON, `x-request-id`, log estructurado `webhook.mp` success/fail, métrica 5xx.
- **Esfuerzo:** Medium.
- **Fase:** 9.5.

#### P1-16 — Fase 7/9 marcadas completas con huecos de dinero

- **Problema:** [15-ROADMAP.md](../15-ROADMAP.md) cierra Fase 7–9. Falta auto-confirm, payout, refund MP, job expire, tests webhook. El lector del roadmap cree que el marketplace ya es operable en Chile.
- **Archivos:** `docs/15-ROADMAP.md`; `README.md`; `docs/README.md`.
- **Riesgo:** decisiones de go-live erróneas.
- **Solución:** insertar Fase 9.5 en el roadmap **después** de este informe (cambio de docs, no de producto). No reabrir 7–9 como “incompletas” salvo nota de deuda.
- **Esfuerzo:** Small.
- **Fase:** 9.5 (docs).

---

### P2 — Importante

#### P2-1 — Rotación de refresh no atómica

- **Problema:** dos `POST /v1/auth/refresh` paralelos leen sesión válida, ambos emiten tokens.
- **Archivos:** `apps/api/src/auth/auth.service.ts`.
- **Riesgo:** reuse detection más débil.
- **Solución:** `UPDATE sessions SET revoked_at = now() WHERE id = $id AND revoked_at IS NULL RETURNING`.
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P2-2 — Staff puede liberar pagos ajenos

- **Problema:** `requireBuyer` / `requireSeller` incluyen staff. `confirm` libera `HELD`.
- **Archivos:** `apps/api/src/orders/orders.service.ts`.
- **Riesgo:** rol `MODERATOR` mal asignado = payout interno.
- **Solución:** staff no confirma; acciones admin explícitas `POST /v1/admin/orders/:id/release` en Fase 10. En 9.5: quitar staff de `requireBuyer` para `confirm`.
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P2-3 — `@Roles(ADMIN)` en listings no modera

- **Problema:** controller promete admin; service exige ownership.
- **Archivos:** `apps/api/src/listings/listings.controller.ts`; `listings.service.ts`.
- **Riesgo:** falsa sensación de moderación.
- **Solución:** quitar ADMIN del CRUD de dueño; moderar en `/v1/admin` Fase 10.
- **Esfuerzo:** Small.
- **Fase:** 9.5 / 10.

#### P2-4 — OAuth web ausente

- **Problema:** API Google/Apple lista; `/ingresar` y `/registro` no.
- **Archivos:** `apps/web/app/ingresar/page.tsx`; `apps/api/src/auth/oauth.service.ts`.
- **Riesgo:** Fase 1 “completa” a medias; Apple será bloqueante en iOS (Fase 11).
- **Solución:** botones OIDC cuando haya `GOOGLE_CLIENT_ID`. No fingir si no hay client id.
- **Esfuerzo:** Medium.
- **Fase:** 9.5 (web) / 11 (Apple Sign In nativo).

#### P2-5 — Enums muertos y estados saltados

- **Problema:** `CONFIRMED`, `APPROVED`, `DRAFT`, `LABEL_CREATED` ensucian el modelo mental.
- **Archivos:** `prisma/schema.prisma`; `orders.service.ts` `confirm()`.
- **Riesgo:** tests y reportes mal interpretados.
- **Solución:** o persistir `CONFIRMED` antes de `COMPLETED`, o documentar el skip en `03`/`06` y deprecar el enum en una migrate futura.
- **Esfuerzo:** Small.
- **Fase:** 9.5 (docs) / 10 (si se unifica).

#### P2-6 — `Idempotency-Key` opcional en checkout

- **Problema:** doble submit crea dos checkouts y dos reservas.
- **Archivos:** `apps/api/src/orders/checkout.controller.ts`; `apps/web/app/checkout/page.tsx`.
- **Riesgo:** stock doble-reservado; cobros duplicados si el usuario paga las dos.
- **Solución:** web envía UUID por intento; API recomienda 409 sin key en prod.
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P2-7 — GET checkout dispara createPreference

- **Problema:** poll de retorno llama MP GET/POST preference cada vez.
- **Archivos:** `apps/api/src/orders/checkout.controller.ts`.
- **Riesgo:** rate limit MP; latencia.
- **Solución:** GET solo lee; preference en POST checkout / POST preference.
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P2-8 — `decorate()` miente el `initPoint`

- **Problema:** si ya hay `mercadoPagoPreferenceId`, `decorate` devuelve URL de `/checkout/retorno`, no el `init_point` de MP.
- **Archivos:** `apps/api/src/payments/payments.service.ts`.
- **Riesgo:** UX de pago rota en el fallback del GET.
- **Solución:** persistir `initPoint` o siempre GET preference a MP.
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P2-9 — Simulate no es idempotente

- **Problema:** `applyApproved` con `mock_${checkoutId}` se puede llamar dos veces; la segunda no-op si PAID, OK, pero no hay unique de `providerPaymentId`.
- **Archivos:** `payments.service.ts`; `schema.prisma` Payment.
- **Riesgo:** menor en mock; unique faltante estorba en prod (dos pagos MP).
- **Solución:** unique parcial `(provider, providerPaymentId)` WHERE NOT NULL.
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P2-10 — Catálogo `SkipThrottle` + search 60/min solo en search

- **Problema:** scrape de `/v1/cards` ilimitado (salvo 120/min global autenticado; público skip).
- **Archivos:** `apps/api/src/catalog/catalog.controller.ts`.
- **Riesgo:** abuso de CPU/DB.
- **Solución:** throttle público 60–120/min/IP en catálogo.
- **Esfuerzo:** Small.
- **Fase:** 9.5.

#### P2-11 — Orden de vendedores ignora reputación

- **Problema:** [06-MARKETPLACE.md](../06-MARKETPLACE.md): precio, luego reputación.
- **Archivos:** `apps/api/src/listings/listings.service.ts` `listPublic`.
- **Riesgo:** UX; no es dinero.
- **Solución:** join/subquery `avg(stars)` o denormalizar en Profile.
- **Esfuerzo:** Medium.
- **Fase:** 9.5 o 10.

#### P2-12 — Importers Pokémon / One Piece ausentes

- **Problema:** seed mínimo; no hay job Pokémon TCG API.
- **Archivos:** `apps/api/src/catalog/importers/` (solo Scryfall); `docs/19-CATALOG-IMPORT.md`.
- **Riesgo:** catálogo Chile incompleto (Pokémon es el TCG más vendido localmente).
- **Solución:** importer Pokémon en fase de catálogo dedicada, no bloquea 9.5 dinero.
- **Esfuerzo:** Large.
- **Fase:** post-9.5 / catálogo (no Admin).

#### P2-13 — Listing.storeId sin FK; Profile.storeId solo en docs

- **Problema:** columna adelantada vs. Fase 15; doc desfasado.
- **Archivos:** `prisma/schema.prisma`; `docs/03-DATABASE.md`.
- **Riesgo:** bajo hoy; suciedad mañana.
- **Solución:** alinear doc (“columna reservada”) o quitar columna en migrate si no se usa.
- **Esfuerzo:** Small.
- **Fase:** 9.5 (docs) / 15 (FK).

#### P2-14 — Stack web ≠ spec (Query, shadcn, PWA)

- **Problema:** deuda que explotará en Fase 10–11 si cada pantalla sigue con `useState`+fetch.
- **Archivos:** `apps/web/**`; `packages/ui`.
- **Riesgo:** duplicación, estados de pago stale.
- **Solución:** TanStack Query al menos en checkout/órdenes/carrito.
- **Esfuerzo:** Medium.
- **Fase:** 9.5 (carrito/checkout) o 10.

#### P2-15 — SEO: noindex global y sin metadata por ficha

- **Problema:** [09-WEB.md](../09-WEB.md) pide sitemap y title/OG. Hoy `noindex` en root layout.
- **Archivos:** `apps/web/app/layout.tsx`.
- **Riesgo:** si se quita noindex sin sitemap, indexación pobre; si se deja, OK pre-lanzamiento.
- **Solución:** documentar “noindex hasta go-live”; preparar `generateMetadata` en fichas.
- **Esfuerzo:** Medium.
- **Fase:** go-live (post-10), no bloquea 9.5.

#### P2-16 — Accesibilidad checkout/vender

- **Problema:** WCAG 2.2 AA es NFR. Imagen `alt=""`. Pasos del wizard sin `aria-current`.
- **Archivos:** `apps/web/app/[game]/[set]/[card]/page.tsx`; `vender/page.tsx`; `checkout/page.tsx`.
- **Riesgo:** exclusión; incumplimiento de [01-REQUIREMENTS.md](../01-REQUIREMENTS.md).
- **Solución:** alt con nombre de carta; focus visible; labels en quotes de envío.
- **Esfuerzo:** Medium.
- **Fase:** 9.5 (flujos de compra) / continuo.

#### P2-17 — Webpack Nest / Prisma generate

- **Problema:** el API no recarga client Prisma en watch. Operación local frágil.
- **Archivos:** `apps/api/webpack.config.js`; `apps/api/package.json`.
- **Riesgo:** “stock no reserva” fantasma por client viejo.
- **Solución:** documentar restart; evaluar `swc` + runtime Prisma sin webpack.
- **Esfuerzo:** Medium.
- **Fase:** 9.5 (docs + si duele, build).

#### P2-18 — Código duplicado / lógica en borde

- **Problema:** `STAFF_ROLES` copiado en `orders.service.ts` y `shipping.service.ts`. `CheckoutController` orquesta pagos (aceptable) vs. `PaymentsModule` importando controller de orders. Web checkout recalcula suma de quotes (display only). Cart mapper vs listing include duplican forma de listing.
- **Archivos:** esos services; `apps/web/app/checkout/page.tsx`.
- **Riesgo:** divergencia de staff checks.
- **Solución:** `packages/config` o `common/auth/staff.ts`; un mapper de listing.
- **Esfuerzo:** Small.
- **Fase:** 9.5.

---

### P3 — Mejora

#### P3-1 — UUID v4 vs v7 documentado  
`prisma/schema.prisma`. Esfuerzo Small. Fase cuando duela orden temporal.

#### P3-2 — `SchemaMeta` residual  
Borrar o documentar. Small. 9.5 docs.

#### P3-3 — Redis en Compose sin consumidores  
No apagarlo: 9.5 jobs lo usarán. Small.

#### P3-4 — Passport citado y no usado  
Actualizar `docs/02`. Small. 9.5 docs.

#### P3-5 — Throttle forgot-password no es email+IP  
Medium. 9.5 si hay abuso.

#### P3-6 — Perfil vendedor sin ventas ni % puntual  
Fase 9 parcial de copy. Medium. Post-9.5.

#### P3-7 — Cookie `Refresh` path `/` en rewrite Next  
OK funcional; `path=/v1/auth` más estricto. Small.

#### P3-8 — `rawPayload` MP en DB (bien) sin retención/GDPR  
Fase cumplimiento. Large. Pre-prod legal.

#### P3-9 — Mobile placeholder menciona scanner  
Copy. Small. Fase 11.

#### P3-10 — Admin copy “Fase 0” vs roadmap Fase 10  
Alinear texto. Small. Al abrir Fase 10.

#### P3-11 — README pide Docker Desktop; se puede usar Postgres Homebrew  
Docs. Small.

#### P3-12 — `packages/ui` casi vacío  
Llenar en web design system. Medium. No 9.5.

---

## Inconsistencias docs ↔ código (resumen)

| Doc | Dice | Código |
|-----|------|--------|
| 02 Arquitectura | Passport, TanStack Query, shadcn, BullMQ MVP 3 | JWT propio, fetch, `cx()`, Redis idle |
| 02 / 14 | Logs Pino, request-id | Logger Nest |
| 05 Auth | Access en memoria | `sessionStorage` |
| 05 | Rate limit forgot email+IP | Solo IP |
| 03 | `User.slug` nullable; UUID v7; `Profile.storeId` | slug required; v4; sin storeId |
| 06 | Orden listings precio + reputación | Solo precio |
| 06 / 09 | Fotos en ficha | No se pintan |
| 07 | Auto-confirm 7 días; refund MP; payout | No implementado |
| 07 / 04 | Idempotencia webhook por `providerPaymentId` | Unique de **evento**, no de payment id |
| 09 | sitemap, OG, index ficha | `noindex` global |
| 13 / 14 | CI corre test + audit | No |
| 15 | Fases 7–9 ✓ | Happy path sí; dinero/jobs no |
| 01 MVP 3 | Notificaciones, reportes, admin | Fuera de 0–9 (roadmap las parte en 10+) |

Features **marcadas completas e incompletas respecto a su propio doc de dominio:**

- Fase 7 Pagos: preference + HELD sí; refund MP, payout, auto-confirm, webhook tests **no**.
- Fase 8 Envíos: cotización tabla sí (completa para el alcance “sin API courier”).
- Fase 9 Reputación: rating comprador→vendedor sí; métricas de perfil del mockup **no**.
- Fase 1 Auth: API OAuth sí; UI OAuth **no**.

No hay modelos de Collection/Auction/Notification en Prisma: **correcto**.

---

## IDOR y authz (muestreo)

| Recurso | Resultado |
|---------|-----------|
| `GET/PATCH` listing ajeno no ACTIVE | 404 |
| `PUT` cart listing propio | 403 |
| `GET` order / shipment / rating create | 404 si no partícipe |
| `files/:id/complete` | 404 si no uploader |
| `addresses/:id` | ownership en service |
| `GET /v1/users/:id` | público (displayName, reputación) |
| Webhook | público + firma (a veces) |
| `GET /v1/shipping/quote` | autenticado, cualquier sellerId (OK) |
| Dinero en cliente | no se envía; servidor recalcula |

No se encontraron endpoints mutables de marketplace sin auth, salvo webhook (intencional) y cart guest (intencional).

Controllers delgados: validación Zod + llamada a service. Lógica de negocio **no** está en React para comisión ni liberación de pago.

---

## Propuesta: FASE 9.5 — HARDENING

Insertar en [15-ROADMAP.md](../15-ROADMAP.md) **entre Fase 9 y Fase 10**. Criterio de salida: se puede cobrar en **sandbox MP** sin perder stock ni dinero ante retries, expiración y cancelación. Admin sigue prohibido hasta cerrar esta fase.

### Orden de implementación (concreto)

**Oleada A — Fail-closed (1–2 días)**  
1. Boot: rechazar `JWT_ACCESS_SECRET` vacío/placeholder en cualquier env que no sea `test`.  
2. Webhook: firma obligatoria si hay `MP_ACCESS_TOKEN`; mock webhook deshabilitado si hay token.  
3. No devolver `refreshToken` al cliente web; access en memoria.  
4. Allowlist MIME files; `complete` no READY sin política explícita `FILE_STORAGE=deferred` **y** listings que no se publiquen en “prod-like”.  
5. CI: Postgres + `pnpm test` + `pnpm audit`.

**Oleada B — Dinero y stock (el núcleo)**  
6. Lock `FOR UPDATE` / update-where en checkout para expire, approve, reject, cancel.  
7. Reconciliar MP **antes** de expirar: si `approved`, no soltar stock; aplicar PAID+HELD.  
8. Job `checkout.expire` (BullMQ+Redis ya en Compose, o loop Nest).  
9. Webhook: upsert + lock + `eventId` estable; tests de doble delivery y expire-vs-pay.  
10. `PaymentsService.refund` real; cancel PAID no marca REFUNDED local si MP falla.  
11. Unique `(provider, providerPaymentId)`.  
12. Rama chargeback/refund MP post-PAID.  
13. `releaseStock`/`restoreSoldStock` verifican `rowCount`.  
14. Quote shipping con el mismo `tx` del checkout.  
15. `Idempotency-Key` desde la web en checkout.

**Oleada C — Operación mínima sin Admin**  
16. Job auto-confirm 7 días + audit `order.auto_confirmed`.  
17. CLI `payout:list` de pagos `RELEASED` sin `Payout` (no transfiere aún; deja el trabajo de Fase 10 explícito).  
18. Persistir disputa de forma consultable (`Dispute` mínimo o audit query documentada).  
19. Logs Pino + request-id + log `webhook.mp`.

**Oleada D — Producto/seguridad que ya duele**  
20. Quitar staff de `confirm()` (release solo comprador o job).  
21. GET checkout no crea preference. Arreglar `initPoint`.  
22. Fotos: mostrar en `/listings/:id` o no permitir publicar sin URL.  
23. Throttle catálogo público.  
24. Páginas `/legal/terminos` y `/legal/privacidad` placeholder + checkbox registro/checkout.  
25. Tests IDOR ya existentes: añadir casos expire+webhook y refund.

**Fuera de 9.5 (no mezclar)**  
- Fase 10 Admin (`/v1/admin`, bans, resolver disputas, ejecutar payout).  
- Importer Pokémon.  
- SEO indexable / PWA.  
- TanStack Query global / shadcn.  
- Mobile Expo Router.

### Criterios de salida Fase 9.5

- [ ] Secretos placeholder impiden boot fuera de test.  
- [ ] Dos webhooks `approved` iguales → una sola orden `PAID` y un `Payment` `HELD`.  
- [ ] Pago MP `approved` tras `expiresAt` no deja dinero huérfano (o refund automático).  
- [ ] Job expira reservas sin request HTTP.  
- [ ] Cancel PAID llama refund MP o falla sin mentir el estado.  
- [ ] Auto-confirm a 7 días libera `HELD` → `RELEASED` con audit.  
- [ ] CI corre lint, typecheck y tests API (incluyendo webhook).  
- [ ] Staff JWT no puede `POST /v1/orders/:id/confirm` de un tercero.

### Qué no es 9.5

No es un rediseño. No es Admin. No es “completar MVP 3 de producto” (notificaciones in-app, reportes de listing, panel). Es **hacer honesta** la Fase 7–9 que el roadmap ya dio por cerrada.

---

## Anexo — Inventario de runtime

| Pieza | Ubicación | Notas |
|-------|-----------|--------|
| API | `apps/api` Nest 11, Prisma 6, Vitest | webpack watch |
| Web | `apps/web` Next App Router | rewrite `/v1` → API |
| Admin | `apps/admin` | placeholder |
| Mobile | `apps/mobile` Expo | placeholder |
| DB | `prisma/schema.prisma` + migraciones 1–9 | CHECKs en SQL |
| CI | `.github/workflows/ci.yml` | lint/typecheck |
| Compose | `docker/compose.yml` | Postgres 16, Redis 7, Inbucket |

Auditoría realizada sin modificar código de producto. Siguiente paso de implementación, cuando se pida: **Fase 9.5 — Hardening**, oleada A.
