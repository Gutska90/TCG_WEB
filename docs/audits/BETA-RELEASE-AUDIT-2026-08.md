# Auditoría Closed Beta — TCG Platform (B0)

**Fecha:** 22 agosto 2026  
**Commit inspeccionado:** `d3a2e2b` (`main`) + freeze B0–B8 en docs  
**Alcance:** estado real post-Fase 14.  
**Método:** lectura de `/docs` obligatorio, `apps/{api,web,admin,mobile}`, `packages/*`, `prisma/*`, `.github/workflows/ci.yml`, `.env.example`. Gates locales ejecutados.  
**Restricción:** no se implementaron features. No Scanner / Stores / Auctions / Trades / Deck Builder / Cart Optimizer / pagos live / payouts automáticos. Schema no modificado.

Nombre de trabajo: **TCG Market Chile**. Un NestJS + PostgreSQL para web, admin y mobile.

---

## Dictamen

**NO se puede publicar hoy una closed beta externa.**

El producto de Fase 14 (marketplace sandbox, admin de dinero, colección, precios, wishlist) **existe y los gates de código pasan**. Lo que impide una beta cerrada *segura y alcanzable por testers invitados* no es Scanner ni pagos live: es **infraestructura de publicación**, **storage de archivos**, **correo transaccional** y **builds móviles**.

`ENABLE_REAL_PAYMENTS` sigue en `false`. Eso es correcto y debe permanecer así.

| Severidad | Cantidad |
|-----------|----------|
| P0 — bloquea beta | 5 |
| P1 — antes de ampliar | 12 |
| P2 — durante beta | 14 |
| P3 — mejora | 8 |

**Siguiente fase del programa:** B1 Staging (contrato en [runbooks/STAGING.md](../runbooks/STAGING.md); este informe B0 no implementó B1).

---

## 1. Feature freeze

Fases **15–20 congeladas** durante B0–B8. Orden de Scanner → Stores → Auctions → Trades → Deck Builder → Cart Optimizer **no se reordenó**.

Declarado en [15-ROADMAP.md](../15-ROADMAP.md). Pagos live y payouts automáticos siguen fuera (ADR 0008 + `ENABLE_REAL_PAYMENTS=false`).

---

## 21. Release scorecard

Leyenda: **READY** para closed beta sandbox si existiera staging · **PARTIAL** código listo con huecos · **BLOCKED** impide publicar.

| Área | Estado | Comentario |
|------|--------|------------|
| Architecture | READY | Un API, un Postgres, monorepo pnpm. Redis en Compose sin uso (sin BullMQ). |
| Security | PARTIAL | JWT/webhook fail-closed, RBAC, IDOR 404 en dinero/trust. Sin CSP en Next, sin `pnpm audit` en CI, storage deferred. |
| Auth | PARTIAL | Email/password + Google/Apple + refresh rotation. Flags OAuth off por defecto. Verify/reset dependen de email. Stub prohibido en production. |
| Marketplace | PARTIAL | Listings/carrito/checkout sandbox usables. Fotos de publicación no se suben de verdad. |
| Money Safety | READY | Locks `FOR UPDATE`, late payment + refund, HELD interno, ledger append-only, production gate. No MP live. |
| Admin | PARTIAL | 10A–10D + trust + jobs + system. Mutaciones con AuditLog. Sin IP allowlist/VPN. Sin E2E admin. |
| Moderation | PARTIAL | Disputas/reportes/suspensión. Evidencia no sirve bytes (`storage: deferred`). |
| Observability | PARTIAL | Logs JSON, `X-Request-Id`, métricas in-process, jobs con lock. Sentry no cableado. Sin Grafana. |
| Web UX | PARTIAL | Flujos buyer/seller/colección/wishlist. `noindex`. Footer legal. E2E locales sensibles al stock del seed. |
| Mobile | PARTIAL | Expo Router + SecureStore. Sin EAS_PROJECT_ID, sin preview firmado, Maestro fuera de CI. |
| Collection | READY | Ownership 404, lotes, set progress, decrement COMPLETED. Decrement fuera del tx de dinero (P1). |
| Prices | READY | Índice TCG Market Chile, unique diario, job 6h. SALE usa `orderItem.createdAt` no `completedAt` (P2). |
| Wishlist | PARTIAL | Hit + dedupe + PRICE_DROP opt-in. Push no existe. Email si no hay Resend = log. Scan cap 5000. |
| CI | PARTIAL | Workflow completo (install frozen → migrate → lint → typecheck → test → integration → build → e2e). No `pnpm audit`. Maestro no corre. Seed E2E umbral `< 2`. |
| Deployment | BLOCKED | Hosting/DNS/TLS/Postgres managed TBD. No hay entorno staging. |
| Storage | BLOCKED | `FilesService` `uploadUrl: null`, bucket `deferred`. Completar marca READY sin objeto. |
| Email | BLOCKED | Sin `RESEND_API_KEY` solo log. Inbucket local. Checkout exige email verificado. |
| Android readiness | BLOCKED | Package `cl.tcgplatform.app`, EAS preview config, sin projectId/signing/API HTTPS. |
| iOS readiness | BLOCKED | Bundle id + Apple Sign In flag. Sin cuenta Apple, TestFlight, privacy/support URLs reales. |

