# Docker local

```bash
pnpm db:up
```

| Servicio | Puerto |
|----------|--------|
| PostgreSQL | 5432 (`tcg` / `tcg` / `tcg_platform`) |
| Redis | 6379 (líder del JobScheduler si `REDIS_URL`; no es cola BullMQ) |
| Inbucket (mail) | UI 9000, SMTP 2500 |
| Minio (files) | S3 9100, consola 9101 (user `tcg` / `tcgminio12`, bucket `tcg-files`) |
