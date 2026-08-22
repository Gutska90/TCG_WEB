# Colecciones (Fase 12)

Colección personal **privada** del usuario. No es inventario de venta. Contrato: [03-DATABASE](03-DATABASE.md), [04-API](04-API.md). Flag: `ENABLE_COLLECTIONS` (default on; kill switch off).

## Qué es y qué no

| | Collection | Listing |
|--|------------|---------|
| Significado | Cartas que **tengo** | Stock **ofrecido** a la venta |
| Visibilidad | Solo el dueño | Pública si ACTIVE |
| Stock | No reserva ni descuenta carrito | `quantity` / `quantityReserved` |

Una carta puede estar en la colección **y** publicada. Favoritos (Fase 2) y wishlist (Fase 14) son tablas distintas.

## Lotes (decisión)

El usuario puede comprar 2 copias a $10.000 y 3 a $15.000. **No se promedian** esos costos.

Cada `POST /v1/me/collection/items` crea un **lote** (`CollectionItem`). No hay unique `(collectionId, variantId, condition)`: el mismo printing con distinto `purchasePriceClp` coexisten.

`purchasePriceClp` es **unitario**. Costo del lote = `quantity × purchasePriceClp`.

MVP: una colección Default por usuario (`Collection.userId` unique). `POST /v1/me/collections` es idempotente (devuelve/renombra la Default). Carpetas, share y followers quedan fuera.

## Valor estimado

Señal live de listings **ACTIVE** de esta plataforma (no terceros, no `CardPrice` histórico):

1. Mediana de listings de la misma variante **y** condición.
2. Si no hay, mediana de la variante (cualquier condición).
3. Si no hay datos: `null` → UI **“Sin precio suficiente”**.

No se trata un faltante de mercado como $0.

Copy: *Valor estimado basado en publicaciones activas, no necesariamente precio de venta.*

`CollectionValueSnapshot` (job `collection-value`, un valor por colección y día UTC) alimenta **variación 30 días** (`change30dClp`). Si no hay snapshot ~30d atrás: “Sin historial suficiente”. El estimado live de la colección sigue siendo mediana de listings ACTIVE (Fase 12); el gráfico de carta usa `CardPrice`.

## Costo y P/L

- `registeredCostClp`: suma solo de lotes con `purchasePriceClp` no nulo.
- `itemsWithoutCost`: copias sin costo (no se asume 0).
- P/L solo donde hay estimado **y** costo. Copy: *Estimación, no rentabilidad realizada.*

## Progreso de set

Denominador: **cartas** del set (`Card`), no variantes. Poseídas = `cardId` distintos en la colección. Duplicados no suman progreso.

Duplicados: carta con `sum(quantity) > 1`. Resumen: *N cartas / M copias extra*.

Faltantes: cartas del set no poseídas. CTA **Ver en marketplace** / **Ver disponibles**. No hay optimizador multivendedor (Fase 20).

## Vender desde colección

CTA **Vender** abre el wizard de listing con `variantId`, `condition`, `quantity` y opcional `collectionItemId`. **No** crea el listing solo.

`Listing.sourceCollectionItemId` queda como trazabilidad. Al `Order.COMPLETED` (confirmar recepción) se descuenta el lote de origen **una vez por orden** (`collection.sold` en `AuditLog`). Si no hay `sourceCollectionItemId`, el usuario ajusta cantidad a mano.

## Privacidad

Sin endpoints públicos. Ítem o colección ajena → **404** (no 403). El cliente nunca es autoridad de `userId`.

## Analytics

`collection_item_added|updated|removed`, `collection_sell_clicked`, `set_progress_viewed`. Nunca `purchasePrice`.
