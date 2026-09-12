# Cómo usar TCG Market Chile (web)

Guía para personas que usan el sitio. No es un contrato. En beta el pago es de prueba: **no hay cobro real**.

Sitio local: `http://localhost:3000`. En staging/producción usa la URL que publique el operador.

Ayuda in-app: `/ayuda` (FAQ + feedback). Testers: [TESTER-GUIDE](TESTER-GUIDE.md). Spec de pantallas: [09-WEB](../09-WEB.md).

---

## 1. Qué es este sitio

TCG Market Chile es un marketplace de cartas: catálogo canónico + publicaciones de vendedores. Buscas la **carta** (Helénica, Furia, un Charizard, etc.) y, si alguien la vende, compras esa **publicación**.

No es el stock de una sola tienda. Cada vendedor publica sus copias. Si una carta no tiene precio, igual existe en catálogo para coleccionar, wishlist o vender después.

**No hay** (aún): scanner, tiendas B2B, subastas, intercambios, deck builder.

---

## 2. Empezar

| Quieres | Ruta |
|---------|------|
| Crear cuenta | `/registro` (acepta términos; marketing es opt-in aparte) |
| Entrar | `/ingresar` (email o Google/Apple si está activo) |
| Verificar correo | Revisa el mail; sin correo real en local el código va al log |
| Recuperar clave | `/recuperar-password` |
| Tema claro/oscuro | Ícono de tema en el header |

El header tiene: logo (inicio), búsqueda, wishlist, carrito, menú de cuenta, **Vender**.

Invitado: puedes explorar, buscar y armar carrito. Para comprar, vender o guardar colección/wishlist, ingresa.

---

## 3. Explorar el catálogo

### Inicio (`/`)

Buscador, juegos y cartas con publicaciones. El envío del buscador del home apunta a **En venta**.

### Un juego (`/mitos-y-leyendas`, `/pokemon`, …)

Lista de ediciones. En Mitos y Leyendas se agrupan por época: Primera Era, Primer Bloque, Segundo Bloque, FX, Imperio, Leyendas Bloque Furia.

### Una edición (`/mitos-y-leyendas/helenica`)

Grilla de cartas de esa edición. Interruptor **Catálogo / En venta**:

- **Catálogo** — todas las cartas de la edición (aunque nadie las venda).
- **En venta** — solo las que tienen publicación activa.

### Una carta (`/mitos-y-leyendas/helenica/hestia`)

Ficha: arte oficial, datos, habilidad/historia (MyL), precios de mercado si hay datos, ofertas de vendedores.

Desde ahí puedes: agregar a colección, wishlist, favoritos, **Vender esta**, o comprar una oferta.

### Buscar (`/buscar`)

Escribe el nombre. Sugerencias al tipear. Filtros por juego, edición, etc. Mismo interruptor Catálogo / En venta.

---

## 4. Comprar

1. Entra a una **publicación** (`/listings/{id}`) o elige un vendedor en la ficha.
2. En la **imagen** usa **− / +** para la cantidad (tope = stock).
3. **Agregar al carrito**.
4. Abre `/carrito`. Puedes cambiar cantidad otra vez sobre la imagen o **Quitar**.
5. Si el vendedor tiene WhatsApp público: **Consultar lote** crea una *Consulta N°* (no reserva stock) y puede abrir WhatsApp. El canal principal es pagar en la plataforma.
6. **Ir a pagar** → `/checkout`: dirección, envío o encuentro por vendedor, confirmar.
7. En beta: **Pago de prueba**. No se cobra plata real.

Después: `/me/compras` → detalle de la orden. Cuando te llega (o el encuentro ocurre), **confirma recepción** y valora al vendedor. Si algo falla, abre un **reclamo** (`/me/disputas`).

Carrito con varios vendedores: cada grupo se paga/envía por separado en el checkout.

---

## 5. Consultar a un vendedor (sin comprar aún)

