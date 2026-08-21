# Docker local

```bash
pnpm db:up
```

| Servicio | Puerto |
|----------|--------|
| PostgreSQL | 5432 (`tcg` / `tcg` / `tcg_platform`) |
| Redis | 6379 (reservado para colas desde MVP 3) |
| Inbucket (mail) | UI 9000, SMTP 2500 |
