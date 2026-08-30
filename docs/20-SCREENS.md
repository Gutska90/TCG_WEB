# 20 — Inventario de pantallas

Cada pantalla lista: fase, ruta, datos (API), acciones, vacío, error. Si la API de esa fase no existe, la pantalla **no se construye**.

---

## Web

### Públicas

| Fase | Ruta | API | Acciones |
|------|------|-----|----------|
| 1 | `/` | games; search suggest opcional | ir a juego, buscar |
| 1 | `/ingresar` | login, OAuth Google | consentimiento OAuth si es alta nueva |
| 1 | `/registro` | register | checkbox términos no preseleccionado; marketing opt-in separado |
| 10.7 | `/terminos` `/privacidad` `/marketplace` `/refunds` `/ayuda` | config legal + feedback | páginas públicas de beta |
| 1 | `/verificar-email` | verify | |
| 1 | `/recuperar-password` | forgot/reset | |
| 2 | `/{game}` | game + sets | |
| 2 | `/{game}/cartas` | search + `GET /v1/games/:slug/filters` | filtros por juego (set fijado no); URL compartible |
| 2 | `/{game}/{set}` | search + `GET /v1/games/:slug/filters` | mismos filtros, juego y set fijados |
| 2 | `/{game}/{set}/{card}` | card + variants | selector variante, favorito |
| 3 | `/buscar` | search + `GET /v1/games/:slug/filters` | query, filtros por juego, URL compartible |
| 4 | ficha + bloque vendedores | listings by variant | add cart |
| 4 | `/listings/{id}` | listing | |
| 4 | `/vendedores/{slug}` | user public + listings | |
| M1 | `/planes` | config pública `sellerPlans` | comparar tarifas, ver promo de lanzamiento |
| M1 | `/vender` | listing + fee-preview | wizard + estimación de comisión + “Ver planes” |
| 5 | `/carrito` | cart | qty, quitar |
| 6 | `/checkout` | checkout | address, shipping, pagar |
| 6 | `/me/compras` | orders as=buyer | |
| 6 | `/me/compras/{id}` | order | confirmar, abrir disputa |
| 10.5 | `/me/disputas` `/me/disputas/{id}` | disputes | mensajes |
| 6 | `/me/ventas` | orders as=seller | |
| 6 | `/me/ventas/{id}` | order | preparar, despachar; snapshot de comisión (plan/promo) |
| 4 | `/me/publicaciones` | listings mine | pausar, editar |
| 1 | `/me` | me | datos de cuenta, privacidad, solicitud de baja |
| 11.5 | `/me/seguridad` | identities + sessions | métodos, password, revoke |
| 1 | `/me/sesiones` | redirect | alias a `/me/seguridad` |
| 2 | `/me/favoritos` | favorites | |
| 4 | `/me/direcciones` | addresses | |
| 4 | `/me/vendedor` | seller onboarding | |
| 7 | `/checkout/retorno` | poll `GET /v1/checkouts/:id` | processing / approved / rejected / timeout / expired; CTA “Ver mis compras”; no confiar en query MP |
| 11.0 | `/me/balance` | `GET /v1/me/balance` | pendiente / disponible (copy de liquidación) |
| 11.0 | `/me/publicaciones/{id}` | PATCH listing | editar condición, stock, precio, envío |
| 12 | `/me/coleccion` `/me/coleccion/:itemId` `/me/coleccion/sets/:setId` | collection items/summary/sets | agregar, editar, vender prefill, faltantes |
| 13 | ficha + gráfico | `GET /v1/variants/:id/prices` | rangos 1m/3m/6m/1a |
| 14 | `/me/wishlist` | wishlist | precio objetivo, quitar |
| 14 | `/me/notificaciones` | notifications + prefs | marcar leídas, PRICE_DROP opt-in |
| 15 | `/tiendas/{slug}` | store | |
| 16 | `/subastas` `/subastas/{id}` | auctions | |

Legales (contenido estático, Fase 1): `/terminos`, `/privacidad`, `/fuentes`.

### Wizard `/vender` (pasos)

1. Buscar carta (`search/cards`)
2. Elegir carta y variante
3. Condición (+ graded opcional)
4. Cantidad y precio (mostrar sugerencia)
5. Fotos (1–8) + meetup/envío + descripción
6. Confirmar y publicar

Vacío paso 1: “No encontramos esa carta. Puedes reportarla.”

### Ficha de carta — bloques

1. Arte / placeholder, nombre, set, número, rareza, atributos del TCG (no `{}`)
2. Chips de variante (idioma, finish)
3. Mercado: market, min, avg, #listings (0 en MVP 1)
4. Acciones: Favorito, (Fase 4) Vender esta, (12) Colección, (14) Wishlist
5. Vendedores (Fase 4): tabla condición, vendedor, ★, precio, [Agregar]
6. Gráfico e índice TCG Market Chile (Fase 13)

### Estados vacíos / error

- Búsqueda 0 resultados: CTA a `/ayuda`.
- Carrito vacío: ir a buscar.
- Checkout con `paymentsSandbox`: badge “Pago de prueba / sandbox” y CTA “Confirmar pago de prueba”.
- Order 404: no filtrar si es IDOR (403 vs 404 consistente: **404** para recursos ajenos).
- MP rechazo / checkout expirado / timeout de polling: mensajes en `/checkout/retorno`; stock ya liberado si webhook cancelled.
- 401 sesión: redirect a `/ingresar?next=`. 500: `app/error.tsx` sin stack.

