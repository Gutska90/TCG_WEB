# 13 — Testing

## Pirámide

| Capa | Dónde | Qué |
|------|-------|-----|
| Unit | `apps/api` services | stock, comisión, transiciones de orden, price suggestion |
| Integration | `apps/api/test/integration` + Postgres real (`DATABASE_URL`) | checkout concurrency, webhook idempotencia, reservas |
| E2E web | `e2e/` Playwright | 11.0–14 happy paths + B4 admin (`admin-ops-path`, `admin-refund-retry`, `admin-payout-path`) |
| E2E mobile | Maestro `apps/mobile/.maestro/` (simulador + API + seed). No corre en el job `check`; `workflow_dispatch` opcional |
| Contract | `packages/validation` | schemas usados por web y api |

Los tests de dinero **P0-1/P0-2/P0-3** no se cubren solo con Prisma mockeado: las carreras necesitan locks reales; el refund necesita Postgres + `FakePaymentProvider` (nunca `MercadoPagoPaymentProvider` fingiendo `approved`).

Casos de integración obligatorios (Fase 9.5):

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
21. smoke 9.5C: qty 1 → checkout reservado → PAID → refund → stock restaurado; webhook duplicado no duplica Payment/Refund/stock/AuditLog
22. `MercadoPagoPaymentProvider` sin token no inventa `approved`

Casos de integración obligatorios (Fase 10A):

- USER / SELLER / MODERATOR no acceden a `/v1/admin/*` (RolesGuard `ADMIN_OPS_ROLES`)
- ADMIN y SUPER_ADMIN sí
- dashboard: GMV/`amountHeldClp` por aggregate/groupBy (Postgres real)
- listados: paginación, filtro de estado, sin `passwordHash` / `rawPayload` / tokens

Casos de integración obligatorios (Fase 10B):

- retry `FAILED` → una llamada al provider; `COMPLETED` no duplica
- cancel `PENDING_PAYMENT` libera reserva; cancel `PAID` crea/ejecuta refund
- cancel con refund `FAILED` no marca `REFUNDED`
- `SHIPPED` → `ORDER_ILLEGAL_TRANSITION`
- `reason` obligatorio en cancel admin; `amountClp` rechazado en retry
- `AuditLog` de mutación; sin `rawPayload` / `passwordHash`

Casos de integración obligatorios (Fase 10C):

- `SELLER_PAYABLE` / `PLATFORM_FEE` atómicos con confirm; retry no duplica
- `REFUND` idempotente; casos A/B/C (antes de payable, antes de payout, post-PAID con deuda visible)
- dos admins el mismo `orderId` → un solo payout
- `PAID` exige `providerRef`; segundo `mark-paid` ilegal
- ledger UPDATE bloqueado; `ADJUSTMENT` solo SUPER_ADMIN
- backfill idempotente; balance exacto desde ledger
- payout no supera `availableClp`; saldo negativo bloquea payout nuevo

Casos de integración obligatorios (Fase 10D):

- run consistente → 0 issues
- payment/refund missing local o provider; status/amount mismatch
- ledger: falta `PAYMENT_CAPTURED`, `SELLER_PAYABLE`, `REFUND`, `PAYOUT_PAID`
- error de proveedor → run `FAILED`
- segundo run concurrente → `RECONCILIATION_IN_PROGRESS`
- acknowledge/resolve RBAC; run repetido reutiliza OPEN (fingerprint)

Casos de integración obligatorios (Fase 10.5):

- buyer/seller abren disputa propia; tercero 404
- segunda disputa activa bloqueada
- mensaje de parte; nota interna oculta
- evidence: ownership y MIME/size
- report listing; duplicado; rate limit
- admin assign/resolve + ModerationAction/AuditLog
- seller suspendido no publica; restore; pause/restore listing
- ListingRevision UPDATE bloqueado
- USER no modera; MODERATOR no suspende seller; ADMIN sí

Correr:

```text
pnpm test
pnpm test:integration
```

Postgres debe estar arriba (`DATABASE_URL`). CI corre migrate + ambos.

## Reglas

