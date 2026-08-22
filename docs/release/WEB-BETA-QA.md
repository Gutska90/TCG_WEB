# Web beta QA — Fase 11.0

Checklist para un tester externo. **No** hay pagos live. Usar sandbox.

Aviso: *Documento de beta / sujeto a revisión legal antes de producción real.*

## Datos de prueba

Reproducibles con `pnpm beta:seed` (después de Postgres + migrate). Cuentas sintéticas, no personas reales:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Comprador | `buyer.beta@example.test` | `BetaPassw0rd!` |
| Vendedor | `seller.beta@example.test` | `BetaPassw0rd!` |
| Admin | `admin.beta@example.test` | `BetaPassw0rd!` |

Carta semilla: **Test Mon #1** (Pokémon / Set de prueba). El vendedor beta publica esa carta.

Apps: web `http://localhost:3000`, admin `http://localhost:3002`, API `http://localhost:4000`.

## Buyer

- [ ] Crear cuenta (`/registro`): checkbox de términos **no** viene marcado; marketing es opcional.
- [ ] Tras registro, el perfil avisa email pendiente y permite reenviar / pegar token.
- [ ] Ingresar / recuperar contraseña / cerrar sesión.
- [ ] Sesión expirada: al pedir una página privada se redirige a ingresar.
- [ ] Buscar `Test Mon #1`, abrir ficha, ver publicaciones, agregar al carrito.
- [ ] Carrito vacío vs con items; cambiar cantidad; ir a pagar.
- [ ] Checkout muestra vendedor por ítem, subtotal, envío, total, **Pago de prueba / sandbox**, copy beta.
- [ ] CTA: “Confirmar pago de prueba” (no “pagar de verdad”).
- [ ] `/checkout/retorno` consulta el backend (no la query de MP): processing → simular pago → aprobado. También: timeout, expirado, rechazado si aplica.
- [ ] “Ver mis compras” lleva al listado.
- [ ] Detalle: timeline (solo hitos con timestamp o estado actual), confirmar recepción si está entregada, valorar si completed, abrir reclamo.
- [ ] Ver reclamo y enviar mensaje.

## Seller

- [ ] Onboarding vendedor (`/me/vendedor`) si la cuenta no es seller.
- [ ] Crear publicación (`/vender`): carta, condición, cantidad, precio, encuentro/envío.
- [ ] Listado `/me/publicaciones`: stock, condición, precio, envío; pausar; reactivar; editar.
- [ ] Ver venta, marcar preparación, despachar (encuentro o tracking).
- [ ] `/me/balance`: pendiente vs disponible (copy de liquidación, no “escrow MP”).

## Admin / trust (no en la web de usuarios)

- [ ] Desde listing: Reportar. Desde orden: Abrir reclamo. Links a `/ayuda`.
- [ ] La web de marketplace **no** enlaza al panel `/admin`.
- [ ] Staff entra en `http://localhost:3002/admin/ingresar` con la cuenta admin beta.
- [ ] Ver disputa en `/admin/disputes`. Resolver **no** mueve dinero.

## Errores esperados (es-CL, sin stack)

| Caso | Qué debe verse |
|------|----------------|
| 401 | Sesión expiró / volver a ingresar |
| 403 | Sin permiso o email no verificado |
| 404 | No encontrado + links inicio/buscar/ayuda |
| 409 | Mensaje de negocio (stock, estado) |
| 429 | Demasiados intentos |
| 500 | “El servicio tuvo un problema” + reintentar |

## Accesibilidad (pass básico, no WCAG completo)

Revisado: labels en formularios críticos, skip link, `:focus-visible`, nombres de botones en español, `lang="es-CL"`, alt en imagen de carta si hay URL, errores con `role="alert"`.

Pendiente / residual: menú móvil con `<details>` no es un dialog con focus trap; contraste del badge Beta es aceptable sobre blanco; no hay auditoría axe automatizada.

## Responsive (375 / 768 / 1440)

Pantallas críticas: buscar, ficha, listing, carrito, checkout, órdenes, publicaciones, disputas. Header compacta el nav en menú bajo `lg`.

## Automatizado

```bash
pnpm beta:seed
pnpm test:e2e
```

Specs: `e2e/buyer-happy-path.spec.ts`, `e2e/seller-happy-path.spec.ts`, `e2e/dispute-path.spec.ts`. No usan Mercado Pago live.
