# Mobile beta QA — B4

Checklist para tester externo en **Android y iOS**. API sandbox. `ENABLE_REAL_PAYMENTS=false`. Seed: `pnpm beta:seed`.

Cuentas (solo local/staging, nunca producción):

- Comprador: `buyer.beta@example.test` / `BetaPassw0rd!`
- Vendedor: `seller.beta@example.test` / `BetaPassw0rd!`

Scheme: `tcgplatform://checkout-return?checkoutId=`. El estado del deep link **no** prueba el pago; debe verse polling al servidor.

`EXPO_PUBLIC_API_BASE_URL` en dispositivo físico = API HTTPS de staging (B1 operador) o IP LAN en local. APK interno: [B6-ANDROID-BETA.md](B6-ANDROID-BETA.md). TestFlight: [B7-IOS-TESTFLIGHT.md](B7-IOS-TESTFLIGHT.md).

Probar al menos: Android teléfono pequeño, Android grande, iPhone estándar, iPhone grande. Tablet no es bloqueo si el layout no se rompe.

Notificaciones **in-app** existen (Fase 14, `/notifications`). **Push tokens siguen diferidos** (no es un fallo de esta beta). Email de alerta depende de Resend/SMTP en staging.

## AUTH

- [ ] Registro email + términos no premarcados
- [ ] Login email/password
- [ ] Verificar email (token)
- [ ] Forgot / reset password
- [ ] Logout borra sesión (vuelve a pedir login)
- [ ] No hay botones Google/Apple rotos (flags off hasta IDs de staging)
- [ ] Cuenta baneada muestra mensaje claro

## SEARCH

- [ ] Debounce al escribir
- [ ] Loading / vacío / error
- [ ] Filtros game / set / idioma / finish / precio
- [ ] Scroll de más resultados
- [ ] Carta Test Mon #1 (Pokémon) aparece

## CARD

- [ ] Imagen, set, número, rareza, variante
- [ ] Precio orientativo + historial si `ENABLE_PRICES`
- [ ] Listings y CTA ver publicaciones
- [ ] Favorito / wishlist (si hay sesión)

## LISTING

- [ ] Seller, reputación, precio, condición, idioma, finish, stock, envío, descripción
- [ ] Agregar al carrito
- [ ] Listing no disponible: estado claro
- [ ] Reportar: motivo + detalle + éxito
- [ ] Rate limit 429: mensaje en español

## CART

- [ ] Items agrupados por vendedor
- [ ] +/- cantidad, quitar
- [ ] Totales del backend (no inventar)
- [ ] Mensaje si listing vendido / stock / precio

## CHECKOUT

- [ ] Exige login + email verificado
- [ ] Copy Beta + “Pago de prueba / sandbox”
- [ ] Shipping por seller + dirección si no es meetup
- [ ] CTA “Confirmar pago de prueba”
- [ ] No hay flujo live con `ENABLE_REAL_PAYMENTS=false`

## PURCHASE

- [ ] Lista: número, seller, total, estado, fecha
- [ ] Detalle: items, envío, copy de pago (sin HELD/RELEASED)
- [ ] Timeline derivada
- [ ] Confirmar recepción y valorar cuando aplique
- [ ] Abrir reclamo

## SALE

- [ ] Solo vendedor
- [ ] Prepare / ship / entregar según estado (transición ilegal = error 409)
- [ ] Comprador: display name mínimo

## COLLECTION (Fase 12)

- [ ] Agregar lote desde carta
- [ ] Listar, editar cantidad, progreso de set
- [ ] CTA vender desde un lote

## PRICES (Fase 13)

- [ ] Historial en ficha (rangos). Índice TCG Market Chile, no terceros.

## WISHLIST (Fase 14)

- [ ] Añadir con precio máximo, listar, quitar
- [ ] Alerta in-app `WISHLIST_HIT` si hay listing ≤ objetivo (no spam del mismo listing)

## NOTIFICATIONS (in-app)

- [ ] Perfil → Notificaciones: listado, vacío, marcar leídas
- [ ] Preferencias in-app / email (email no llega sin correo de staging)
- [ ] Copy: push aún no activo

## DISPUTE

- [ ] Lista `/disputes`
- [ ] Detalle: status, mensajes, evidencia
- [ ] Sin notas internas de staff

## REPORT

- Cubierto en LISTING.

## PROFILE

- [ ] displayName, email, seller, direcciones, legal, feedback, logout
- [ ] Solicitar desactivación
- [ ] Si seller: publicaciones + saldo
- [ ] Tema Claro / Oscuro / Sistema (sin login)

## UI.1

- [ ] Tabs: Inicio, Buscar, Colección, Wishlist, Perfil (iconos Ionicons). Carrito en header con badge; `Carrito` sigue siendo el label accesible.
- [ ] Home: search, atajos de juego, publicaciones, CTA colección/wishlist (sin feed infinito).
- [ ] Tema Claro / Oscuro / Sistema en Perfil (sin login). Misma paleta primary/surfaces que web. Imágenes de carta `contain`.

## NETWORK ERROR

- [ ] API caída / sin red: mensaje, retry
- [ ] Timeout de checkout: estado timeout + CTA compras

## SESSION EXPIRED

- [ ] Refresh inválido → Ingresar
- [ ] 401 en pantalla protegida → login

## Plataformas

| Flujo | Android | iOS |
|-------|---------|-----|
| AUTH | | |
| SEARCH/CARD/LISTING | | |
| CART/CHECKOUT | | |
| PURCHASE/SALE | | |
| COLLECTION/PRICES/WISHLIST | | |
| NOTIFICATIONS (in-app) | | |
| DISPUTE/REPORT | | |
| PROFILE | | |
| NETWORK/SESSION | | |

## Maestro (opcional, no es gate de CI)

CI de GitHub no tiene emulador. Correr en simulador local o nightly `workflow_dispatch`:

```bash
pnpm test:maestro
```

Flujos en `apps/mobile/.maestro/` (login, búsqueda, checkout sandbox, venta, disputa, colección, wishlist, notificaciones).
