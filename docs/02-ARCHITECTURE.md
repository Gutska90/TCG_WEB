# 02 — Arquitectura

## Principio rector: API-first

Orden obligatorio de implementación:

```text
REQUERIMIENTOS → MODELO DE DATOS → API → AUTENTICACIÓN → MARKETPLACE → WEB → MOBILE
```

Prohibido: construir pantallas que inventen el modelo. Si una pantalla necesita un campo que no está en [03-DATABASE](03-DATABASE.md) ni en [04-API](04-API.md), primero se actualiza la especificación.

## Diagrama lógico

```text
apps/web (Next.js)          apps/mobile (Expo)
apps/admin (Next.js)                │
        │                           │
        └──────────► apps/api (NestJS) ◄────────┘
                           │
                    Prisma Client
                           │
                      PostgreSQL
                           │
        object storage (R2)   Mercado Pago   email (Resend)
```

## Monorepo

Herramientas: **pnpm workspaces + Turborepo**. Node 22 LTS. TypeScript 5.x en todos los paquetes.

```text
tcg-platform/
├── apps/
│   ├── web/                 # Next.js App Router — producto público + PWA
│   ├── mobile/              # Expo — iOS/Android
│   ├── api/                 # NestJS — único backend
│   └── admin/               # Next.js — panel interno (dominio o /admin)
├── packages/
│   ├── ui/                  # componentes web compartidos (shadcn)
│   ├── types/               # DTO y entidades compartidas (generados o a mano)
│   ├── validation/          # schemas Zod compartidos
│   ├── config/              # env, constantes (condiciones, roles)
│   ├── eslint-config/
│   └── tsconfig/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/
├── docker/
├── CURSOR.md                # copia o symlink conceptual; canónico en docs/CURSOR.md
├── AGENTS.md
└── README.md
```

`prisma/` vive en la raíz del monorepo. La API es el único runtime que ejecuta Prisma. Web y mobile **nunca** importan Prisma.

## Stack cerrado

### API

- NestJS + TypeScript
- Prisma
- Passport / estrategias JWT
- Throttling
- Queue (BullMQ + Redis) para emails, webhooks, importaciones — **no en beta**. Jobs: `JobRunner` in-process + `JobRun` (un `RUNNING` por nombre). Redis opcional: lock de líder del `JobScheduler` (B5). Ver [OBSERVABILITY-AND-OPERATIONS.md](OBSERVABILITY-AND-OPERATIONS.md) y [runbooks/PRODUCTION.md](runbooks/PRODUCTION.md).

Módulos NestJS (carpeta = bounded context):

```text
auth  users  cards  games  sets  marketplace  listings
orders  payments  shipping  collections  favorites
notifications  auctions  stores  admin  search  files
```

`auctions`, `collections` (portfolio), `stores` avanzado pueden existir como módulos vacíos o no crearse hasta su fase. **No** crear controladores dummy que respondan 200 inventando datos.

### Web

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query
- Zustand solo si hay estado cliente real (carrito guest, UI)
- next-pwa o equivalente cuando llegue PWA (no en Fase 1)

### Mobile

- Expo + Expo Router + TypeScript
- TanStack Query
- Misma API, mismos schemas de `packages/validation`

### Admin

- Next.js separado para no mezclar bundle ni auth cookie del producto.
- Consume la misma API con roles `MODERATOR | ADMIN | SUPER_ADMIN`.

## Límites de responsabilidad

| Capa | Puede | No puede |
|------|-------|----------|
| Controller Nest | Parsear HTTP, auth guards, mapear DTO | Reglas de negocio, queries Prisma complejas |
| Service | Orquestar casos de uso, transacciones | Depender de Request/Response HTTP |
| Prisma | Persistencia | Validar permisos |
| Next.js RSC | Fetch de lectura pública / sesión | Escribir a Postgres directo |
| Mobile | UI + llamadas API | Lógica de comisión o liberación de pago |

## Autenticación entre clientes

- API stateless: **access JWT** (corta) + **refresh token** opaco en DB (`Session`).
- Web: refresh en cookie httpOnly; access en memoria.
- Mobile: secure storage (Expo SecureStore).
- Admin: cookie httpOnly en dominio admin.

Detalle en [05-AUTH](05-AUTH.md).

## Archivos

1. Cliente pide URL prefirmada `POST /v1/files/uploads`.
2. Si `storage: "object"`, sube con PUT a R2/Minio. Si `deferred` (local/CI sin credenciales), no hay URL.
3. Confirma `POST /v1/files/:id/complete` (HeadObject cuando hay storage).
4. Listings y avatares referencian `File` por id; `GET /v1/files/:id` streamea listing/avatar.
5. Evidencia de disputa: `GET /v1/disputes/:id/evidence/:evidenceId/file` (parte o staff).

Staging/producción no arrancan sin R2 o S3 y sin Resend o SMTP. Ver [runbooks/STAGING.md](runbooks/STAGING.md).

## Tiempo real

- MVP: no WebSockets.
- Órdenes: el cliente hace poll o invalidación TanStack Query.
- Subastas (Fase 16): WebSockets / SSE. El modelo `AuctionBid` ya está previsto.

## Entornos

| Nombre | Uso |
|--------|-----|
| local | Docker Compose: Postgres, Redis, Mailhog/Inbucket |
| staging | Datos de catálogo reales, pagos sandbox |
| production | Pagos reales, backups |

## Reglas de cambio

Cualquier cambio de:

- módulos,
- tablas,
- contratos públicos de API,
- roles,

exige actualizar primero el documento correspondiente en `/docs` y luego el código. No al revés.
