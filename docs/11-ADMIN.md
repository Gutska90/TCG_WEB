# 11 — Admin

## App

`apps/admin` — Next.js. No vive bajo el mismo layout que el marketplace. Auth con roles `MODERATOR | ADMIN | SUPER_ADMIN`.

Ruta conceptual `/` del admin (dominio `admin.` o path interno). El documento de producto habla de `/admin` como idea; la implementación es app separada.

## Dashboard (Fase 10)

KPIs:

- Ventas hoy (count + GMV CLP)
- Comisión estimada
- Usuarios activos (DAU si hay eventos; si no, logins 24 h)
- Nuevos usuarios
- Publicaciones activas
- Órdenes pendientes
- Disputas abiertas
- Pagos HELD por liberar / payouts pendientes

## Módulos

| Módulo | Capacidades |
|--------|-------------|
| Usuarios | buscar, ver roles, ban, verificar |
| Vendedores | onboarding, listings |
| Tiendas | cuando exista Fase 15 |
| Cartas / Sets / Games | CRUD, activar, reimportar |
| Publicaciones | pausar, quitar, motivo |
| Ventas | ver órdenes, forzar transiciones excepcionales |
| Pagos | HELD/RELEASED, reembolsos, payouts |
| Reclamos / disputas | resolver |
| Reportes | cola de moderación |
| Subastas | Fase 16 |
| Notificaciones | broadcast (ADMIN+) |
| Configuración | comisión, timeouts, tarifas envío, feature flags |

## Autorización fina

- `MODERATOR`: reportes, pausar listings, no ver montos de payout ni secrets.
- `ADMIN`: dashboard, órdenes, refunds, catálogo, bans.
- `SUPER_ADMIN`: roles, config, impersonation (si se implementa, audit obligatorio).

Toda acción destructiva o financiera: `AuditLog` con actor, before/after.

## UX

Tabla + filtros + detalle. No hace falta un design system distinto; puede reusar shadcn en oscuro para diferenciar contexto interno.

## Fuera de admin

El scraper de catálogo es un **job CLI** (`apps/api` o `packages/importer`), disparado por admin “Reimportar set”, no scraping en request HTTP largo.
