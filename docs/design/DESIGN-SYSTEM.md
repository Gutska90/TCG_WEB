# Design system — UI.1 Visual Refresh

Tokens y reglas visuales del marketplace. No cambia contratos de API, Prisma ni dinero.

## Identidad

Premium, tecnológica, coleccionable, confiable. El arte de la carta aporta el color; la UI es superficie oscura/clara con acento violeta. Evitar neón, glassmorphism excesivo y gradientes en cada bloque.

Marca visible: **TCG MARKET** / Chile. Nombre interno `tcg-platform` sin cambios. Beta = badge pequeño.

Marca gráfica: `BrandMark` (`apps/web/components/brand-mark.tsx`) — carta estilizada violeta `#7C3AED` + acento cian. Favicon: `apps/web/app/icon.svg` (mismo motivo). Tipografía web: Geist Sans; cifras con `tabular-nums`. No copiar identidad de TCGMatch.

## Color

CSS variables (`packages/ui/src/tokens.css`). Tailwind consume `--color-*`.

| Token | Light | Dark |
|-------|-------|------|
| background | `#F8FAFC` | `#0B1020` |
| surface | `#FFFFFF` | `#121A2B` |
| surface-elevated | `#F1F5F9` | `#182236` |
| border | `#E2E8F0` | `#263246` |
| text | `#0F172A` | `#F8FAFC` |
| text-muted | `#64748B` | `#94A3B8` |
| primary | `#7C3AED` | `#7C3AED` |
| primary-hover | `#8B5CF6` | `#8B5CF6` |
| accent | `#22D3EE` | `#22D3EE` |
| success | `#22C55E` | |
| warning | `#F59E0B` | |
| danger | `#EF4444` | |

Acentos de juego (solo badge/borde fino): Pokémon amarillo, Magic naranja, One Piece rojo, Yu-Gi-Oh violeta, Mitos y Leyendas cobre.

## Tema

Web: Light / Dark / System. `localStorage` clave `tcg.theme` + `prefers-color-scheme`. Script anti-flash en `<head>`.

Mobile: `Appearance` + `SecureStore` misma clave. Selector en Perfil. No requiere autenticación.

## Tipografía

Web: Geist Sans. Geist Mono opcional para cifras (`tabular-nums`).

- Hero: 40–56 desktop / ~32 mobile
- H1: 32–40
- H2: 24–30
- Body: 15–16
- Small: 13–14

Preferir `font-medium` / semibold. No abusar de bold.

## Radius / sombra / motion

- Cards: 16px
- Inputs/botones: 12px
- Sombra: `--shadow` suave
- Hover desktop: `translateY(-2px)`, 160ms
- Respetar `prefers-reduced-motion`

## Componentes (web)

`apps/web/components/ui/`: Button (primary/secondary/ghost/danger), IconButton, Input/Select/SearchInput, Card, ProductCard, Badge/StatusBadge, Price, Sheet, EmptyState, Skeleton, Alert, StatCard, ProgressBar.

Primary: fondo primary, texto blanco, hover primary-hover, focus ring accent.

Inputs: surface, borde, focus ring primary.

Status: ACTIVE/COMPLETED emerald; PAUSED neutral; PENDING amber; FAILED red; DISPUTED orange/red. Siempre con texto.

Imágenes de carta: `object-contain`, ratio 63/88, placeholder si falta.

## Layout marketplace

- Header: logo TCG MARKET + Beta, buscador, wishlist, carrito+badge, cuenta (dropdown). Subnav de juegos + CTA Vender.
- Home: hero, juegos, publicaciones existentes (`GET /v1/listings` sin inventar sort “reciente”), CTAs colección/wishlist.
- Buscar: filtros sidebar desktop; sheet en mobile.
- Ficha: imagen | datos y precios; historial; publicaciones (tabla desktop / cards mobile).
- Carrito: grupos por seller; resumen sticky desktop; barra total mobile.
- Checkout: datos | resumen sticky; badge SANDBOX/BETA si sandbox.
- `/me`: sidebar Perfil / Colección / Wishlist / Compras / Ventas / Publicaciones / Seguridad.
- Admin: mismos tokens, densidad operacional. Sin chrome de marketplace.

## Responsive

Prioridad 375 / 390 / 768 / 1024 / 1440. Sin scroll horizontal. Touch ~44px. Skip link, `:focus-visible`, labels, alt.

## Iconos

Web: Lucide. Mobile: Ionicons (`@expo/vector-icons`, un solo pack). Carrito en header con `accessibilityLabel="Carrito"`.