---

## 22. GO / NO-GO

**¿Puede publicarse hoy una closed beta?** **NO**

### P0 (únicos blockers de publicación)

1. **B0-DEP-01** — No hay staging/producción (hosting, DNS, TLS, Postgres).
2. **B0-STOR-01** — Storage de archivos deferred: fotos, avatares y evidencia no se sirven.
3. **B0-MAIL-01** — Correo transaccional no llega a testers reales (Inbucket/local o log).
4. **B0-AND-01** — No se puede generar Android preview (EAS project, signing, API URL).
5. **B0-IOS-01** — No se puede generar iOS preview / TestFlight (cuenta Apple, signing, URLs).

Una beta *solo web, solo localhost, cuentas `beta:seed`* sí se puede operar internamente. Eso no es “publicar closed beta”.

### P1 (antes de ampliar testers)

Ver lista P1 abajo. Los más urgentes tras infra: headers/CSP, umbral del seed E2E, decrement de colección fuera de transacción, OAuth/client IDs de staging, revisión legal de copy, backups.

---

## 2. CI (real)

Archivo: `.github/workflows/ci.yml` (único workflow).

| Paso pedido | ¿CI lo corre? | Evidencia |
|-------------|---------------|-----------|
| `pnpm install --frozen-lockfile` | sí | step explícito |
| `prisma generate` | sí | `pnpm db:generate` + `postinstall` |
| `prisma migrate deploy` | sí | `pnpm exec prisma migrate deploy` |
| lint | sí | `pnpm lint` (turbo, incluye `@tcg/mobile`) |
| typecheck | sí | `pnpm typecheck` (mobile: `tsc` + `expo config --type public --json`) |
| unit tests | sí | `pnpm test` = turbo test (`@tcg/api` vitest **incluye** `test/integration/**`) |
| integration tests | sí | `pnpm test:integration` **segunda** corrida del mismo set API |
| Playwright E2E | sí | **después** de `pnpm build`; `ENABLE_REAL_PAYMENTS=false`; `AUTH_STUB_OAUTH=true` |
| build | sí | antes de e2e |

**Mobile en CI:** no hay job aparte. Entra por turbo lint/typecheck/test. `expo config` corre en typecheck. Maestro (`apps/mobile/.maestro/`) **no** está en CI (documentado).

**No se omiten suites por `.skip`.** No hay `pnpm audit` pese a [12-SECURITY.md](../12-SECURITY.md).

**Live services:** tests de dinero usan `FakePaymentProvider`. Playwright no llama Mercado Pago live. OAuth E2E usa stub. Integración auth-identity usa stub.

**Doble integración:** `apps/api` vitest `include` ya cubre `test/integration`. El step “Integration tests (explicit)” no añade cobertura; gasta tiempo.

**E2E vs DB sucia:** `beta:seed` solo sube stock si `quantity - quantityReserved < 2`. La suite hace **3 checkouts** (buyer, dispute, seller). En Postgres limpio de CI (qty 8) pasa. En DB local reusada, el seller puede no ver “Agregar al carrito” (`available <= 0` → “Sin stock”). `JOBS_ENABLED=false` en e2e no libera reservas expiradas.

---

## 3. Inventario de tests

Ejecutado 22-08-2026 (local).

| Capa | Dónde | Resultado |
|------|-------|-----------|
| API unit + integration (turbo test) | `apps/api` 51 files | **266 passed** |
| Integration explícita | 14 files | **101 passed** (subconjunto) |
| Mobile unit | 4 files | **9 passed** |
| Web unit | — | **no hay** `test` script en `@tcg/web` |
| Admin unit | — | **no hay** `test` script en `@tcg/admin` |
| Web E2E | 9 specs Playwright | 1ª corrida full: **8/9** (falló `seller-happy-path`); aislamiento post-seed: **pass** |
| Mobile E2E | Maestro 01–08 | **no corre en CI** |

### Por dominio

