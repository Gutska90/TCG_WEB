# 17 — Colección, precios y wishlist

Estas tres piezas son la **retención**. Colección (12), historial de precios (13) y wishlist (14) están implementadas. Scanner (15) no. Implementarlas no debe exigir rediseñar `CardVariant`. Ver [COLLECTIONS.md](COLLECTIONS.md).

## Distinción

| Concepto | Fase | Significado |
|----------|------|-------------|
| Favorito | 2 | Bookmark de variante. Sin precio. |
| Colección | 12 | Cartas que **tengo**. Qty, condición, costo. |
| Wishlist | 14 | Cartas que **quiero**. Precio objetivo + alerta. |
| Historial | 13 | Serie de `CardPrice` por variante. |

Nunca mezclar las tres tablas en una sola “lista del usuario”.

---

## Colección personal (Fase 12)

### UX

```text
MI COLECCIÓN
Valor estimado    $1.284.550 CLP
                  ▲ +4.7% últimos 30 días

Pokémon      $730.000
One Piece    $320.000
Magic        $180.000
Yu-Gi-Oh      $54.550   // 0 si el TCG no está activo aún
```

Ítem:

```text
Charizard ex
x1 · NM · EN · Holofoil

Valor compra:   $15.000
Valor actual:   $21.000
                +40%
```

### Valoración (MVP Fase 12)

Live: mediana de listings ACTIVE comparable (variante+condición, fallback variante). `null` → “Sin precio suficiente”. Variación 30 días usa `CollectionValueSnapshot` (Fase 13).

### API

Implementada (ítems en `/v1/me/collection/items`, no anidados al id). Ver [04-API](04-API.md) y [COLLECTIONS.md](COLLECTIONS.md).

Al completar una orden, CTA “Añadir a colección” (prefill `purchasePriceClp = unitPriceClp`). Si el listing tenía `sourceCollectionItemId`, se descuenta el lote al `COMPLETED` (idempotente).

### Completar set (MVP ligero)

Cruce colección vs cartas del set vs listings ACTIVE. CTA **Ver disponibles**. Sin “Comprar faltantes” optimizado (Fase 20).

### Reglas

- Un usuario tiene colección `Default` creada en el primer GET.
- `quantity >= 1`.
- Condición opcional pero recomendada.
- No usa stock de listings.

### Completar set (misma fase)

Sobre un `Set`, cruzar colección del usuario vs cartas del set vs listings ACTIVE:

```text
Pokémon 151
142 / 207  (68.6%)
Faltan 65 · Duplicadas 23
Valor estimado $487.900

Comprar faltantes: $… · N vendedores · envío estimado
```

El CTA **Comprar faltantes** (carrito optimizado) es Fase 20. En 12 solo se listan faltantes y publicaciones.

Vender desde colección: CTA que abre el wizard de listing con `variantId` y condición prellenados.

---

## Historial de precios (Fase 13)

### UX ficha

```text
Precio actual    $17.990

Precio  (CLP)
20k ┤                 ╭───
18k ┤        ╭────────╯
16k ┤ ───────╯
14k ┤
    └──────────────────
     1m   3m   6m   1a

Mínimo    Promedio    Máximo    Volumen vendido
```

Rangos: 1m, 3m, 6m, 1a. Default 3m.

### Cómo se genera `CardPrice`

Job (diario o cada 6 h) por variante con actividad:

| source | definición |
|--------|------------|
| `LISTING_MIN` | min `priceClp` de listings ACTIVE de esa variante |
| `LISTING_AVG` | promedio ponderado por cantidad de listings ACTIVE |
| `SALE` | mediana (o promedio) de `OrderItem.unitPriceClp` COMPLETED en la ventana |

MVP de historial: al menos `LISTING_MIN` + `LISTING_AVG` diarios. El dato que hay que privilegiar en ficha es **`SALE`** (órdenes `COMPLETED`), no el promedio de publicaciones que nadie pagó.

Mostrar por separado, cuando haya datos:

```text
Última venta        $28.500
Promedio 30 días    $27.900
Mediana 30 días     $27.500
Menor listing       $30.000
Confianza           Alta | Media | Baja  (según N ventas)
```

Índice interno **TCG Market Price** (Fase 13+): ventas recientes, condición, idioma, variante, outliers fuera, volumen. Nunca copiar series de TCGPlayer/Cardmarket/TCGMatch. Import externo, si existe: `source = IMPORT` + atribución, no como “precio Chile”.

### API (implementada)

```
GET /v1/variants/:id/prices?range=3m
→ { currency: "CLP", current, min, avg, max, volumeSold, lastSaleClp, avg30dClp, median30dClp, minListingClp, confidence, points: [{ t, min, avg, sale }], disclaimer }
```

Flag `ENABLE_PRICES`. Job `card-prices` (6 h) y `pnpm --filter @tcg/api prices:capture`. Un punto por `(variantId, source, capturedOn)`. `SALE` = mediana de `OrderItem.unitPriceClp` de órdenes `COMPLETED` ese día UTC.

### Precio sugerido al vender

Si hay `LISTING_AVG` de 7 días, sustituye `market` en la fórmula de [06-MARKETPLACE](06-MARKETPLACE.md). Si no, listings activos ahora.

---

## Wishlist (Fase 14)

```text
WISHLIST
Charizard ex
Precio objetivo:  $15.000
Precio actual:    $17.500     (min listing ACTIVE)
```

Notificación:

> Charizard ex apareció por $14.990.

### Reglas

- Un `WishlistItem` por `(userId, variantId)`.
- `targetPriceClp > 0`.
- Job: si `min(active listings) <= targetPriceClp` y no se notificó para ese `listingId`, emitir `WISHLIST_HIT`.
- Deduplicar: no spamear el mismo listing. Si baja más, notificar de nuevo.
- Preferencias: in-app siempre; email/push según [18-NOTIFICATIONS](18-NOTIFICATIONS.md).

### API (implementada)

| Método | Path |
|--------|------|
| GET | `/v1/me/wishlist` |
| PUT | `/v1/me/wishlist/:variantId` | `{ targetPriceClp, notifyBelow? }` |
| DELETE | `/v1/me/wishlist/:variantId` |

Flag `ENABLE_WISHLIST`. Job `wishlist-scan` y ping al crear/editar/activar listing. Preferencias: `GET/PATCH /v1/me/notification-preferences` (`PRICE_DROP` opt-in).
