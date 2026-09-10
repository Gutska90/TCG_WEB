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
Header: Logo | Search | Cartas | Sellados* | Ofertas* | Subastas* | Tiendas* | Precios* | Colecciones*
        ❤️  🛒  👤
Footer: legal, juegos, ayuda
```

\* En MVP 1–2, ítems futuros pueden ocultarse o ser “Próximamente” sin rutas dummy que parezcan producto.

MVP 1 nav: Logo, Buscar, Juegos, Favoritos, Login.

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
| `/me/publicaciones` | CRUD listings |
| `/vendedores/{slug}` | Mini tienda: tabs productos/valoraciones/información, filtros, contacto opcional |
| `/carrito` | Multi-seller |
| `/checkout` | Direcciones, envío, MP |
| `/me/compras` `/me/compras/{id}` | |
| `/me/ventas` `/me/ventas/{id}` | |
| `/me/direcciones` | |

## UX de ficha de carta

- Selector de variante (idioma / finish).
- Bloque de precios.
- Lista de listings con condición, vendedor, reputación, precio, CTA al carrito.
- Fotos del listing al expandir.

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
