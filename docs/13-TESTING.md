# 13 — Testing

## Pirámide

| Capa | Dónde | Qué |
|------|-------|-----|
| Unit | `apps/api` services | stock, comisión, transiciones de orden, price suggestion |
| Integration | API + Postgres testcontainer | auth, listings, checkout |
| E2E web | Playwright | registro, buscar carta, (más tarde) comprar sandbox |
| E2E mobile | Maestro o Detox **después** de Fase 11; no bloquear MVP API |
| Contract | `packages/validation` | schemas usados por web y api |

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
