# 23 — Backlog de producto (post-transaccional)

Visión y priorización. **No es alcance de la fase actual.** No se implementa, no se agregan tablas Prisma ni endpoints stub hasta que [15-ROADMAP](15-ROADMAP.md) nombre la fase.

La ejecución sigue:

```text
9.6 MP Marketplace → 10 Admin → 10.5 Disputas/moderación → 11 Mobile
→ 12 Colección → 13 Precios → 14 Wishlist → 15 Scanner → …
```

Cinco frentes: **confianza**, **compra**, **coleccionista**, **comunidad**, **operación**.

## Qué debe destacar el producto

No “otro marketplace TCG”. El loop que hay que proteger:

```text
SCANNER → COLECCIÓN → PRECIOS → WISHLIST → VENDER / COMPRAR
```

Las cinco funciones con más palanca (cuando toque su fase):

1. Scanner → colección (y vender desde ahí).
2. Completar set (“te faltan N; comprar faltantes”).
3. Optimizador de carrito multivendedor.
4. Wishlist con alertas inteligentes (agrupadas, no spam).
5. Precios basados en **ventas reales** + nivel de confianza.

## Prioridad vs orden de código

La prioridad de producto **no adelanta** 9.6–10.5. Si más adelante se quiere subir el optimizador de carrito (hoy Fase 20), se documenta en el roadmap **antes** de ejecutarlo.

| Prioridad | Función | Fase de código |
|-----------|---------|----------------|
| Muy alta | Disputas + reportes + evidencia | 10.5 |
| Muy alta | Colección valorizada + Completar set | 12 |
| Muy alta | Wishlist + alertas | 14 |
| Muy alta | Precios por ventas + confianza | 13 |
| Muy alta | Optimizador de carrito | 20 (candidato a subir después de 14) |
| Alta | Ofertas (`Offer`) | post-14; no antes de 10.5 |
| Alta | Scanner (lote + modos) | 15 |
| Alta | Vender desde colección | 12 |
| Alta | Dashboard vendedor | 10 (ops) + web vendedor en paralelo a listings |
| Media | Intercambios / Tengo–Quiero | 18 |
| Media | Seguidores + feed + trending | post-18 |
| Media | Deck builder | 19 |
| Media | Tiendas | 16 |
| Futura | Torneos, mapa, API B2B, trade matching | después de 17–18 |

---

## 1. Confianza y seguridad

Objetivo: bajar el miedo a comprar cartas caras. Encaja sobre todo en **10.5** y endurece Admin (**10**).

| Idea | Notas | Fase |
|------|--------|------|
| Niveles de vendedor + badge verificado | Bronce→Elite por ventas/reclamos/despacho; no pay-to-win | 10.5+ reputación |
| Fotos obligatorias sobre umbral CLP | Ya hay fotos en listing; umbral + graded | 10.5 / listings |
| `ListingRevision` | precio, condición, qty, texto anteriores; útil en disputas | 10.5 |
| Reportes: fake, stock falso, fotos engañosas | Motivos tipados | 10.5 |
| Disputas con evidencia | Fotos, no solo `Order.status = DISPUTED` | 10.5 |
| Score de riesgo usuario/listing | Interno, no público al inicio | 10 / 10.5 |
| Límites de venta en cuentas nuevas | Caps CLP / qty | 10.5 |
| Bloqueo automático por patrón | Conservador; audit | 10.5 |
| Blacklist de hashes de imagen | Estafas con fotos reutilizadas | post-10.5 |
| Trazabilidad de orden | Ya hay `AuditLog`; UI admin | 10 |
| **Compra Protegida** | Badge si cumple criterios (fotos, reputación, umbral, no cuenta nueva, etc.) | 10.5; copy en ficha |

No fingir escrow de Mercado Pago. Compra Protegida es **criterio de la plataforma**, no “MP está reteniendo” salvo que 9.6 lo defina así.

---

## 2. Experiencia de compra

| Idea | Fase |
|------|------|
| Comparar N publicaciones de la misma carta | 4+ (ficha); no es fase nueva |
| Ordenar por precio **final con envío** | 8 + ficha/carrito |
| Comprar todo de este vendedor | 5–6 |
| Filtros condición, idioma, foil, región, reputación | 3–4 |
| Seguimiento visual + ETA | 8 + notificaciones |
| Alertas caída de precio / vuelve a stock | 14 |
| Compra rápida desde wishlist | 14 |
| **Optimizador:** menor precio total / menos vendedores / más rápido | 20 |
| Ofertas: aceptar / rechazar / contraofertar | post-14 |

Modelo futuro de oferta (no crear hasta la fase):

```text
Offer
  listingId, buyerId, amountClp, status, expiresAt
```

---

## 3. Herramientas de coleccionista

