# 17 — Colección, precios y wishlist

Estas tres piezas son la **retención**. No entran al MVP de marketplace (fases 12–14), pero el modelo ya las contempla. Implementarlas no debe exigir rediseñar `CardVariant`.

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

### Valoración

- `currentValueClp` de un ítem = `quantity × marketPrice(variantId)`.
- `marketPrice` = último `CardPrice` con `source = LISTING_AVG` o fallback `LISTING_MIN`; si no hay, `null` (mostrar “Sin precio”).
- Valor de la colección = suma de ítems con precio no nulo. Mostrar cuántos ítems quedan fuera.
- Variación 30 días = comparar snapshot de valor hace 30 días vs hoy (tabla `CollectionValueSnapshot` diaria, job nocturno).

Agregar en Fase 12:

```text
CollectionValueSnapshot
  collectionId, capturedOn date, valueClp, breakdown Json
  unique(collectionId, capturedOn)
```

### API (reservada)

| Método | Path |
|--------|------|
| GET | `/v1/me/collections` |
| GET | `/v1/me/collections/:id` |
| POST | `/v1/me/collections/:id/items` |
| PATCH | `/v1/me/collections/:id/items/:itemId` |
| DELETE | `/v1/me/collections/:id/items/:itemId` |
| GET | `/v1/me/collections/:id/summary` |

Al completar una orden, CTA “Añadir a colección” prellena `purchasePriceClp = unitPriceClp`.

### Reglas

- Un usuario tiene colección `Default` creada en el primer GET.
- `quantity >= 1`.
- Condición opcional pero recomendada.
- No usa stock de listings.

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

MVP de historial: al menos `LISTING_MIN` + `LISTING_AVG` diarios. `SALE` cuando haya volumen.

No copiar series de TCGPlayer/Cardmarket. Si más adelante se importan precios externos, `source = IMPORT` + atribución, y **no** se muestran como “precio Chile” sin etiquetar.

### API (reservada)

```
GET /v1/variants/:id/prices?range=3m
→ { currency: "CLP", current, min, avg, max, volumeSold, points: [{ t, min, avg, sale }] }
```

La ficha de carta en MVP 2 puede mostrar min/avg **actual** (agregado live de listings) sin serie histórica. El gráfico espera Fase 13.

### Precio sugerido al vender (MVP 2, sin historial)

Si no hay serie: usar listings activos ahora. La fórmula está en [06-MARKETPLACE](06-MARKETPLACE.md). Fase 13 puede sustituir `market` por `LISTING_AVG` de 7 días.

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

### API (reservada)

| Método | Path |
|--------|------|
| GET | `/v1/me/wishlist` |
| PUT | `/v1/me/wishlist/:variantId` | `{ targetPriceClp }` |
| DELETE | `/v1/me/wishlist/:variantId` |