| Dominio | Cobertura | Hueco crítico |
|---------|-----------|----------------|
| Financial concurrency | `checkout-concurrency`, refund, release-gate, ledger-payouts, recon | Fuerte. No load test. |
| Auth | unit oauth/jwt/password + `auth-identity.integration` + 3 E2E | Ban/deactivation E2E incompleto. Apple live no. |
| Moderation | `trust.integration` + `dispute-path` e2e | Evidencia sin bytes; no hay test de stream real. |
| Collection | unit value + service + integration (decrement) + e2e | Decrement **no** pasa por `OrdersService.confirm`. |
| Prices | `price-index` unit + prices integration + e2e bloque | SALE por `createdAt` no testeado como bug. |
| Wishlist | rules unit + integration hit/PRICE_DROP + e2e | Email/push no. Scan 5k no. Job vs ping race solo dedupeKey. |
| Notifications prefs | integración PRICE_DROP opt-in | Sin spec de `NotificationsService`. |
| Files | — | **Sin tests** del upload deferred. |
| Admin UI | API admin unit/integration | **Sin Playwright** de `/admin`. |

Ningún test apunta a producción ni a MP live.

---

## 4. Database

Migraciones Prisma 1–14 presentes (10C ledger → 14 wishlist). CHECKs de dinero/stock en SQL de Fases 4–10C (`price_clp > 0`, `quantity_reserved <= quantity`, `amount_clp > 0`, ledger net, etc.). Prisma schema **no** redeclara esos CHECK (viven en SQL).

### Retención financiera vs User

Baja = `deletedAt` + `deletionRequestedAt`. **No** `user.delete()`.

| Modelo | onDelete User | ¿Se pierde si hard-delete? |
|--------|---------------|----------------------------|
| Order | Restrict (buyer y seller) | No, bloquea delete |
| Payment | Restrict vía Order | No |
| Refund | Restrict vía Payment | No |
| LedgerEntry | Restrict seller | No |
| Payout / PayoutItem | Restrict | No |
| AuditLog | SetNull actor | Fila permanece |
| Dispute | Restrict parties | No |
| Listing | **Cascade seller** | **Sí** si alguien hard-deletea un seller **sin** órdenes |
| Collection / Wishlist / Favorite / Notification | Cascade | Sí (no son financieros) |
| CardPrice | Cascade variant, no User | OK |

**Conclusión:** el camino de producto (desactivar) conserva finanzas. Un `DELETE FROM users` a mano aún puede borrar listings de sellers sin órdenes (P2).

### Collection / Price / Wishlist indexes

- `Collection.userId` unique (una default).
- `CollectionItem`: `(collectionId, createdAt)`, `(collectionId, variantId, condition)`, `variantId`. **No** unique de lote (correcto).
- `CardPrice`: unique `(variantId, source, capturedOn)`; index `(variantId, capturedAt)`.
- `WishlistItem`: unique `(userId, variantId)`; indexes user y variant.
- `Notification`: unique `(userId, dedupeKey)`.

No se modificó schema.

---

## 5. Financial audit

Flujo implementado: checkout autenticado → reserva 30 min → preference/simulate → webhook `approved` → Payment **HELD** / Order PAID → envío → confirm → RELEASED + ledger `SELLER_PAYABLE` → payout **manual** → recon no muta dinero.

- Late payment: registra cobro, no fulfillment, refund proveedor, audit HIGH_PRIORITY.
- Dispute activa: congela elegibilidad de payout; no muta Payment/Ledger.
- Production: `PaymentsModule` usa MP (fail-closed si no hay token). Local sin token: `LocalPaymentProvider`.
- Gate: `assertRealPaymentsLegalGate` si production + `ENABLE_REAL_PAYMENTS` exige `REAL_PAYMENTS_LEGAL_APPROVED` (nunca `true` en repo).
- `.env.example`: `ENABLE_REAL_PAYMENTS=false`.

**Inconsistencia:** `applySaleDeduction` corre **después** del `$transaction` de confirm. Si falla, la orden ya está COMPLETED y el lote no baja; re-confirm es ilegal. Idempotencia por `collection.sold` + orderId. (P1)

Payouts automáticos: no existen (correcto).

---

## 6. Auth audit

Implementado: argon2id, refresh rotación + reuse → revoke-all, `tokenVersion`, ban, baja, linking/unlink, password para OAuth-only, consentimiento `acceptTerms` en alta email y OAuth, stub CI.

**Staging requerido (fail-fast):** `DATABASE_URL`, `CORS_ORIGINS` allowlist sin `*`, `JWT_ACCESS_SECRET` ≥32, si `ENABLE_GOOGLE_AUTH` → audiencias, si `ENABLE_APPLE_AUTH` → `APPLE_CLIENT_ID`. `AUTH_STUB_OAUTH` prohibido en production y con pagos reales.

Hoy flags OAuth **false** en `.env.example`. Closed beta con Google/Apple necesita IDs reales en el entorno (P1), no en git.

IDOR: órdenes/disputas/listings ajenos → 404. Admin email sí se ve en panel (esperado).