- Cada feature de API incluye tests del caso feliz + 1 IDOR o 1 validación.
- Transiciones de `OrderStatus` inválidas deben fallar con test.
- Webhooks MP: fixtures de payloads, prueba de idempotencia.
- No exigir 100% coverage. Exigir tests en dinero, stock y auth.
- 10.6: requestId, redaction, kill switches, job lock, refund retry idempotente, dispute vs payout, suspensión auto-pausa, evidence IDOR, health/ready.
- 10.7: consentimiento al signup, versiones legales, copy de pagos, gate de pagos live, feedback rate limit, baja sin borrar finanzas.
- 11.0: E2E web Playwright + seed beta (`pnpm beta:seed` / `pnpm test:e2e`).
- 11: unit mobile (`pnpm --filter @tcg/mobile test`); Maestro opcional; checklist [release/MOBILE-BETA-QA.md](release/MOBILE-BETA-QA.md).
- 11.5: unit OAuth/linking/ban/refresh; integración Postgres `auth-identity.integration.spec.ts` (stub, sin Google/Apple live); E2E stub.
- 12: unit `collection-value` + `CollectionsService`; integración Postgres `collections.integration.spec.ts`; E2E `collection-happy-path.spec.ts`; Maestro `07-collection.yaml`.
- 13: unit `price-index`; integración Postgres `prices.integration.spec.ts`; E2E `price-history.spec.ts`.
- 14: unit `wishlist-rules`; integración Postgres `wishlist.integration.spec.ts` + descuento de lote en collections; E2E `wishlist-happy-path.spec.ts`; Maestro `08-wishlist.yaml`.
- B3: unit `chile-time` / `async-pool`; SALE por `completedAt`; sort `estimatedValue` paginado; `pnpm test:load` (API arriba). No 50 rps en CI (throttle + ruido).
- B4: Playwright admin (refund retry + payout manual); checklists F12–14 + notificaciones in-app; `pnpm beta:seed` expira checkouts vencidos y restockea si available < 8. Maestro no es gate de CI. Throttle HTTP off en development/test (`E2E_RELAX_THROTTLE`).
- B5: unit `ErrorTrackingService` / `RedisSchedulerLock`; `assertErrorTrackingConfig`; Redis no se exige en CI. Dump `pnpm db:backup` no corre en CI.
- B8: in-app de orden (`SALE_MADE` / `PURCHASE_MADE` / envío / cancel / disputa / rating) con `safeEmit` post-commit; integración `notifications.integration.spec.ts`; E2E buyer ve Compra confirmada / Nueva venta. `pnpm staging:preflight` (operador, no CI). Push diferido. Testers invitados = operador.

Casos CATALOG.1/2: unit `catalog-filters.spec.ts`, `catalog-real-taxonomy.spec.ts`, importers Scryfall/Pokémon. Integración `catalog-filters.integration.spec.ts` + `catalog-real-taxonomy.integration.spec.ts` (Venusaur Grass, Blue-Eyes LIGHT, Mitra ANCESTRAL, Shanks RED Leader, Agumon ROOKIE, GD01-001 BLUE) + `catalog-visibility.integration.spec.ts` (`SHOW_SYNTHETIC_CATALOG=false` oculta showcase). E2E `e2e/game-filters.spec.ts` (showcase Ember Pup; set MyL Andes Demo muestra Filtros + Tipo de carta; `SHOW_SYNTHETIC_CATALOG` default true en CI). CI no llama APIs de catálogo.

## Datos de test

- Seed catálogo: `pnpm catalog:seed` (juegos, cartas Test Mon, tarifas).
- Seed beta QA: `pnpm beta:seed` — buyer/seller/admin sintéticos + listing Test Mon #1 + fixture refund FAILED (Test Mon #2). Ver [release/B4-QA.md](release/B4-QA.md).
- Demo MyL (local): `pnpm catalog:seed-myl-demo`. Unit `myl-demo/*.spec.ts`. Integración `catalog-submissions` + `myl-demo-seed`. E2E `myl-marketplace.spec.ts`, `seller-storefront.spec.ts`.
- Nunca apuntar tests a producción.

## CI

GitHub Actions (`.github/workflows/ci.yml`): Postgres 16 → `prisma migrate deploy` → `pnpm audit:deps` → lint → typecheck → `pnpm test` → `pnpm test:integration` → `pnpm build` → `pnpm test:e2e`. El PR falla si algún gate falla. El smoke de dinero vive en integración API. Playwright no usa Mercado Pago live. Maestro: `.github/workflows/maestro.yml`. EAS Android/iOS: `eas-android-preview.yml` / `eas-ios-testflight.yml` (`workflow_dispatch` only; secretos Expo).
