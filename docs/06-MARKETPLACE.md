# 06 — Marketplace

## Catálogo

El corazón del producto. Una publicación de single **siempre** apunta a `CardVariant`. No se permite “título libre” para singles: se busca en catálogo y se elige la variante (idioma + finish).

Ficha pública (web y app):

```text
Charizard ex
Pokémon · Scarlet & Violet 151 · 006/165
Rareza: Double Rare
Idioma / finish: selector de variante

Precio mercado    Precio mínimo    Precio promedio    Publicaciones
$14.990           $12.500          $15.320            34

VENDEDORES
JuanCards    NM    $12.500
PokeStore    NM    $13.000
PedroTCG     LP    $11.500
```

Orden default de vendedores: precio ascendente, luego reputación, luego envío a la comuna del comprador si hay sesión.

## Condición (normalizada, no editable por listing)

| Código | Nombre | Uso |
|--------|--------|-----|
| NM | Near Mint | Casi perfecta |
| LP | Lightly Played | Uso leve |
| MP | Moderately Played | Uso visible |
| HP | Heavily Played | Desgaste fuerte |
| DMG | Damaged | Daño (doblez, white core, etc.) |

Graded: `graded=true` + `grader` + `grade`. La condición física del slab puede ser NM. Fotos obligatorias si graded o HP/DMG.

Finish e idioma viven en la **variante**, no se re-tipean al publicar salvo que el catálogo tenga esa variante.

## Publicar

```text
VENDER
  Buscar carta → Seleccionar variante
    → Condición → Cantidad → Precio
    → Fotos (mín. 1, máx. 8)
    → Meetup / envío
    → Publicar
```

UI debe mostrar:

```text
Precio mercado:     $18.900
Menor publicación:  $17.500
Precio sugerido:    $17.990
```

Sugerido (MVP): `min(market, minListing)` redondeado a 10 pesos, no por debajo de minListing * 0.95 si hay ≥3 listings. Ajustable en config admin. Documentar la fórmula en código, no magic numbers sueltos.

## Stock

- `quantity` disponible total.
- `quantityReserved` en checkouts no pagados / órdenes pagadas no enviadas según política:
  - Al agregar al carrito: **no** reservar (evita abandono bloqueando stock).
  - Al `POST /checkout`: reservar.
  - Preferencia MP expira (p. ej. 30 min) → liberar si no hay pago **y** el checkout sigue `PENDING_PAYMENT` bajo lock.
  - Si llega `approved` **antes** de que la expiración commitee: se cobra y se consume la reserva (la unidad sigue siendo de ese comprador).
  - Si llega `approved` **después** de `EXPIRED`: no se revive; ver [07-PAYMENTS](07-PAYMENTS.md) (pago tardío).
  - Pago aprobado: reserva se convierte en descuento de `quantity` al completar o al pagar (decisión: **descontar quantity al PAID**, reserved se limpia).

## Carrito multi-vendedor

```text
CARRITO
JuanCards
  Charizard  $12.000
  Pikachu     $3.000
PokeStore
  Mew ex      $8.000

Productos    $23.000
Envíos        $5.990
TOTAL        $28.990
```

Checkout crea **una Order por vendedor**. El comprador paga una sola preference MP cuando es posible. Si un seller no puede enviarse junto (reglas futuras), se documenta; en MVP un checkout = N órdenes = 1 pago.

## Estados de orden

```text
PENDING_PAYMENT → PAID → PREPARING → SHIPPED → DELIVERED → CONFIRMED → COMPLETED
                      ↘ READY_FOR_MEETUP ↗
         ↘ CANCELLED
PAID/SHIPPED/DELIVERED → DISPUTED → (COMPLETED | REFUNDED | CANCELLED)
```

Transiciones válidas solo en servicio de órdenes, con audit log.

## Perfil vendedor

```text
LuisTCG
★ 4.96 · 123 ventas · 98% a tiempo
Miembro desde 2026 · Santiago

Tabs: Productos | Valoraciones | Información
```

Tab Ventas es privado del dueño, no público.

## Reportes

Cualquier USER puede reportar listing o usuario. Moderación en admin. No auto-ocultar salvo umbral futuro.

## Accesorios y sellados

`ProductType` existe en el modelo. La UI de publicación de no-singles **no** entra en MVP 1–3. No borrar el enum.