## Web — UI.1 Visual Refresh

Header: **TCG MARKET** + badge Beta, buscador, wishlist, carrito, cuenta (dropdown). Subnav de juegos + Vender. Tema Claro/Oscuro/Sistema (local, sin login).

Home: hero “Encuentra. Colecciona. Compra. Vende.”, juegos, publicaciones vía `GET /v1/listings` existente, CTAs colección/wishlist.

`/buscar`, `/{game}/cartas` y `/{game}/{set}`: filtros en sidebar (desktop) o sheet (mobile). Cards con imagen `object-contain`.

Ficha: imagen | mercado / menor listing; historial con confianza; publicaciones tabla/cards.

`/me`: sidebar Perfil, Colección, Wishlist, Compras, Ventas, Publicaciones, Seguridad.

Colección: StatCards, chips de juego, grid/list. Wishlist: cards + “Objetivo alcanzado”. Carrito agrupado por seller; checkout dos columnas + SANDBOX/BETA.

Tokens: [design/DESIGN-SYSTEM.md](design/DESIGN-SYSTEM.md).

---

## Mobile (Fase 11, mismos flujos)

| Tab / stack | Ruta Expo | API |
|-------------|-----------|-----|
| Inicio | `/(tabs)` | games, listings recientes |
| Buscar | `/(tabs)/search` | `GET /v1/search/cards` |
| Colección | `/(tabs)/collection` `/collection/[id]` `/collection/sets/[setId]` | `GET/POST/PATCH/DELETE /v1/me/collection/*` |
| Wishlist | `/(tabs)/wishlist` | `GET/PUT/DELETE /v1/me/wishlist` |
| Perfil | `/(tabs)/profile` | `GET /v1/me` + selector de tema |
| Favoritos | `/(tabs)/favorites` (oculto en tab bar) | `GET/PUT/DELETE /v1/me/favorites` |
| Carrito | `/(tabs)/cart` (icono header + badge) | `GET/PUT/DELETE /v1/cart` (sesión) |
| Auth | `/login` `/register` `/verify-email` `/forgot-password` `/oauth` | email + Google/Apple |
| Seguridad | `/security` | identities, sessions, password |
| Carta | `/card/[id]` | `GET /v1/cards/:id` + listings |
| Listing | `/listing/[id]` | listing, cart, `POST /v1/reports` |
| Checkout | `/checkout` `/checkout-return` | checkout + poll + simulate |
| Compras | `/purchases` `/purchases/[id]` | orders as=buyer |
| Ventas | `/sales` `/sales/[id]` | orders as=seller; prepare/ship |
| Reclamos | `/disputes` `/disputes/[id]` | disputes |
| Publicaciones | `/sell` `/sell/new` `/sell/[id]` | listings seller |
| Saldo / direcciones | `/balance` `/addresses` | me/balance, addresses |
| Wishlist | tab `/(tabs)/wishlist` | `GET/PUT/DELETE /v1/me/wishlist` |
| Notificaciones | `/notifications` | `GET /v1/me/notifications` + preferencias (PRICE_DROP opt-in) |
| Legal / feedback | `/legal/[slug]` `/feedback` | documentos + `POST /v1/feedback` |

No hay tab Escanear ni Tiendas. Rutas alineadas en intención, no clonan slugs SEO. QA: [release/MOBILE-BETA-QA.md](release/MOBILE-BETA-QA.md).

---

## Admin (Fase 10)

| Ruta admin | |
|-----------|--|
| `/admin` | dashboard KPIs (10A) |
| `/admin/users` | listado lectura (10A); detalle/ban en 10B; link Plan (M1) |
| `/admin/sellers/:id/plan` | M1 asignar plan manual (motivo + audit, sin cobro) |
| `/admin/listings` | listado lectura (10A); pausar en 10B |
| `/admin/orders` `/admin/orders/:id` | listado 10A; detalle, cancel, retry 10B |
| `/admin/payments` `/admin/payments/:id` | 10A listado; 10B detalle |
| `/admin/refunds` `/admin/refunds/:id` | 10A listado; 10B detalle + retry |
| `/admin/payouts` `/admin/payouts/:id` | 10C manual |
| `/admin/sellers/:id/balance` `/admin/ledger` | 10C |
| `/admin/reconciliation` `/admin/reconciliation/runs/:id` `/admin/reconciliation/issues/:id` | 10D |
| `/admin/disputes` `/admin/disputes/:id` `/admin/reports` `/admin/reports/:id` `/admin/moderation` | 10.5 |
| `/admin/feedback` | 10.7 lista simple |
| `/catalog/games|sets|cards` | |
| `/catalog/imports` | disparar job |
| `/config` | comisión, timeouts, shipping rates |
| `/audit` | |

---

## Copy UI (es-CL)

- Botones: “Ingresar”, “Crear cuenta”, “Vender”, “Agregar al carrito”, “Pagar”, “Confirmar recepción”, “Abrir reclamo”
- Condiciones: mostrar código + nombre (`NM · Near Mint`)
- Nunca “Add to cart” en UI. Código interno sí en inglés.
