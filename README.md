# TCG Platform

Nombre de trabajo: **TCG Market Chile**. Plataforma TCG (marketplace + colección + precios), no una copia de TCGMatch.

**Estado actual:** Fase 9 — reputación. Especificación en [docs/README.md](docs/README.md).

## Requisitos

- Node 22+
- pnpm 10 en PATH (`corepack enable --install-directory "$HOME/.local/bin"`)
- Docker Desktop (Postgres local)

## Arranque local

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm dev
```

| App | URL |
|-----|-----|
| Web | http://localhost:3000 |
| API health | http://localhost:4000/health |
| API ready | http://localhost:4000/ready |
| Admin | `pnpm dev:admin` → http://localhost:3002 |
| Mobile | `pnpm dev:mobile` (Expo) |
| Mail (Inbucket) | http://localhost:9000 |

`pnpm dev` levanta **API + web**. Catálogo, carrito, checkout, pagos, envíos y valoraciones.

## Scripts

| Script | |
|--------|--|
| `pnpm lint` | ESLint en workspaces |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | tests API (auth, catálogo, carrito, órdenes, pagos, envíos) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm catalog:seed` | 3 juegos + cartas de prueba |
| `pnpm catalog:import-scryfall -- mh3` | import Magic (Scryfall) |

## Documentación

El agente y los humanos siguen [docs/CURSOR.md](docs/CURSOR.md) y [docs/15-ROADMAP.md](docs/15-ROADMAP.md). Siguiente incremento: **Fase 10 — admin**.

Después de migrar:

```bash
pnpm catalog:seed
# opcional, llama Scryfall:
pnpm catalog:import-scryfall -- mh3
```

En desarrollo, si `RESEND_API_KEY` está vacío, el enlace de verificación se imprime en el log de la API.
