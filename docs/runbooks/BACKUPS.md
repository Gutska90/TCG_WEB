# Backups y restore (B5)

Dinero y stock viven en **un** PostgreSQL. Perder el disco sin backup es pérdida de órdenes, ledger y disputas.

## Primario: Postgres managed

En staging/production usar el backup del proveedor (RDS, Neon, Cloud SQL, Fly Postgres, etc.):

- Backups automáticos **diarios** (retención ≥ 7 días en beta; ≥ 14 en producción).
- PITR / WAL si el proveedor lo ofrece.
- Cifrado en reposo del proveedor.
- Probar **restore a una instancia aparte** al menos una vez antes de closed beta (B8). Nunca restore sobre el primario “para ver”.

El repo no crea la cuenta del proveedor.

## Secundario: dump lógico

Para drills locales o un off-site extra:

```bash
export DATABASE_URL=postgresql://...
pnpm db:backup
```

Escribe `backups/tcg-platform-<UTC>.dump` (`pg_dump --format=custom`). El directorio está gitignored.

Restore (instancia **vacía** o de drill; destruye el destino):

```bash
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" backups/tcg-platform-YYYYMMDDTHHMMSSZ.dump
pnpm exec prisma migrate deploy
```

No commitear dumps. No apuntar `pg_restore` a producción sin un incidente declarado.

## Qué no se backupa así

- Object storage (R2/Minio): versionado/replicación del bucket, no `pg_dump`.
- Redis: lock efímero de jobs; no hay estado de negocio.
- Secretos: manager del host, no este repo.

## Checklist operador

- [ ] Backup automático del managed Postgres confirmado.
- [ ] Restore de drill documentado (fecha, quién, instancia destino).
- [ ] `pnpm db:backup` no es el único mecanismo en staging/prod.
