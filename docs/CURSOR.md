# CURSOR.md — reglas para el agente

Este archivo manda sobre la ocurrencia del modelo. Si un prompt de usuario contradice `/docs` en arquitectura, **parar y preguntar**.

## Antes de escribir código

1. Leer `docs/README.md` y la fase actual en `docs/15-ROADMAP.md`.
2. Leer el doc del dominio (API, AUTH, DATABASE, etc.).
3. No implementar fases futuras “porque es fácil”.
4. Si falta un campo: actualizar `docs/03-DATABASE.md` y `docs/04-API.md` en el mismo cambio, o rechazar el campo.

## Prohibiciones

- Modificar arquitectura (monorepo, stack, Prisma vs otro ORM, segundo backend) sin actualizar `docs/02-ARCHITECTURE.md` y confirmación explícita del usuario.
- Crear tablas, columnas o enums que no estén en Prisma. Prisma es la única fuente de esquema.
- `prisma db push` en staging/producción; solo migrate.
- Duplicar tipos entre `apps/web`, `apps/mobile` y `apps/api`. Usar `packages/types` y `packages/validation`.
- Lógica de negocio en controllers Nest, en React components, o en Route Handlers que hablen con Prisma.
- Rutas privadas sin guard de autenticación **y** autorización (rol o ownership).
- `if (user.isAdmin)` / `if (role === 'admin')` suelto. RBAC centralizado.
- Operaciones de Order, Payment, Payout, Refund, stock sin `AuditLog`.
- `any` en TypeScript. `as unknown as` solo con comentario de por qué.
- Inventar endpoints 200 stub para features futuras.
- Scraping de TCGMatch u otros marketplaces. No copiar su UI, copy ni catálogo.
- Liberar pagos al vendedor en el webhook `approved`.
- Secretos en git.

## Obligaciones

- DTO de entrada validados (Zod en borde HTTP o class-validator + pipes Nest, coherente con `packages/validation`).
- Identificadores de código en inglés; strings de UI en es-CL.
- Precios CLP enteros.
- Listings de singles con `variantId` obligatorio.
- Tests para dinero, stock y auth en cada feature que los toque.
- Feature flags o ausencia de UI para lo no entregado; no botones que crashean.

## Orden de implementación (recordatorio)

```text
REQUERIMIENTOS → MODELO → API → AUTH → MARKETPLACE → WEB → MOBILE
```

Al pedir “pantalla X”, primero asegurar endpoint y schema.

## Estilo de cambio

- Diffs mínimos alineados a la fase.
- No refactors masivos no pedidos.
- No añadir dependencias sin justificación de una línea en el PR/mensaje.

## Prompt inicial (Fase 0)

Usar **solo** cuando se pida explícitamente scaffold. No ejecutarlo de pasada.

```text
Implementa Fase 0 según docs/15-ROADMAP.md y docs/02-ARCHITECTURE.md.

Crea el monorepo pnpm + Turborepo con apps/web (Next.js), apps/api (NestJS),
apps/admin (Next.js), apps/mobile (Expo placeholder mínimo), packages/{ui,types,validation,config,eslint-config,tsconfig},
prisma/schema.prisma vacío de features (solo placeholder o modelos Fase 1 si se indica),
docker-compose para Postgres, ESLint, TypeScript estricto, README de desarrollo.

No implementes catálogo, marketplace, ni pantallas de producto.
No te desvíes de /docs. Cuando termines, lista cómo correr api y web en local.
```

## Prompt de feature (a partir de Fase 1)

```text
Implementa Fase N según docs/15-ROADMAP.md.
Lee los docs de dominio involucrados.
Actualiza Prisma con migrate, endpoints /v1, tests, y solo la UI de esa fase.
No adelantes la fase N+1.
```