Web `next`: bloquea `http` y exige path `/`; la página de login también rechaza `//`. Helper `loginHref` solo es más laxo (P2).

Mobile: refresh SecureStore `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; access en memoria. Callbacks `tcgplatform://oauth` + allowlist.

---

## 7. Collection audit

Ownership: ítem ajeno 404. `estimatesFor` **un** `findMany` de listings ACTIVE (no N+1 por lote). Set progress por `cardId`. Lotes duplicados permitidos. Vender-desde-colección: prefill, no auto-listing.

`applySaleDeduction` idempotente por AuditLog. Race: fuera del tx (P1). Large collections: sort por estimado carga todos los ids de la colección en memoria (P2). Pagination en listado default sí.

---

## 8. Price audit

Job `card-prices` 6h + unique diario (duplicados → upsert). `utcDateOnly` UTC, no America/Santiago (P2 en frontera Chile). Outliers 0.5×–2× en índice. Confianza HIGH/MEDIUM/LOW. Job lock RUNNING por `jobName`.

`captureDay` itera variantes ACTIVE en serie (P2 catálogo grande).

SALE mediana usa `orderItem.createdAt` en el día, filtrado por `order.status = COMPLETED` — una venta confirmada días después se imputa al día del ítem, no al `completedAt` (P2, no se cambió fórmula).

---

## 9. Wishlist audit

Unique `(userId, variantId)`. Ping al crear/editar/activar listing + job 5 min. Dedupe `WISHLIST_HIT:{listingId}:{priceClp}` unique. Si baja más, nueva alerta. `PRICE_DROP` opt-in (`inApp` default false). Push: no hay tokens (esperado). Email: `MailService` (P0 si no hay Resend).

`scanAll` `take: 5000` distinct variants; el resto no se escanea (P2). Job + ping concurrentes: unique dedupeKey evita spam. Preferencia off: no persiste PRICE_DROP in-app.

---

## 10. Mobile audit

| Tema | Estado |
|------|--------|
| SecureStore refresh | sí |
| Access token | memoria |
| Deep link checkout | `tcgplatform://checkout-return` + poll API (no confía query) |
| API base URL | `EXPO_PUBLIC_API_BASE_URL` / extra; default localhost |
| Session refresh | cliente API |
| Google / Apple | código 11.5; IDs vacíos ocultan botones |
| Network errors | mensajes es-CL en helpers |
| EAS | perfiles development/preview/production; `EXPO_PUBLIC_ENABLE_REAL_PAYMENTS=false` |
| `eas.projectId` | `process.env.EAS_PROJECT_ID` — **no hay valor** |
| Android | `cl.tcgplatform.app`, versionCode 1, adaptive icon placeholder, cleartext si no production |
| iOS | mismo bundle, `usesAppleSignIn: true`, buildNumber 1 |

**Impide Android preview:** cuenta Expo + `EAS_PROJECT_ID`, keystore (EAS o local), `EXPO_PUBLIC_API_BASE_URL` HTTPS de staging, icono/splash de producto, testers internos. No hace falta Play Console para *preview* interno, sí para B8 amplio.

**Impide iOS preview/TestFlight:** Apple Developer + App Store Connect, certificados, capability Sign in with Apple, privacy/support URLs públicas (hoy `/privacidad` `/ayuda` sin host), no hay universal links de host público.

Push tokens: diferidos (no blocker de preview, sí de alertas push).

---

## 11. Web audit

- Responsive: header colapsa bajo `lg`; páginas críticas fluidas. Sin pass visual 375 en esta auditoría.
- SEO: `robots: { index: false, follow: false }` en web y admin. **No hay `robots.txt`.** Adecuado para beta; hay que invertirlo en lanzamiento público (P3).
- Footer legal: términos, privacidad, marketplace, refunds, ayuda, fuentes.
- Checkout: “Pago de prueba / sandbox”.
- `error.tsx` 500 sin stack; `not-found` con inicio/buscar/ayuda.
- Loading/empty: presentes en flujos 11.0/12/14.
- Sesión: 401 → `/ingresar?next=`. Cookie Refresh httpOnly SameSite=Lax.
- Next `rewrites` `/v1` → API. Sin headers CSP/HSTS en `next.config.ts` (P1).

---

## 12. Admin audit

RBAC: `ADMIN_OPS_ROLES` para 10A–10D; MODERATOR en 10.5 sin ledger/payouts; `ADJUSTMENT` SUPER_ADMIN. No `if (user.isAdmin)` suelto.

PII: listados **no** seleccionan `passwordHash` / `rawPayload` (tests). Email de parties **sí** en detalle de orden (ops).

Mutaciones (cancel, refund retry, payout, recon, suspend) escriben `AuditLog`. GET no. `/admin/system` read-only (flags = env + redeploy).

