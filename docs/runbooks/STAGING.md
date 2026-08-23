# Runbook — Staging (B1)

Sin secretos. `ENABLE_REAL_PAYMENTS` permanece `false`. No pagos live ni payouts automáticos.

El código es 12-factor; **este documento no crea la cuenta de hosting**. Lista exacta de cuentas y secretos: [OPERATOR-KICKOFF.md](../release/OPERATOR-KICKOFF.md).

## Qué queda listo en el repo

- Fail-fast en `NODE_ENV=staging|production` o `APP_ENV=staging|production` si faltan object storage o correo.
- Staging rechaza `ENABLE_REAL_PAYMENTS=true`.
- Object storage: Cloudflare R2 (`R2_*`) o S3/Minio (`S3_ENDPOINT` + credenciales). `complete` exige que el objeto exista. `GET /v1/files/:id` sirve listing/avatar; evidencia solo con auth de parte o staff.
- Correo: Resend (`RESEND_API_KEY`) o SMTP (`SMTP_HOST`). Local: Inbucket `:2500`.
- API contenedor: `docker/Dockerfile.api`.
- Minio local: Compose puertos **9100** (S3) y **9101** (consola). Inbucket sigue en **9000**.

## Preflight (antes de pegar secretos en el host)

Copia `.env.staging.example` a `.env.staging` (gitignored), llena valores reales y corre:

```bash
pnpm staging:preflight -- --env-file .env.staging
```

Exit 1 = blockers (no invites testers). Warnings (host `example.test`, admin sin IP allowlist, OAuth off) no impiden el boot. Este comando **no** crea el servidor.

## Checklist operador

1. Postgres managed + `prisma migrate deploy` (nunca `db push`).
2. Bucket R2 privado (sin listado público). CORS: orígenes web y admin de staging, métodos `PUT`/`HEAD`.
3. Secretos en el manager del host (ver `.env.staging.example`).
4. `CORS_ORIGINS` allowlist explícita (sin `*`).
5. `JWT_ACCESS_SECRET` ≥ 32 caracteres, no placeholders.
6. `EMAIL_FROM` con dominio verificado en Resend.
7. Deploy API (`docker/Dockerfile.api`) + web/admin (Vercel u homólogo) con `API_ORIGIN` / `NEXT_PUBLIC_*` apuntando al API HTTPS.
8. Smoke: `/health`, `/ready`, registro + correo de verificación, publicar listing con foto, checkout sandbox.
9. OAuth: dejar flags off hasta tener client IDs de staging (B1 no exige Google/Apple).
10. Admin: `ADMIN_IP_ALLOWLIST` con las IPs del staff (o no publicar el host). Auth de staff no basta sola en internet.

## Local con Minio + Inbucket

```bash
pnpm db:up
```

En `.env` (no en git):

```text
S3_ENDPOINT=http://127.0.0.1:9100
S3_PUBLIC_ENDPOINT=http://127.0.0.1:9100
S3_ACCESS_KEY_ID=tcg
S3_SECRET_ACCESS_KEY=tcgminio12
S3_BUCKET=tcg-files
S3_FORCE_PATH_STYLE=true
SMTP_HOST=127.0.0.1
SMTP_PORT=2500
```

Sin esas variables, local/CI siguen en `storage: deferred` (metadatos, sin bytes) para no romper tests.

Si la API corre **dentro** de Compose y el browser en el host: `S3_ENDPOINT=http://minio:9000` y `S3_PUBLIC_ENDPOINT=http://127.0.0.1:9100` para que el PUT prefirmado sea alcanzable.

## Build API

```bash
docker build -f docker/Dockerfile.api -t tcg-api .
```

Migraciones: job aparte `pnpm exec prisma migrate deploy` con `DATABASE_URL` de staging.

## Fuera de B1

Android/iOS (B6/B7) necesitan `EXPO_PUBLIC_API_BASE_URL` HTTPS de este staging. Contrato: [B6-ANDROID-BETA](../release/B6-ANDROID-BETA.md), [B7-IOS-TESTFLIGHT](../release/B7-IOS-TESTFLIGHT.md). CSP Next y `pnpm audit` son B2. Sentry/backups/Redis líder: [PRODUCTION.md](PRODUCTION.md) (B5).

## Housekeeping (B4 / B0-PAY-01)

Playwright deja `JOBS_ENABLED=false` para no flakeyar y `E2E_RELAX_THROTTLE=true` (el tope de login 10/15 min no cabe en la suite). En **staging** dejar `JOBS_ENABLED=true` para que `expire-checkouts` corra cada 60s y no deje `quantityReserved` fantasma. No poner `E2E_RELAX_THROTTLE` en staging.

Local o entorno de prueba largo:

```bash
pnpm beta:seed
```

Expira checkouts `PENDING_PAYMENT` con `expiresAt` vencido y restockea Test Mon #1 si available < 8.

