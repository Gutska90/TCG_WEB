# Guía rápida para testers — Pre-Staging

Documento de **beta**. No hay dinero real. `ENABLE_REAL_PAYMENTS=false`.

Aviso: *sujeto a revisión legal antes de producción real.*

Si aún no hay staging en la nube, usar **localhost**. El operador publica URLs reales en B1.

| App | Local |
|-----|--------|
| Web | `http://localhost:3000` |
| Admin | `http://localhost:3002` |
| API | `http://localhost:4000` |

Antes de probar: API + web arriba, Postgres migrado, `pnpm beta:seed`.

## Cuentas sintéticas

No son personas reales. Misma contraseña: `BetaPassw0rd!`

| Rol | Email |
|-----|--------|
| Comprador | `buyer.beta@example.test` |
| Vendedor | `seller.beta@example.test` |
| Admin | `admin.beta@example.test` |

Carta de compra E2E: **Test Mon #1** (no renombrar). Vitrina extra: nombres demo (Ember Pup, etc.), no IP de editoriales.

Sellers de vitrina (mismo password `BetaPassw0rd!`):

| Email |
|--------|
| `cartas.santiago.beta@example.test` |
| `mazo.valparaiso.beta@example.test` |
| `foil.concepcion.beta@example.test` |

Colección grande local: `SHOWCASE_COLLECTION_SIZE=1000 pnpm beta:seed`.

## Qué probar

Flujos sandbox: registro, login, buscar, ficha, carrito, checkout de prueba, orden, confirmar recepción, rating, disputa. Seller: onboarding, listing, `/planes`, estimación de comisión al publicar, venta, preparar, despachar, saldo, tarjeta Tu plan. Admin: dashboard, refund, payout **manual**, conciliación, disputa, reportes, jobs, asignación manual de plan de vendedor (sin cobro de mensualidad).

Colección, historial de precios (índice TCG Market Chile) y wishlist. Tema claro/oscuro. Mobile web (~375px).

Checklist: [QA-MANUAL.md](QA-MANUAL.md).

## Qué NO probar

- Pagos con plata real / Mercado Pago live.
- Scanner, tiendas, subastas, intercambios, deck builder, carrito óptimo.
- Push nativo, Play Store, App Store.
- Borrar usuarios a mano en SQL.
- Credenciales de otras personas o datos reales de testers en el seed.

## Cómo reportar un bug

Un reporte por issue. Incluir:

1. Qué hacías (rol + URL + pasos).
2. Qué esperabas vs qué viste.
3. Cuenta usada (email sintético).
4. Fecha/hora y si era localhost o staging.
5. Captura o texto del error (sin tokens ni contraseñas).
6. Severidad (abajo).

## Severidad

| Nivel | Significa |
|-------|-----------|
| **P0** | No se puede comprar/vender en sandbox, pérdida de dinero interno, fuga de datos, IDOR, auth rota, el sitio no carga. |
| **P1** | Flujo principal degradado (checkout, stock, refund, payout, sesión, fotos si el storage ya está). Workaround pobre. |
| **P2** | Cosmético, copy, un juego de vitrina, vacíos de UI, performance menor. Beta usable. |

Si dudas entre P0 y P1, marca P1 y describe el impacto.

## Sandbox / no dinero real

El checkout dice **Pago de prueba**. Confirmar no cobra. El saldo seller es contable interno; el payout admin **no** transfiere a un banco. Disputas no mueven ledger. Fotos pueden quedar `deferred` hasta R2. Correos: en local van a log/Inbucket; sin Resend no llegan a Gmail.