WhatsApp es **consulta**, no pedido ni cotización formal, y **no reserva stock**.

- Una carta: botón en la publicación.
- Varias del mismo vendedor: en el carrito, **Consultar lote por WhatsApp**.
- Historial: `/me/consultas` (comprador y vendedor). La consulta vence (24 h) si nadie la usa.

Para tomarla de verdad: agrégala al carrito y paga.

---

## 6. Vender

1. Completa onboarding en `/me/vendedor` (datos de vendedor).
2. `/vender` o **Vender esta** en una ficha.
3. Pasos: buscar carta → variante → condición → cantidad y precio (ves comisión estimada) → fotos → encuentro/envío → publicar.
4. Planes y tarifas: `/planes`. En beta no se cobra la mensualidad sola.
5. Gestiona en `/me/publicaciones` (pausar, editar).
6. Cuando vendes: `/me/ventas` → preparar → despachar o listo para encuentro.
7. Saldo contable: `/me/balance`. La liquidación a banco la hace un admin; no es transferencia automática.

Condiciones: NM, LP, MP, HP, DMG (nombres en español en la UI). Sé honesto en fotos y texto.

### Si la carta no está en el catálogo

No inventes un título libre.

1. `/vender/solicitar-carta`
2. Juego, edición existente **o nombre de una edición nueva**, nombre de la carta, número, rareza, datos, URL de imagen si tienes.
3. Sigue el estado en `/me/solicitudes-catalogo`.
4. Un **admin** aprueba (y puede crear la edición). Recién entonces puedes publicarla.

---

## 7. Colección, wishlist y favoritos

| | Qué es | Dónde |
|--|--------|--------|
| Colección | Lo que tienes (cantidad, condición, costo) | `/me/coleccion` |
| Progreso de set | Cuántas te faltan | `/me/coleccion/sets/{id}` |
| Wishlist | La quieres, con precio máximo; te avisamos | `/me/wishlist` |
| Favoritos | Atajo a la variante, sin precio objetivo | `/me/favoritos` |

Desde la ficha: botones de colección / wishlist / favoritos. Puedes vender desde un ítem de colección (prellena `/vender`).

Precios de mercado en la ficha: índice TCG Market Chile + historial. Es orientación, no una tasación.

---

## 8. Cuenta

| Ruta | Para |
|------|------|
| `/me` | Perfil, privacidad, baja de cuenta |
| `/me/seguridad` | Contraseña, sesiones, Google/Apple |
| `/me/direcciones` | Envíos y encuentros |
| `/me/notificaciones` | Avisos in-app y preferencias (p. ej. caída de precio) |
| `/me/consultas` | Consultas de lote |
| `/vendedores/{slug}` | Mini tienda pública de un vendedor |

---

## 9. Confianza

- **Reportar** una publicación si parece falsa o engañosa. No la oculta al instante.
- **Reclamo** sobre una orden pagada, con evidencia, en `/me/disputas`.
- **Compra Protegida** son reglas internas de soporte y disputas. No es seguro, escrow ni “Mercado Pago retiene tu dinero”.

Legal: `/terminos`, `/privacidad`, `/marketplace`, `/refunds`.

---

## 10. Recorrido rápido MyL (demo local)

1. `/mitos-y-leyendas` → elige época e edición (p. ej. Helénica).
2. Abre una carta con arte.
3. Baja a ofertas o entra a `/vendedores/mitos-store`.
4. **+ / −** sobre la imagen → agregar al carrito.
5. `/carrito` → consultar o ir a pagar (pago de prueba).

Cuentas sintéticas de seed (solo local/beta): ver [TESTER-GUIDE](TESTER-GUIDE.md).

---

## 11. Si algo falla

1. `/ayuda` — FAQ y formulario de feedback (sin contraseñas ni datos de pago).
2. Correo de contacto en esa misma página.
3. Testers: un issue con URL, pasos, cuenta y captura, según [TESTER-GUIDE](TESTER-GUIDE.md).
