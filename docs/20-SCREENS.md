# 20 — Inventario de pantallas

Cada pantalla lista: fase, ruta, datos (API), acciones, vacío, error. Si la API de esa fase no existe, la pantalla **no se construye**.

---

## Web

### Públicas

| Fase | Ruta | API | Acciones |
|------|------|-----|----------|
| 1 | `/` | games; search suggest opcional | ir a juego, buscar |
| 1 | `/ingresar` | login, OAuth | |
| 1 | `/registro` | register | |
| 1 | `/verificar-email` | verify | |
| 1 | `/recuperar-password` | forgot/reset | |
| 2 | `/{game}` | game + sets | |
| 2 | `/{game}/cartas` | cards paginadas del game | filtros set/rareza |
| 2 | `/{game}/{set}` | set + cards | |
| 2 | `/{game}/{set}/{card}` | card + variants | selector variante, favorito |
| 3 | `/buscar` | search | query, filtros |
| 4 | ficha + bloque vendedores | listings by variant | add cart |
| 4 | `/listings/{id}` | listing | |
| 4 | `/vendedores/{slug}` | user public + listings | |
| 4 | `/vender` wizard | search cards, suggestion, POST listing | 6 pasos |
| 5 | `/carrito` | cart | qty, quitar |
| 6 | `/checkout` | checkout | address, shipping, pagar |
| 6 | `/me/compras` | orders as=buyer | |
| 6 | `/me/compras/{id}` | order | confirmar, disputa |
| 6 | `/me/ventas` | orders as=seller | |
| 6 | `/me/ventas/{id}` | order | preparar, despachar |
| 4 | `/me/publicaciones` | listings mine | pausar, editar |
| 1 | `/me` | me | |
| 2 | `/me/favoritos` | favorites | |
| 1 | `/me/sesiones` | sessions | |
| 4 | `/me/direcciones` | addresses | |
| 4 | `/me/vendedor` | seller onboarding | |
| 7 | `/checkout/retorno` | no confiar en query MP | “estamos confirmando el pago” + poll order |
| 12 | `/me/coleccion` | collections | |
| 13 | ficha + gráfico | prices range | |
| 14 | `/me/wishlist` | wishlist | |
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

1. Arte / placeholder, nombre, set, número, rareza
2. Chips de variante (idioma, finish)
3. Mercado: market, min, avg, #listings (0 en MVP 1)
4. Acciones: Favorito, (Fase 4) Vender esta, (12) Colección, (14) Wishlist
5. Vendedores (Fase 4): tabla condición, vendedor, ★, precio, [Agregar]
6. Gráfico (Fase 13)

### Estados vacíos / error

- Búsqueda 0 resultados: CTA reportar carta.
- Carrito vacío: ir a buscar.
- Order 404: no filtrar si es IDOR (403 vs 404 consistente: **404** para recursos ajenos).
- MP rechazo: mensaje en checkout, stock ya liberado si webhook cancelled.

---

## Mobile (Fase 11, mismos flujos)

| Tab | Pantallas |
|-----|-----------|
| Inicio | juegos, tendencias, búsqueda compacta |
| Buscar | search + ficha |
| Escanear | placeholder hasta 17; o cámara para foto de listing |
| Lista | favoritos; luego wishlist/colección en segmentos |
| Perfil | cuenta, ventas, compras, publicaciones, salir |

Stack extra: login modal, wizard vender, cart, WebView MP, notificaciones in-app.

Rutas Expo Router alineadas en intención, no hace falta clonar slugs SEO.

---

## Admin (Fase 10)

| Ruta admin | |
|-----------|--|
| `/` | dashboard KPIs |
| `/users` `/users/:id` | |
| `/listings` | |
| `/orders` `/orders/:id` | |
| `/payments` `/payouts` | |
| `/reports` `/disputes` | |
| `/catalog/games|sets|cards` | |
| `/catalog/imports` | disparar job |
| `/config` | comisión, timeouts, shipping rates |
| `/audit` | |

---

## Copy UI (es-CL)

- Botones: “Ingresar”, “Crear cuenta”, “Vender”, “Agregar al carrito”, “Pagar”, “Confirmar recepción”, “Abrir reclamo”
- Condiciones: mostrar código + nombre (`NM · Near Mint`)
- Nunca “Add to cart” en UI. Código interno sí en inglés.
