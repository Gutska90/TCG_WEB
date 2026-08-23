# Web beta QA — B4

Checklist para un tester externo. **No** hay pagos live. Usar sandbox. `ENABLE_REAL_PAYMENTS=false`.

Aviso: *Documento de beta / sujeto a revisión legal antes de producción real.*

Staging cloud (hosting/DNS) lo provisiona el operador; si aún no existe, usar localhost. URLs:

| App | Local | Staging (placeholder) |
|-----|-------|------------------------|
| Web | `http://localhost:3000` | `https://web.staging.example.test` |
| Admin | `http://localhost:3002` | `https://admin.staging.example.test` |
| API | `http://localhost:4000` | `https://api.staging.example.test` |

Playwright: `E2E_WEB_URL`, `E2E_ADMIN_URL`, `E2E_API_URL`. Antes de una corrida: `pnpm beta:seed` (restock si available < 8, expira checkouts vencidos, fixture de refund FAILED en Test Mon #2).

## Datos de prueba

Cuentas sintéticas (`pnpm beta:seed`), no personas reales:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Comprador | `buyer.beta@example.test` | `BetaPassw0rd!` |
| Vendedor | `seller.beta@example.test` | `BetaPassw0rd!` |
| Admin | `admin.beta@example.test` | `BetaPassw0rd!` |

Carta semilla de compra: **Test Mon #1** (Pokémon / Set de prueba). No renombrar ni borrar esa carta.

Sellers de vitrina (mismo password; no son cuentas de E2E):

| Rol | Email | Contraseña |
|-----|-------|------------|
| Vitrina RM | `cartas.santiago.beta@example.test` | `BetaPassw0rd!` |
| Vitrina Valparaíso | `mazo.valparaiso.beta@example.test` | `BetaPassw0rd!` |
| Vitrina Biobío | `foil.concepcion.beta@example.test` | `BetaPassw0rd!` |

Yu-Gi-Oh en home/buscar es **catálogo demo** del seed, no un juego Fase 1. Colección grande local: `SHOWCASE_COLLECTION_SIZE=1000 pnpm beta:seed`.

## Buyer (Fases 11–14)

- [ ] Crear cuenta (`/registro`): checkbox de términos **no** viene marcado; marketing es opcional.
- [ ] Tras registro, el perfil avisa email pendiente y permite reenviar / pegar token.
- [ ] Ingresar / recuperar contraseña / cerrar sesión.
- [ ] Sesión expirada: al pedir una página privada se redirige a ingresar.
- [ ] Buscar `Test Mon #1`, abrir ficha, ver publicaciones, agregar al carrito.
- [ ] Carrito vacío vs con items; cambiar cantidad; ir a pagar.
- [ ] Checkout muestra vendedor por ítem, subtotal, envío, total, **Pago de prueba / sandbox**, copy beta.
- [ ] CTA: “Confirmar pago de prueba” (no “pagar de verdad”).
- [ ] `/checkout/retorno` consulta el backend (no la query de MP): processing → simular pago → aprobado.
- [ ] “Ver mis compras” lleva al listado. Detalle: timeline, confirmar recepción si está entregada, valorar si completed, abrir reclamo.
- [ ] Colección: agregar desde ficha, listar `/me/coleccion`, editar cantidad, progreso de set, CTA vender.
- [ ] Historial de precios en ficha (rangos 1m/3m/6m/1a). Copy de índice TCG Market Chile, no precios de terceros.
- [ ] Wishlist: añadir con precio máximo, listar `/me/wishlist`, quitar.
- [ ] Notificaciones **in-app** `/me/notificaciones` (listado + preferencias). Tras un checkout sandbox deben aparecer `PURCHASE_MADE` / `SALE_MADE`. Push no está en esta beta. Email de alerta requiere correo de staging (Resend/SMTP).

## Seller

- [ ] Onboarding vendedor (`/me/vendedor`) si la cuenta no es seller.
- [ ] Crear publicación (`/vender`): carta, condición, cantidad, precio, encuentro/envío. Foto: en staging el PUT prefirmado debe completar; en local sin Minio/R2 queda `deferred`.
- [ ] Listado `/me/publicaciones`: stock, pausar, reactivar, editar.
- [ ] Ver venta: preparación, encuentro o tracking, marcar entregado.
- [ ] `/me/balance`: pendiente vs disponible (copy de liquidación, no “escrow MP”).

## Admin / trust (panel aparte)

Ver [ADMIN-BETA-QA.md](ADMIN-BETA-QA.md). La web de marketplace **no** enlaza a `/admin`. Staff: `…/admin/ingresar`. Resolver disputa **no** mueve dinero. Payouts son manuales (sin transferencia).

## Headers / B2 (staging HTTPS)

- [ ] Web y admin envían CSP + HSTS (HSTS solo en HTTPS).
- [ ] API Helmet. `ADMIN_IP_ALLOWLIST` en el host admin público.

## Errores esperados (es-CL, sin stack)

| Caso | Qué debe verse |
|------|----------------|
| 401 | Sesión expiró / volver a ingresar |
| 403 | Sin permiso o email no verificado |
| 404 | No encontrado + links inicio/buscar/ayuda |
| 409 | Mensaje de negocio (stock, estado) |
| 429 | Demasiados intentos |
| 500 | “El servicio tuvo un problema” + reintentar |

## Accesibilidad / responsive

Labels en formularios críticos, skip link, `:focus-visible`, `lang="es-CL"`. Pantallas 375 / 768 / 1440: buscar, ficha, carrito, checkout, órdenes, colección, wishlist, notificaciones.

## UI.1 Visual Refresh

- [ ] Tema Claro / Oscuro / Sistema (header; persiste sin login). Contraste razonable.
- [ ] Header: TCG MARKET, buscador, carrito, Vender; cuenta en dropdown.
- [ ] Home: hero, juegos, publicaciones si hay listings, CTAs colección/wishlist.
- [ ] `/buscar`: sidebar desktop, Filtros en mobile, cards con imagen contain.
- [ ] Ficha: precio mercado ≠ menor listing; badge de confianza; publicaciones.
- [ ] Colección StatCards + progreso set; wishlist cards; carrito por seller; checkout resumen + SANDBOX/BETA.
- [ ] 375 / 390 / 768 / 1024 / 1440 sin scroll horizontal en header, home, search, ficha, colección, wishlist, cart, checkout, perfil.

## Automatizado (gate CI)

```bash
pnpm beta:seed
pnpm test:e2e
```

Specs en `e2e/`: buyer/seller/dispute/auth, colección, precios, wishlist, **admin ops / refund retry / payout**. No usan Mercado Pago live. `JOBS_ENABLED=false` en Playwright; el seed libera checkouts vencidos. En development/test el rate limit HTTP no cuenta (Playwright supera 10 logins/15 min); staging/producción sí.
