# 16 — Flujos

## Comprador

```text
Explorar / buscar
  → Ficha de carta → elegir variante y listing
  → Carrito (varios vendedores)
  → Checkout: dirección + método de envío por vendedor
  → Pago Mercado Pago
  → Orden PAID
  → Esperar despacho o encuentro
  → Confirmar recepción
  → Valorar vendedor
```

Excepciones: cancelar antes de envío; abrir disputa después de pago; timeout 7 días auto-confirma.

## Vendedor (persona)

```text
Onboarding SELLER (dirección, teléfono, términos)
  → Vender: buscar carta → variante → condición → qty → precio → fotos
  → Publicación ACTIVE
  → Notificación de venta
  → PREPARING → SHIPPED o READY_FOR_MEETUP
  → Esperar confirmación
  → Payout (HELD → RELEASED → lote Admin; la plata sale en Payout PAID)
```

`confirm()` del comprador deja la orden `COMPLETED` y el pago `RELEASED` y asienta `SELLER_PAYABLE` + `PLATFORM_FEE` en el mismo commit. El admin liquida a mano (`POST /v1/admin/payouts` → approve → mark-processing → mark-paid con `providerRef`). Detalle: [FINANCIAL-LEDGER](FINANCIAL-LEDGER.md). No hay transferencia bancaria/MP en 10C.

No puede publicar singles que no existan en catálogo. Si falta la carta: reportar “carta no encontrada” (admin/importer), no título libre.

## Tienda (Fase 15)

```text
Crear Store + miembro OWNER (rol STORE)
  → Branding, dirección de retiro
  → Publicar (storeId en listing) o CSV
  → Pedidos en dashboard tienda
  → STORE_PICKUP
```

Hasta Fase 15, una tienda real puede operar como `SELLER` persona.

## Colección (Fase 12)

```text
Buscar / escanear (17) / desde compra
  → Agregar a colección (variante, qty, condición, costo)
  → Valor estimado = qty × precio mercado variante
  → Desglose por TCG y variación 30 días
```

Una compra completada puede ofrecer “añadir a colección” con costo = precio pagado.

## Wishlist (Fase 14)

```text
Ficha → Wishlist + precio objetivo
  → Job: si min listing ≤ objetivo → notificación in-app + email + push
```

No es lo mismo que Favoritos (MVP 1): favorito no tiene precio objetivo.

## Búsqueda (Fase 3)

- Campos: nombre (acentos-insensitive), número, set, game.
- Filtros: rareza, idioma, finish, precio min/max (cuando hay listings).
- Orden: relevancia, novedad del set, precio (min listing ACTIVE).
- MVP: PostgreSQL `pg_trgm` + unaccent. Índice GIN.
- No Elasticsearch en MVP.
