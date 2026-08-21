# 15 — Roadmap

Cada fase es un incremento mergeable. No se adelanta la siguiente sin criterios de salida.

```text
FASE 0   Arquitectura y diseño          ✓ scaffold listo
FASE 1   Usuarios + autenticación       ✓ implementation
FASE 2   Catálogo TCG                   ✓
FASE 3   Buscador                       ✓
FASE 4   Marketplace (listings)         ✓
FASE 5   Carrito                        ✓
FASE 6   Órdenes                        ✓
FASE 7   Pagos                          🟡 implementation (hardening 9.5)
FASE 8   Envíos                         ✓ MVP
FASE 9   Reputación                     ✓
FASE 9.5A MONEY SAFETY                  ✓
FASE 9.5B SECURITY                      ✓
FASE 9.5C RELEASE GATE                  ← siguiente
FASE 10  Admin
FASE 11  Mobile
FASE 12  Colecciones
FASE 13  Historial de precios
FASE 14  Wishlist + alertas
FASE 15  Tiendas
FASE 16  Subastas
FASE 17  Scanner IA
```

## Relación con MVPs de producto

| MVP | Fases | Resultado |
|-----|-------|-----------|
| 1 Catálogo | 0–3 (+ web mínima) | Gente se registra y explora cartas |
| 2 Marketplace | 4–6 | Publicar y “comprar” sin plata real |
| 3 Transacciones | 7–10 | Marketplace usable en Chile (sandbox → prod) |
| App | 11 | Mismos flujos en Expo |
| Retención | 12–14 | Colección, precios, alertas |
| B2B | 15 | Tiendas |
| Diferenciación | 16–17 | Subastas + scanner |

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

## Fase 9.5C

- 9.5C Release gate: CI con tests, integración Postgres, E2E crítico.

## Fases 10–11+

Según [01-REQUIREMENTS](01-REQUIREMENTS.md) MVP 2–3.

## Fases 11+

No se implementan pantallas “de mentira” que llamen APIs inexistentes. Si la tab Escanear existe en Fase 11, es placeholder honesto.

## Criterio para cambiar el roadmap

Un cambio de orden (p. ej. mobile antes de pagos) se documenta aquí **antes** de ejecutarlo. Default: API y web de marketplace antes de store listings de iOS/Android.
