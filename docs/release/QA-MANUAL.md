# Checklist QA manual — Pre-Staging

Marcar en localhost o staging. `ENABLE_REAL_PAYMENTS=false`. Seed: `pnpm beta:seed`. Cuentas: [TESTER-GUIDE.md](TESTER-GUIDE.md).

Copy de checkout: “Confirmar pago de prueba”, no “pagar de verdad”.

```text
BUYER
registro
login
buscar
listing
carrito
checkout
orden
confirmar
rating
disputa

SELLER
onboarding
listing
editar
venta
preparar
despachar
balance

ADMIN
dashboard
refund
payout
reconciliation
dispute
report
jobs
```

## BUYER

- [ ] Registro `/registro`: términos **desmarcados**; marketing opcional.
- [ ] Login `/ingresar`. Recuperar contraseña. Cerrar sesión.
- [ ] Sesión expirada: página privada → `/ingresar?reason=expired`.
- [ ] Buscar `Test Mon #1` y una carta de vitrina (p. ej. Ember Pup). Ficha + publicaciones.
- [ ] Listing: precio, vendedor, agregar al carrito.
- [ ] Carrito: vacío vs ítems; cantidad; ir a pagar.
- [ ] Checkout: vendedor, subtotal, envío, total, badge sandbox/beta. CTA de prueba. No doble envío al pulsar dos veces.
- [ ] Retorno: el estado lo dice el backend (no la query de MP). Simular pago → aprobado.
- [ ] Orden: timeline. Confirmar recepción si entregada. Rating si completed. Abrir disputa.
- [ ] Colección `/me/coleccion`. Wishlist `/me/wishlist`. Precios en ficha (1m/3m/6m/1a) = índice TCG Market Chile.
- [ ] 404 (`/ruta-inventada`) y, si puedes forzar, 500 con Reintentar. Banner si cortas la red.

## SELLER

- [ ] Onboarding `/me/vendedor` si la cuenta no es seller.
- [ ] Crear listing `/vender` (carta, condición, qty, precio, meetup/envío). Foto: local puede quedar deferred.
- [ ] Editar / pausar / reactivar en `/me/publicaciones`.
- [ ] Tras una venta: preparar, despachar (encuentro o tracking), marcar entregado.
- [ ] `/me/balance`: pendiente vs disponible (copy de liquidación, no “escrow MP”).

## ADMIN

Panel aparte (`/admin/ingresar`). Cuenta `admin.beta@example.test`. La web **no** enlaza al admin.

- [ ] Dashboard / Operación: KPIs. Zona `America/Santiago`.
- [ ] Refund: fixture Test Mon #2 / retry si FAILED. Completar no deja el botón.
- [ ] Payout manual hasta PAID con comprobante externo. No hay transferencia.
- [ ] Reconciliation: issues de lectura; no muta Payment/Ledger.
- [ ] Dispute: resolver **sin** mover dinero.
- [ ] Reportes / moderación.
- [ ] Jobs: en Playwright `JOBS_ENABLED=false`; en staging el operador los enciende.

## Extra (PS)

- [ ] Tema Claro / Oscuro / Sistema en el header.
- [ ] Home: hero **Encuentra. Colecciona. Compra. Vende.**, juegos, publicaciones, CTAs colección/wishlist.
- [ ] 375 / 768 / 1440 sin scroll horizontal en header, home, buscar, ficha, colección, wishlist, carrito, checkout.
- [ ] Checkout concurrente qty=1: dos compradores no venden el mismo único (el segundo ve error de stock). Automatizado en API; opcional a mano con dos sesiones.

Automatizado: `pnpm test:e2e` (pide seed). No usa MP live.