Sin E2E de login admin salvo `dispute-path`. Sin IP allowlist (docs lo recomiendan) — P1 en staging público.

---

## 13. Security (sin arreglar)

### P0 buscados

| Amenaza | Hallazgo |
|---------|----------|
| Secretos en git | `.env` gitignored. `.env.example` sin secretos. No `.pem`/credentials.json. |
| Auth bypass | Guards globales JWT + roles. Stub fail-closed en production. |
| IDOR P0 dinero/trust | 404. Evidencia file: party/staff; **no hay bytes que filtrar**. |
| Financial race | Cubierto 9.5A tests. Decrement colección fuera de tx = P1 no P0 de dinero. |
| SQLi | Prisma parametrizado; search `Prisma.sql` + `escapeLike`. |
| Upload inseguro | MIME/size en disputa; objeto nunca llega (deferred). Completar READY sin bytes = integridad P0 de storage, no RCE. |

### P1

CORS allowlist en staging/prod; local default 3000/3002. Helmet en API (CSP default de Helmet 8 **no** cubre Next). Rate limit global 120/min; login 10/15min. CSRF: access no en cookie; Refresh SameSite. OAuth redirect allowlist mobile. XSS: React + `sanitizePlainText` en trust. Session fixation: refresh rota.

---

## 14. Storage

`FilesService.createUpload` → `bucket: "deferred"`, `uploadUrl: null`. `complete` pone `READY` sin objeto. Listing photos y avatares no tienen CDN. `streamEvidenceFile` devuelve JSON `{ mime, size, fileId, storage, key }`, **no un stream**.

Catálogo `imageUrl` puede ser URL externa del importer (arte de carta), distinto de fotos del vendedor.

**Blocker de beta externa** si testers publican o adjuntan evidencia.

---

## 15. Email

`MailService`: sin `RESEND_API_KEY` → log `[dev mail]`. Con key → Resend API. Inbucket en `docker/compose.yml` **no está cableado** al API (no hay SMTP local en `MailService`).

Usa mail: verify, reset, wishlist/PRICE_DROP si `prefs.email`. Órdenes/refunds **no** tienen templates de `SALE_MADE` / etc. en este servicio (hueco vs [18-NOTIFICATIONS](../18-NOTIFICATIONS.md) — P2 copy; P0 es verify).

Checkout/vender exigen `emailVerifiedAt`. Seed beta ya viene verificado; **alta real de tester no**.

---

## 16. Observability

| Pieza | Código | Local | Externo |
|-------|--------|-------|---------|
| Logs JSON + redact | implementado | stdout | proveedor TBD |
| `X-Request-Id` | implementado | sí | proxy debe reenviar |
| Error tracking | puerto; no-op si flag off | `ERROR_TRACKING_ENABLED=false` | Sentry no cableado |
| Métricas | in-process `/v1/admin/metrics` | sí | Prometheus/Grafana no |
| Jobs | in-process + `JobRun` lock | `JOBS_ENABLED` | multi-instancia: lock DB evita doble RUNNING |
| Alertas admin | dashboard/system | sí | sin paging |

---

## 17. Deployment

[14-DEPLOYMENT.md](../14-DEPLOYMENT.md) deja **TBD**: API (Fly/Railway/Render/k8s), Web (Vercel o cluster), Admin (mismo + IP allowlist), Postgres managed + backups, R2, DNS, TLS.

Compose local: Postgres 16, Redis (sin clientes de cola), Inbucket.

**No se eligió proveedor.** Alternativas beta:

| Pieza | Alternativas | Recomendación *provisional* para B1 (no ejecutada) |
|-------|--------------|-----------------------------------------------------|
| API | Fly / Render / Railway | Un proceso (jobs in-process) + Postgres managed |
| Web/Admin | Vercel o mismo cluster | Mismo origen o CORS explícito; admin noindex + auth |
| Postgres | Neon / RDS / Fly Postgres | Backups diarios desde B1 |
| Files | R2 / S3 / Minio | R2 alineado a docs; **obligatorio** para destrabar P0 storage |
| Email | Resend / SES | Resend (ya hay cliente) |
| Error tracking | Sentry | Flag off hasta B5 |
| DNS/TLS | Cloudflare | staging `*.` + certificados |

Token MP de **producción** sigue bloqueado por ADR 0008. Staging = sandbox MP o simulate.

---

## 18. Store readiness

De [STORE-READINESS.md](../release/STORE-READINESS.md) + código:

**Android blockers:** Expo/EAS project, signing, `EXPO_PUBLIC_API_BASE_URL` HTTPS, privacy/support URLs con host real (hoy `soporte@localhost` / `privacidad@localhost`), icono/screenshots, Data safety questionnaire, no submit Play en B6 (solo preview interno).

