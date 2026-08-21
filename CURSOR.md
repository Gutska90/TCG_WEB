# TCG Platform — Cursor rules (canonical copy)

The canonical file is [docs/CURSOR.md](docs/CURSOR.md). Follow that document.

Quick constraints:

- Do not implement product features until Fase 0 is requested.
- Do not change architecture without updating `docs/02-ARCHITECTURE.md`.
- Do not create tables outside Prisma.
- Do not put business logic in Nest controllers or in the web/mobile clients.
- Do not use `if (user.isAdmin)`. Use RBAC.
- Do not stub future APIs.
- CLP integers. UI copy in Spanish (Chile). Code identifiers in English.
