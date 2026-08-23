# 14 — Deployment

## Local (Fase 0)

Docker Compose:

- PostgreSQL 16
- Redis (desde que existan colas)
- Adminer opcional
- Mailcatcher / Inbucket (SMTP 2500, UI 9000)
- Minio (S3 9100, consola 9101) — opcional; sin `S3_*`/`R2_*` los uploads quedan `deferred`

`pnpm dev` corre api + web. Mobile: `pnpm dev:mobile` (Expo). En dispositivo físico apunta `EXPO_PUBLIC_API_BASE_URL` a la IP LAN; ver [10-MOBILE.md](10-MOBILE.md).

## Entornos

| | local | staging | production |
|--|-------|---------|------------|
| API | localhost | Fly/Railway/Render/k8s TBD | TBD |
| Web | localhost | Vercel o mismo cluster | TBD |
| Mobile | Expo Go / EAS preview | EAS `preview` APK interno (B6); iOS `testflight` (B7) | EAS `production` binario (sin submit de store) |
| Admin | localhost | auth restringida | IP allowlist o VPN recomendada |
| DB | docker | managed Postgres | managed + backups diarios |
| Files | Minio o R2 dev | R2 | R2 |
| MP | sandbox | sandbox | producción **solo** si el [production gate](adr/0008-marketplace-payment-model.md) está firmado |

Decisión de hosting **no bloquea** el código: 12-factor, `DATABASE_URL`, `REDIS_URL`, `MP_*`, `ENABLE_GOOGLE_AUTH` / `ENABLE_APPLE_AUTH` + client IDs, **R2 o S3**, **Resend o SMTP**. Staging/production fallan si un provider OAuth está on sin audiencias, si falta storage o correo, o si staging tiene `ENABLE_REAL_PAYMENTS=true`. El token MP de **producción** sí está bloqueado por el production gate (ADR 0008), no por el hosting.

Contrato de operador: [runbooks/STAGING.md](runbooks/STAGING.md). Imagen API: `docker/Dockerfile.api`. Variables: `.env.staging.example`.

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
- Jobs in-process (`JOBS_ENABLED`) + lock `JobRun`. Redis opcional: líder del scheduler (B5). Sin BullMQ.
- Kill switches: `DISABLE_CHECKOUT`, `DISABLE_NEW_LISTINGS`, `DISABLE_PAYOUTS`, `DISABLE_REFUNDS_AUTOMATION`.
- `ERROR_TRACKING_ENABLED=false` por defecto; si `true`, exige `SENTRY_DSN`.
- Producción + `ENABLE_REAL_PAYMENTS=true` exige `REAL_PAYMENTS_LEGAL_APPROVED=true` (fail-fast). Nunca `true` en el repo. Ver [LEGAL-BETA.md](LEGAL-BETA.md).

CI:

1. `pnpm install --frozen-lockfile`
2. lint, typecheck, test, test:integration, build
3. `prisma migrate` en staging/prod con job separado, nunca `db push` en prod
4. deploy (SIGTERM: shutdown hooks, jobs RUNNING → FAILED)

Load HTTP (B3): `pnpm test:load` contra API local o staging. Ver [runbooks/PERFORMANCE.md](runbooks/PERFORMANCE.md). No corre en CI (hace falta el proceso API y el throttle de search).

QA (B4): `pnpm test:e2e` (Playwright web+admin) es gate de CI. Maestro mobile es opcional (`pnpm test:maestro`, `.github/workflows/maestro.yml`). Checklists: [release/B4-QA.md](release/B4-QA.md).

Infra (B5): Sentry, backups, Redis líder de jobs. [runbooks/PRODUCTION.md](runbooks/PRODUCTION.md). `pnpm db:backup` es dump lógico de drill, no sustituye PITR del managed Postgres.

Mobile (B6/B7): `pnpm eas:android:preview` / `pnpm eas:ios:testflight`. Exigen `eas-cli` + cuenta Expo. No corre en el job `check`.

## Migraciones

Solo Prisma Migrate. Nombre descriptivo. Revisar SQL generado en PR.

## Secretos

Manager del host (no en git). Rotación de JWT secret invalida access; refresh sigue hasta revocar sesiones si se diseña `tokenVersion` en User — recomendado `User.tokenVersion` desde Fase 1.

EAS: no commitear keystores, `google-services.json`, ni `EAS_PROJECT_ID`. Perfiles en `apps/mobile/eas.json`. Android interno: [B6-ANDROID-BETA](release/B6-ANDROID-BETA.md). iOS TestFlight: [B7-IOS-TESTFLIGHT](release/B7-IOS-TESTFLIGHT.md). Closed beta: [B8-CLOSED-BETA](release/B8-CLOSED-BETA.md). Workflows `workflow_dispatch` (no gate de `ci.yml`): `eas-android-preview.yml`, `eas-ios-testflight.yml`.