**iOS blockers:** Apple Developer, bundle `cl.tcgplatform.app`, Sign in with Apple capability, TestFlight, mismas URLs, screenshots, no App Store submit en B7.

Contacto legal placeholder = blocker de *review de store*, no de EAS preview interno (sí de B8 público).

---

## 19. Performance (no se ejecutó load test)

Endpoints a load-testear en B3 (staging, datos sintéticos, no destructivo de dinero live):

| Endpoint | Scenario |
|----------|----------|
| `GET /v1/search/cards` | q corto, 50 rps, p95 |
| `GET /v1/cards/:id` + listings | ficha + 40 listings |
| `GET /v1/me/collection/items` + summary | 1k–10k lotes |
| `GET /v1/variants/:id/prices` | rango 1a |
| `GET /v1/me/wishlist` | 200 ítems |
| `POST /v1/checkouts` | 20 concurrent mismo listing qty=1 (ya hay test funcional) |
| `GET /v1/admin` dashboard | 5 rps staff |

Jobs: `card-prices` y `wishlist-scan` en serie; medir con catálogo >5k variantes.

---

## 20. Hallazgos

### P0

#### B0-DEP-01
- **Área:** Deployment  
- **Problema:** No existe entorno staging/producción (hosting, DNS, TLS, Postgres managed, secretos).  
- **Riesgo:** No hay URL que dar a testers; no hay TLS.  
- **Evidencia:** `docs/14-DEPLOYMENT.md` TBD; Compose solo local.  
- **Fix recomendado:** B1: un API + web + admin + Postgres + TLS. `ENABLE_REAL_PAYMENTS=false`.  
- **Esfuerzo:** 3–8 días (decisión de proveedor + DNS).  
- **Fase:** B1 / B5

#### B0-STOR-01
- **Área:** Storage  
- **Problema:** Uploads deferred: `uploadUrl: null`; `complete` marca READY; evidencia no streamea bytes.  
- **Riesgo:** Listings sin fotos reales; disputas sin prueba; testers creen que subieron archivos.  
- **Evidencia:** `apps/api/src/files/files.service.ts`; `streamEvidenceFile` metadata-only.  
- **Fix recomendado:** Presign R2/S3, servir con auth, no buckets públicos.  
- **Esfuerzo:** 3–5 días.  
- **Fase:** B1–B2

#### B0-MAIL-01
- **Área:** Email  
- **Problema:** Sin `RESEND_API_KEY` el API solo loguea. Inbucket no está integrado.  
- **Riesgo:** Verify/reset no llegan; checkout de cuentas nuevas bloqueado (`emailVerifiedAt`).  
- **Evidencia:** `apps/api/src/mail/mail.service.ts`; Compose Inbucket.  
- **Fix recomendado:** Resend (o SMTP) en staging; From verificado; no loguear tokens.  
- **Esfuerzo:** 1–2 días.  
- **Fase:** B1

#### B0-AND-01
- **Área:** Android  
- **Problema:** No hay `EAS_PROJECT_ID`, signing, ni API HTTPS para dispositivo.  
- **Riesgo:** No se entrega APK/AAB de preview.  
- **Evidencia:** `apps/mobile/eas.json`, `app.config.ts` `eas.projectId: process.env.EAS_PROJECT_ID`.  
- **Fix recomendado:** Crear proyecto EAS, preview profile, `EXPO_PUBLIC_API_BASE_URL` de staging.  
- **Esfuerzo:** 1–3 días (cuenta + credenciales).  
- **Fase:** B6 (después de B1)

#### B0-IOS-01
- **Área:** iOS  
- **Problema:** Sin Apple Developer/TestFlight/signing; URLs privacy/support de localhost; Sign in with Apple requiere capability.  
- **Riesgo:** No hay build instalable para testers iOS.  
- **Evidencia:** `STORE-READINESS.md`; `LEGAL.contactEmail` `soporte@localhost`.  
- **Fix recomendado:** Cuenta Apple, EAS iOS, host público de `/privacidad` y `/ayuda`.  
- **Esfuerzo:** 2–5 días + tiempos de Apple.  
- **Fase:** B7 (después de B1)

### P1

#### B0-CI-01
- **Área:** CI  
- **Problema:** Seed E2E restockea solo si available `< 2`; la suite hace 3 compras. DB sucia + `JOBS_ENABLED=false` deja al seller sin botón de carrito.  
- **Riesgo:** Falsos rojos locales; CI limpio suele pasar.  
- **Evidencia:** `beta-seed.ts` umbral; fallo `seller-happy-path` 22-08-2026; pass aislado post-seed.  
- **Fix:** Restock si available `< N` (N≥3) o listing dedicado por spec.  
- **Esfuerzo:** 0.5 día.  
- **Fase:** B4

