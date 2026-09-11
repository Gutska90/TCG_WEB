# 09 — Web / PWA

## Rol

Cliente público principal para SEO y compra. Next.js App Router. Consume **solo** `/v1`.

PWA (installable, offline catálogo limitado) **después** de MVP 2, no en Fase 1.

## SEO (crítico)

Rutas canónicas con slugs, no solo UUID:

```text
/{game}                                  /pokemon
/{game}/cartas                           /pokemon/cartas
/{game}/{set}                            /pokemon/151
/{game}/{set}/{card}                     /pokemon/151/mega-charizard-x-ex
/cartas/{cardId}                         redirect a canónica
/vendedores/{userSlug}
/listings/{id}
```

Metadata: title, description, OG image (arte de carta si hay licencia de uso; si no, card frame propio). `sitemap.xml` + `robots.txt`.

No indexar `/checkout`, `/me/*`, `/admin` (admin es otra app).

## Layout global

```text
Header: Logo | Search (typeahead) | Juegos | ❤️ wishlist | 🛒 | 👤 | tema (sol/luna)
Footer: legal, juegos, ayuda
```

\* En MVP 1–2, ítems futuros pueden ocultarse o ser “Próximamente” sin rutas dummy que parezcan producto.

MVP 1 nav: Logo, Buscar, Juegos, Wishlist, Login.

Home: búsqueda, juegos con marca de color, publicaciones con “Ver todas” a `/buscar?hasListings=true`. El submit del hero y el typeahead del header/menú envían `hasListings=true` (comprar). Hubs `/{game}` y `/{game}/{set}` siguen en catálogo salvo que el usuario pulse **En venta**.

`/buscar` y hubs de catálogo: interruptor **Catálogo / En venta** (`hasListings`). Autocompletar reusa `GET /v1/search/cards`; el clic en una sugerencia abre la ficha (no se cierra el listado por blur). MyL `/{game}` agrupa ediciones por época (PE / PB / Imperio).

## Pantallas MVP 1

| Ruta | Contenido |
|------|-----------|
| `/` | Hero búsqueda, juegos, tendencias (si hay datos) |
| `/ingresar` `/registro` | Auth |
| `/verificar-email` | |
| `/recuperar-password` | |
| `/{game}` | Sets |
| `/{game}/cartas` | Grid + filtros del juego |
| `/{game}/{set}` | Grid + filtros (set fijado) |
| `/{game}/{set}/{card}` | Ficha (sin vendedores aún) |
| `/buscar?q=` | Resultados + filtros |
| `/me` | Perfil |
| `/me/favoritos` | |

## Pantallas MVP 2–3

| Ruta | Contenido |
|------|-----------|
| `/vender` | Wizard publicación + enlace a solicitar carta |
| `/vender/solicitar-carta` | CatalogSubmission (no crea Card) |
| `/me/solicitudes-catalogo` | Lista de solicitudes propias |
| `/me/solicitudes-catalogo/{id}` | Detalle; completar `NEEDS_INFO` |
| `/me/publicaciones` | CRUD listings |
| `/vendedores/{slug}` | Mini tienda: tabs productos/valoraciones/información, filtros, contacto opcional |
| `/carrito` | Multi-seller; qty +/− sobre la imagen; consultar lote (CONTACT.2 + WhatsApp opt-in), sin reservar stock |
| `/checkout` | Direcciones, envío, MP |
| `/me/compras` `/me/compras/{id}` | |
| `/me/ventas` `/me/ventas/{id}` | |
| `/me/consultas` `/me/consultas/{id}` | consultas de lote (comprador y vendedor) |
| `/me/direcciones` | |

## UX de ficha de carta

- Imagen grande a la izquierda (`Card.imageUrl` oficial cuando existe).
- A la derecha: nombre, edición, número, rareza, tipo, raza, coste, fuerza, ilustrador, palabras clave.
- MyL: bloques **Habilidad** (`attributes.rulesText`) e **Historia** (`flavorText`). Si TOR no publica historia, leyenda “No existe texto histórico oficial registrado para esta impresión.”
- Enlace a la ficha TOR cuando hay `sourceUrl`.
- Selector de variante (idioma / acabado). Las ofertas de la ficha filtran por esa `variantId`; no hay filtros extra de idioma/acabado que puedan contradecirla.
- Bloque de precios (mercado / menor listing) **antes** de lore.
- Acciones (colección, wishlist, vender) y ofertas a continuación. Si no hay listings: CTA wishlist + vender.
- Lista de listings con condición en es-CL, vendedor, reputación, precio, cantidad con **+/− sobre la imagen**, CTA al carrito y consulta WhatsApp opcional.
- Fotos del listing etiquetadas “Foto de la publicación”; el arte de ficha es “Arte oficial del catálogo”.

## Estado cliente

- TanStack Query para server state.
- Carrito: si hay sesión, API; guest cookie `cart` alineada con `Cart.guestToken` (merge al login).
- Zustand solo para UI (modales, wizard step).

## Design system

Tailwind + componentes en `apps/web/components/ui`. Tokens: [design/DESIGN-SYSTEM.md](design/DESIGN-SYSTEM.md). No shadcn. Condiciones con badge. Precios CLP enteros.

## Accesibilidad

Formularios con labels, foco visible, contraste AA, no icon-only sin aria.

## Qué no va en Next

- Prisma.
- Secretos MP.
- Cálculo de comisión (solo mostrar totales que devolvió la API).
