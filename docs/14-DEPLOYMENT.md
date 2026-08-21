# 14 — Deployment

## Local (Fase 0)

Docker Compose:

- PostgreSQL 16
- Redis (desde que existan colas)
- Adminer opcional
- Mailcatcher / Inbucket

`pnpm dev` corre api + web. Mobile: Expo en máquina host.

## Entornos

| | local | staging | production |
|--|-------|---------|------------|
| API | localhost | Fly/Railway/Render/k8s TBD | TBD |
| Web | localhost | Vercel o mismo cluster | TBD |
| Admin | localhost | auth restringida | IP allowlist o VPN recomendada |
| DB | docker | managed Postgres | managed + backups diarios |
| Files | Minio o R2 dev | R2 | R2 |
| MP | sandbox | sandbox | producción |

Decisión de hosting **no bloquea** el código: 12-factor, `DATABASE_URL`, `REDIS_URL`, `MP_*`.

## CI/CD

GitHub Actions (o equivalente):

1. `pnpm install --frozen-lockfile`
2. lint, typecheck, test
3. `prisma migrate` en staging/prod con job separado, nunca `db push` en prod
4. deploy

## Observabilidad

- Logs estructurados JSON (Pino).
- Request id.
- Alertas: webhook MP fallidos, tasa 5xx, cola muerta.
- Backups Postgres con restore test trimestral (proceso humano).

## Migraciones

Solo Prisma Migrate. Nombre descriptivo. Revisar SQL generado en PR.

## Secretos

Manager del host (no en git). Rotación de JWT secret invalida access; refresh sigue hasta revocar sesiones si se diseña `tokenVersion` en User — recomendado `User.tokenVersion` desde Fase 1.