Núcleo de retención. Detalle de tablas reservadas en [17-COLLECTION-PRICES-WISHLIST](17-COLLECTION-PRICES-WISHLIST.md).

Colección (12): valorizada, costo, P/L, evolución, % de set, faltantes, duplicados, “tengo de más”, carpetas, CSV/PDF, link público/privado, stats por TCG.

**Completar set** (12, usa listings vigentes):

```text
Te faltan 18 cartas.
Comprar las 18: $46.800
Vendedores: 3
Envío estimado: $9.500
[Comprar faltantes]
```

Scanner (15): identificar, colección, vender, precio, lote, variante, inventario tienda.

```text
Escanear N cartas → borrador inventario → revisar → publicar
```

---

## 4. Precios (activo de la plataforma)

No usar solo listings activos como “precio mercado”. Separar siempre:

| Señal | Significado |
|-------|-------------|
| Precio publicado | listings ACTIVE |
| Precio vendido | `OrderItem` de órdenes `COMPLETED` |
| Promedio / mediana / última venta | ventana 7d / 30d / 90d / 1a |
| Volumen | cantidad de ventas, no de publicaciones |

**TCG Market Price:** índice interno (ventas recientes, condición, idioma, variante, outliers fuera, volumen). Etiquetado como nuestro, nunca copiado de TCGPlayer/Cardmarket/TCGMatch.

**Price confidence:** Alta / Media / Baja según N ventas. Si hay 2 ventas, decirlo; no fingir precisión.

Liquidez (ficha, Fase 13+): ventas 30d, tiempo medio hasta venta.

Graded (futuro, no Prisma ahora): `certNumber`, `grade`, `subgrades`, `grader` + validación de certificado cuando haya proveedor.

Sellados / accesorios: `ProductType` ya existe. UI de sellados (booster, ETB, tin, etc.) después de singles. Accesorios más abajo. Preventa tienda: `PREORDER` + `releaseDate` en Fase 16.

---

## 5. Comunidad y crecimiento

Perfil de **coleccionista** (no solo vendedor): TCG favoritos, colección pública, wishlist, trades, ventas, reputación, años, sets.

Seguidores (vendedores, tiendas, coleccionistas). Feed útil, no red social: listings nuevos, bajadas, seguidos, sets nuevos, tendencias.

Trending: más buscadas, más vendidas, mayor alza/caída, más wishlist.

Página de set rica: valor set completo, variación 30d, disponibles en marketplace, colección del usuario.

SEO: ficha indexable, OG, JSON-LD, sitemap, canonical. Share card para WhatsApp/Instagram. Links `/u/:slug/coleccion`, wishlist, store.

Búsquedas guardadas + “Busco carta” (demanda explícita a vendedores).

Notificaciones agrupadas + centro por canal (compras, ventas, precios, wishlist, cuenta, sistema). Ver [18-NOTIFICATIONS](18-NOTIFICATIONS.md).

Eventos/torneos, mapa de tiendas: futura, Chile (Santiago primero).

---

## 6. Operación interna

| Tema | Cuándo |
|------|--------|
| Dashboard vendedor (GMV, comisiones, stock, listings sin venta, precio vs mercado) | web vendedor; no esperar Fase 16 |
| Inventario tienda, CSV, SKU, barcode, `StoreMember` | 16 |
| API B2B `/inventory`, listings, stock, orders | después de 16 |
| `CatalogProvider` (Scryfall, Pokémon, One Piece) | [19-CATALOG-IMPORT](19-CATALOG-IMPORT.md); no inflar un solo service |
| Jobs (BullMQ + Redis) | cuando el volumen lo pida: import, thumbnails, mail, snapshots, wishlist, refund retry. Ya previsto en [02-ARCHITECTURE](02-ARCHITECTURE.md) |
| Observabilidad | antes de prod real: request id, errores, métricas `payment_failed`, `refund_failed`, `webhook_invalid`, `stock_conflict`, `checkout_expired` |
| Feature flags | `ENABLE_OFFERS`, `ENABLE_TRADES`, `ENABLE_SCANNER`, `ENABLE_STORES` — desplegar código sin UI |
| Soft delete | nunca borrar `Order`, `Payment`, `Refund`, `AuditLog`; listings vendidos tampoco |
| Rate limits por ruta | ya en auth; endurecer offers/reports/webhooks inválidos |
| Anti-bots | CAPTCHA / cola de compra solo si hay demand extrema |

Reputación más rica (comunicación, descripción, despacho, empaque + % a tiempo, cancelaciones, N ventas): extensión de Fase 9, no reabrirla ahora.

---

## Qué no hacer con este documento

- No crear `Offer`, `Dispute`, `ListingRevision`, `Follow`, `Trade` “por si acaso”.
- No pantallas de Completar set / scanner / feed sin API.
- No scrapear ni copiar índices de precio de terceros.
- No tratar Compra Protegida como Split de Mercado Pago.
