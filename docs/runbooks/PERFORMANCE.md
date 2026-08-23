# Performance (B3)

Load HTTP contra la API. Datos sintéticos. **No** apunta a producción. **No** habilita `ENABLE_REAL_PAYMENTS`. Checkout queda **apagado** salvo `LOAD_CHECKOUT=1`.

## Cómo correr

API arriba (`pnpm dev` o staging). Seed beta si hace falta (`pnpm beta:seed`).

```text
pnpm test:load
```

Escribe `load-report.json` (gitignored) y p95/p50 por escenario.

Staging (operador):

```text
API_ORIGIN=https://api.staging.example.test \
LOAD_SCENARIO=staging \
LOAD_SECONDS=30 \
pnpm test:load
```

Credenciales: `LOAD_EMAIL` / `LOAD_PASSWORD` (buyer) y `LOAD_ADMIN_EMAIL` / `LOAD_ADMIN_PASSWORD`. Default: cuentas `*.beta@example.test`.

## Escenarios (auditoría B0)

| Endpoint | Smoke | Staging |
|----------|-------|---------|
| `GET /v1/search/cards` | 2 rps | 50 rps — **SearchController es 60 req/min/IP**; 50 rps requiere subir el throttle en la ventana |
| `GET /v1/cards/:id` + `GET /v1/variants/:id` | 2 rps | 20 rps |
| `GET /v1/me/collection/items?sort=estimatedValue` + summary | 2 rps | 2 rps |
| `GET /v1/variants/:id/prices?range=1a` | 2 rps | 2 rps |
| `GET /v1/me/wishlist` | 2 rps | 2 rps |
| `GET /v1/admin/dashboard` | 1 rps | 5 rps |
| `POST /v1/checkout` | off | solo `LOAD_CHECKOUT=1` (reserva stock) |

Jobs `card-prices` y `wishlist-scan`: medir en serie en staging con catálogo >5k variantes (`pnpm --filter @tcg/api prices:capture`; el scan corre in-process si `JOBS_ENABLED`).

## SLA

[01-REQUIREMENTS.md](../01-REQUIREMENTS.md): búsqueda p95 < 300 ms. El smoke local **no** falla por ese umbral (ruido de laptop/CI); sí falla si p95 search > 2 s. El informe de staging es la evidencia del SLA.

Checkout concurrente qty=1 ya está cubierto por `checkout-concurrency.integration.spec.ts`.
