# 08 — Envíos

## Alcance MVP

Métodos:

| Código | Nombre | Notas |
|--------|--------|-------|
| CHILEXPRESS | Chilexpress | Cotización simple o tarifa plana por tramo |
| BLUE_EXPRESS | Blue Express | Igual |
| MEETUP | Entrega presencial | Coordinación entre usuarios |
| COORDINATED | Envío coordinado | El vendedor declara “yo lo envío” sin label de plataforma |
| STORE_PICKUP | Retiro en tienda | Fase 15; el enum puede existir antes |

No integrar 5 couriers ni API completa de tracking en MVP. Tracking puede ser **código ingresado a mano** + link al carrier.

## Cotización (MVP)

`GET /v1/shipping/quote?sellerId=&method=&comuna=`

v1.0: **tabla de tarifas** por región (config admin / seed), no llamada live a Chilexpress. Campos: origen (comuna vendedor), destino, método, `priceClp`.

Si no hay tarifa: el método no se ofrece. Meetup: $0.

Peso/volumen de cartas: asumir sobre carta estándar; un listing de N cartas usa tramo “sobre” hasta X unidades, luego “caja”. Simplificar: **tarifa plana nacional por seller en el carrito** configurable (ej. $3.990–$5.990) si la tabla regional no está lista. Preferir tabla regional mínima (RM vs regiones).

## Entrega presencial

- Comprador y vendedor eligen MEETUP.
- Orden → `READY_FOR_MEETUP` cuando el vendedor confirma lugar/hora (`meetupAt`, `meetupPlace` texto).
- Comprador confirma recepción igual que un despacho (`confirm`).
- No hay geolocalización obligatoria.

## Flujo despacho

```text
PAID → PREPARING → SHIPPED (trackingCode?) → DELIVERED → CONFIRMED
```

`DELIVERED` puede marcarse:

- por el vendedor (honor system) en MVP;
- después, por webhook del courier.

El comprador siempre debe poder confirmar o abrir disputa.

## Direcciones

Solo Chile. `region` + `comuna` como strings normalizados (catálogo de comunas en `packages/config` o tabla `ChileComuna`). No Google Places obligatorio.

Teléfono requerido para envío.

## Futuro

- Label API Chilexpress / Blue.
- Tracking automático.
- Puntos de retiro.
- Multi-paquete.

Hasta entonces, no inventar integraciones courier en código.
