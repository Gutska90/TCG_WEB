# 14 — Deployment

## Local (Fase 0)

Docker Compose:

- PostgreSQL 16
- Redis (desde que existan colas)
- Adminer opcional
- Mailcatcher / Inbucket

`pnpm dev` corre api + web. Mobile: `pnpm dev:mobile` (Expo). En dispositivo físico apunta `EXPO_PUBLIC_API_BASE_URL` a la IP LAN; ver [10-MOBILE.md](10-MOBILE.md).

## Entornos

| | local | staging | production |
|--|-------|---------|------------|
| API | localhost | Fly/Railway/Render/k8s TBD | TBD |
| Web | localhost | Vercel o mismo cluster | TBD |
| Mobile | Expo Go / EAS preview | EAS `preview` interno | EAS `production` (no submit aún) |
| Admin | localhost | auth restringida | IP allowlist o VPN recomendada |
| DB | docker | managed Postgres | managed + backups diarios |
| Files | Minio o R2 dev | R2 | R2 |
| MP | sandbox | sandbox | producción **solo** si el [production gate](adr/0008-marketplace-payment-model.md) está firmado |

Decisión de hosting **no bloquea** el código: 12-factor, `DATABASE_URL`, `REDIS_URL`, `MP_*`, `ENABLE_GOOGLE_AUTH` / `ENABLE_APPLE_AUTH` + client IDs. Staging/production fallan si un provider OAuth está on sin audiencias. El token MP de **producción** sí está bloqueado por el production gate (ADR 0008), no por el hosting.

## CI/CD

GitHub Actions (o equivalente):

1. `pnpm install --frozen-lockfile`
2. lint, typecheck, test
3. `prisma migrate` en staging/prod con job separado, nunca `db push` en prod
4. deploy

## Observabilidad

Ver [OBSERVABILITY-AND-OPERATIONS.md](OBSERVABILITY-AND-OPERATIONS.md).

- Logs JSON (stdout). Header `X-Request-Id`.
- `/health` liveness; `/ready` Postgres. No llama Mercado Pago.
- Jobs in-process (`JOBS_ENABLED`). Sin BullMQ en 10.6.
- Kill switches: `DISABLE_CHECKOUT`, `DISABLE_NEW_LISTINGS`, `DISABLE_PAYOUTS`, `DISABLE_REFUNDS_AUTOMATION`.
- `ERROR_TRACKING_ENABLED=false` por defecto.
- Producción + `ENABLE_REAL_PAYMENTS=true` exige `REAL_PAYMENTS_LEGAL_APPROVED=true` (fail-fast). Nunca `true` en el repo. Ver [LEGAL-BETA.md](LEGAL-BETA.md).

CI:

1. `pnpm install --frozen-lockfile`
2. lint, typecheck, test, test:integration, build
3. `prisma migrate` en staging/prod con job separado, nunca `db push` en prod
4. deploy (SIGTERM: shutdown hooks, jobs RUNNING → FAILED)

## Migraciones

Solo Prisma Migrate. Nombre descriptivo. Revisar SQL generado en PR.

## Secretos

Manager del host (no en git). Rotación de JWT secret invalida access; refresh sigue hasta revocar sesiones si se diseña `tokenVersion` en User — recomendado `User.tokenVersion` desde Fase 1.

EAS: no commitear keystores, `google-services.json`, ni `EAS_PROJECT_ID` secretos. Perfiles en `apps/mobile/eas.json`.