#### B0-SEC-01
- **Área:** Security  
- **Problema:** Next web/admin sin CSP/HSTS/Referrer-Policy. API `helmet()` no cubre el HTML.  
- **Riesgo:** XSS/clickjacking en staging público.  
- **Evidencia:** `apps/web/next.config.ts` solo rewrites.  
- **Fix:** Headers en Next + Helmet CSP API.  
- **Esfuerzo:** 1 día.  
- **Fase:** B2

#### B0-SEC-02
- **Área:** CI/Security  
- **Problema:** `pnpm audit` no corre en CI (sí está en la spec de seguridad).  
- **Riesgo:** CVEs en lockfile sin gate.  
- **Evidencia:** `.github/workflows/ci.yml` vs `docs/12-SECURITY.md`.  
- **Fix:** Step `pnpm audit --audit-level=high` (o policy).  
- **Esfuerzo:** 0.5 día.  
- **Fase:** B2

#### B0-COL-01
- **Área:** Collection  
- **Problema:** `applySaleDeduction` fuera del tx de `confirm`.  
- **Riesgo:** Orden COMPLETED y lote intacto si el proceso muere.  
- **Evidencia:** `orders.service.ts` confirm; test de decrement llama al service, no al confirm.  
- **Fix:** Misma transacción o outbox. Test via `confirm`.  
- **Esfuerzo:** 1 día.  
- **Fase:** B2

#### B0-AUTH-01
- **Área:** Auth  
- **Problema:** Google/Apple off; staging necesita client IDs.  
- **Riesgo:** Testers sin OAuth; o fail-fast si se enciende el flag sin audiencias.  
- **Evidencia:** `.env.example` `ENABLE_GOOGLE_AUTH=false`; `assertOauthRuntimeConfig`.  
- **Fix:** IDs de staging en secret manager, no en git.  
- **Esfuerzo:** 0.5–1 día.  
- **Fase:** B1

#### B0-ADM-01
- **Área:** Admin  
- **Problema:** Panel sin IP allowlist/VPN.  
- **Riesgo:** Superficie admin en internet si se publica el host.  
- **Evidencia:** `14-DEPLOYMENT.md`; no hay middleware de IP.  
- **Fix:** Allowlist o SSO + red privada.  
- **Esfuerzo:** 1 día.  
- **Fase:** B1

#### B0-LEG-01
- **Área:** Legal  
- **Problema:** Términos/privacidad son copy de beta; contactos `@localhost`.  
- **Riesgo:** Testers externos sin base contractual/contacto.  
- **Evidencia:** `LEGAL-BETA.md`; `packages/config/src/legal.ts`.  
- **Fix:** Revisión humana + emails reales **antes** de ampliar lista. Pagos live siguen bloqueados aparte.  
- **Esfuerzo:** legal (externo) + 0.5 día copy.  
- **Fase:** B1–B8

#### B0-OBS-01
- **Área:** Observability  
- **Problema:** Sin error tracking externo ni backups de DB.  
- **Riesgo:** Incidentes en staging sin rastro; pérdida de datos.  
- **Evidencia:** `ErrorTrackingService` no envía a Sentry; deployment TBD.  
- **Fix:** Backups B1; Sentry B5.  
- **Esfuerzo:** 1–2 días.  
- **Fase:** B1 / B5

#### B0-WEB-01
- **Área:** Web  
- **Problema:** Sin tests unitarios web/admin; Maestro mobile fuera de CI.  
- **Riesgo:** Regresiones de UI no financieras.  
- **Evidencia:** `package.json` web/admin sin `test`; CI sin Maestro.  
- **Fix:** Mantener Playwright como gate; opcional Maestro nightly.  
- **Esfuerzo:** 1–2 días.  
- **Fase:** B4

#### B0-PAY-01
- **Área:** Money  
- **Problema:** Job `expire-checkouts` off en e2e (`JOBS_ENABLED=false`); reservas pueden quedar.  
- **Riesgo:** Stock fantasma en entornos de prueba largos.  
- **Evidencia:** `playwright.config.ts` `JOBS_ENABLED: "false"`.  
- **Fix:** Housekeeping en staging; umbral seed.  
- **Esfuerzo:** 0.5 día.  
- **Fase:** B4

#### B0-NOT-01
- **Área:** Wishlist  
- **Problema:** Alertas email no llegan sin Resend; push no existe.  
- **Riesgo:** Wishlist “no avisa” para testers. In-app sí si hay API.  
- **Evidencia:** `notifications.service.ts` + mail.  
- **Fix:** Depende de B0-MAIL-01. Push diferido (no B0).  
- **Esfuerzo:** cubierto por email.  
- **Fase:** B1

