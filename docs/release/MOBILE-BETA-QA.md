# Mobile beta QA — Fase 11

Checklist para tester externo en **Android y iOS**. API sandbox. `ENABLE_REAL_PAYMENTS=false`. Seed: `pnpm beta:seed`.

Cuentas (solo entorno local/staging, nunca producción):

- Comprador: `buyer.beta@example.test` / `BetaPassw0rd!`
- Vendedor: `seller.beta@example.test` / `BetaPassw0rd!`

Scheme: `tcgplatform://checkout-return?checkoutId=`. El estado del deep link **no** prueba el pago; debe verse polling al servidor.

Probar al menos: Android teléfono pequeño, Android grande, iPhone estándar, iPhone grande. Tablet no es bloqueo si el layout no se rompe.

## AUTH

- [ ] Registro email + términos no premarcados
- [ ] Login email/password
- [ ] Verificar email (token)
- [ ] Forgot / reset password
- [ ] Logout borra sesión (vuelve a pedir login)
- [ ] No hay botones Google/Apple rotos
- [ ] Cuenta baneada muestra mensaje claro

## SEARCH

- [ ] Debounce al escribir
- [ ] Loading / vacío / error
- [ ] Filtros game / set / idioma / finish / precio
- [ ] Scroll de más resultados
- [ ] Carta Test Mon #1 (Pokémon) aparece

## CARD

- [ ] Imagen, set, número, rareza, variante
- [ ] Precio orientativo existente (sin gráfico)
- [ ] Listings y CTA ver publicaciones
- [ ] Favorito (si hay sesión)

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
- [ ] Prepare / ship según estado (transición ilegal = error 409)
- [ ] Comprador: display name mínimo

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
| DISPUTE/REPORT | | |
| PROFILE | | |
| NETWORK/SESSION | | |

Maestro (opcional, simulador): `maestro test apps/mobile/.maestro/`.
