# 13 — Testing

## Pirámide

| Capa | Dónde | Qué |
|------|-------|-----|
| Unit | `apps/api` services | stock, comisión, transiciones de orden, price suggestion |
| Integration | `apps/api/test/integration` + Postgres real (`DATABASE_URL`) | checkout concurrency, webhook idempotencia, reservas |
| E2E web | Playwright | registro, buscar carta, (más tarde) comprar sandbox |
| E2E mobile | Maestro o Detox **después** de Fase 11; no bloquear MVP API |
| Contract | `packages/validation` | schemas usados por web y api |

Los tests de dinero **P0-1/P0-2/P0-3** no se cubren solo con Prisma mockeado: las carreras necesitan locks reales; el refund necesita Postgres + `PaymentProvider` falso (HTTP mockeado).

Casos de integración obligatorios (Fase 9.5A):

1. `approved` normal → `HELD` / `PAID`
2. `approved` duplicado (idempotente, un solo `AuditLog`)
3. expiración normal (libera reserva)
4–5. expiración y `approved` concurrentes (una sola transición válida)
6. `approved` tras `expiresAt` (PENDING aún válido vs. ya `EXPIRED` → late payment + refund MP)
7. dos buyers / `quantity = 1`
8–9. `quantity >= 0` y `quantityReserved <= quantity`
10. retry de webhook sin `AuditLog` duplicado
11. refund exitoso (cancel PAID)
12. refund duplicado (un solo llamado al proveedor)
13. retry tras timeout/error del proveedor
14. timeout / HTTP error: `Refund FAILED`, Order no `REFUNDED`
15. late payment ejecuta refund real
16. `amountClp` del cliente se ignora
17. webhook `refunded` duplicado tras refund
18. fixtures de respuesta MP (`approved`, already refunded, 404, timeout)
19. webhook sin firma con MP habilitado → 401; mock → 403
20. JWT placeholder / vacío aborta boot (excepto `NODE_ENV=test`)

Correr: `pnpm test` (carga `.env` / `DATABASE_URL`). Postgres debe estar arriba.

## Reglas

- Cada feature de API incluye tests del caso feliz + 1 IDOR o 1 validación.
- Transiciones de `OrderStatus` inválidas deben fallar con test.
- Webhooks MP: fixtures de payloads, prueba de idempotencia.
- No exigir 100% coverage. Exigir tests en dinero, stock y auth.

## Datos de test

- Seed mínimo: 1 game, 1 set, 3 cards, 2 users (buyer/seller).
- Nunca apuntar tests a producción.

## CI

PR: lint + typecheck + unit/integration api + build web. E2E nightly o en main.