#### B0-FIL-01
- **Área:** Testing  
- **Problema:** `FilesService` sin tests; notifications service sin unit.  
- **Riesgo:** Storage/email se rompen sin gate.  
- **Evidencia:** glob `*.spec.ts`.  
- **Fix:** Integration upload deferred vs object cuando exista R2.  
- **Esfuerzo:** 1 día.  
- **Fase:** B2

### P2

| ID | Área | Problema | Fase |
|----|------|----------|------|
| B0-DB-01 | Database | `Listing.seller` onDelete Cascade | B2 |
| B0-PRC-01 | Prices | SALE imputa `orderItem.createdAt` no `completedAt` | B3 |
| B0-PRC-02 | Prices | `utcDateOnly` UTC vs Chile | B3 |
| B0-PRC-03 | Prices | Capture secuencial por variante | B3 |
| B0-WISH-01 | Wishlist | `scanAll` cap 5000 | B3 |
| B0-COL-02 | Collection | Sort por estimado carga todos los lotes | B3 |
| B0-JOB-01 | Ops | Jobs in-process: un proceso API | B5 |
| B0-RED-01 | Architecture | Redis en Compose sin uso | B5 |
| B0-HDR-01 | Web | `loginHref` admite `//` (página login lo bloquea) | B2 |
| B0-ADM-02 | Admin | Sin E2E de payout/refund retry UI | B4 |
| B0-NOT-02 | Notifications | Eventos 18 (SALE_MADE, etc.) no todos emiten in-app | B8 |
| B0-MOB-01 | Mobile | QA checklist 11 desactualizado (notificaciones “sin API”) residual en MOBILE-BETA-QA | B4 |
| B0-DOC-01 | Docs | ASCII Fase 7 sigue 🟡 pese a 9.5 | B8 |
| B0-CSP-01 | Security | Helmet sin CSP explícito en API | B2 |

### P3

| ID | Área | Problema |
|----|------|----------|
| B0-BRAND-01 | Producto | Nombre público TBD |
| B0-SEO-01 | Web | `noindex` global: quitar solo en launch público |
| B0-A11Y-01 | Web | Sin axe CI; menú `<details>` sin focus trap |
| B0-PUSH-01 | Mobile | Push tokens diferidos |
| B0-UL-01 | Mobile | Universal links de host público diferidos |
| B0-MEILI-01 | Search | FTS Postgres vs Meilisearch |
| B0-GRAF-01 | Ops | Sin Grafana |
| B0-COOKIE-01 | Legal | Sin banner cookies (analytics off) |

---

## 23. Gates (resultados reales)

Corrida local **22 agosto 2026**, Node/pnpm del repo. Postgres local.

| Gate | Exit | Detalle |
|------|------|---------|
| `pnpm lint` | **0** | turbo 8/8 |
| `pnpm typecheck` | **0** | incluye `@tcg/mobile` + `expo config` |
| `pnpm --filter @tcg/mobile lint` | **0** | |
| `pnpm --filter @tcg/mobile typecheck` | **0** | `tsc --noEmit && expo config --type public --json` |
| `pnpm test` | **0** | API 266, mobile 9 |
| `pnpm test:integration` | **0** | 101 |
| `pnpm build` | **0** | api + web + admin (web build loguea ECONNREFUSED al API en SSG, no falla) |
| `pnpm test:e2e` (suite) | **1** | 8 passed, `seller-happy-path` timeout “Agregar al carrito” |
| Playwright `seller-happy-path` aislado post-`beta:seed` | **0** | 1 passed |

Logs `[RefundsService] timeout` en tests son **esperados** (FakePaymentProvider / casos FAILED).

CI GitHub: mismo orden; Postgres **vacío** → seed qty 8 → la suite e2e suele pasar. El rojo local no implica rojo en Actions.

---

## 6–8 (salida ejecutiva)

### Deployment blockers
Hosting, DNS, TLS, Postgres managed, backups, secretos, CORS de orígenes reales, R2, Resend, error tracking. Todo TBD.

### Store blockers
EAS project, signing Android/iOS, cuentas developer, URLs públicas privacy/support, icono/screenshots, emails reales, Sign in with Apple capability. **No submit** a Play/App Store en B6–B7.

### Recommended next beta phase

**B1 Staging** — entorno HTTPS + Postgres + secretos + `ENABLE_REAL_PAYMENTS=false`, y destrabar **storage** y **email** (P0). No Scanner. No pagos live. No B6/B7 hasta tener API URL pública.

---

## Apéndice — feature freeze recordatorio

No implementar: Scanner, Stores, Auctions, Trades, Deck Builder, Cart Optimizer, `ENABLE_REAL_PAYMENTS=true`, payouts automáticos.
