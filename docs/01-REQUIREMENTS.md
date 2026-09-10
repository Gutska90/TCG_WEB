# 01 — Requerimientos

## Alcance geográfico y de negocio

- País: Chile.
- Moneda: CLP (enteros).
- Idioma de producto: es-CL.
- Pagos: Mercado Pago.
- Catálogo Fase 1: Pokémon, Magic: The Gathering, One Piece. Yu-Gi-Oh y Mitos y Leyendas pueden aparecer en el **seed de vitrina** (`seedShowcase`); no son expansión de producto Fase 1 ni importer.

## MVP 1 — Catálogo e identidad

Debe existir:

- Login web con Google (crear cuenta en el primer ingreso). Email+password y verificación propia quedan como fallback, no como onboarding principal.
- Apple en iOS cuando exista la app (regla App Store si hay login de terceros).
- Recuperación de contraseña solo para cuentas con password.
- Perfil básico (nombre, avatar, ubicación a nivel comuna opcional).
- Listado de TCG, sets y cartas.
- Ficha de carta (variantes, rareza, número, idioma).
- Buscador de cartas por nombre, set y número.
- Favoritos de carta (no confundir con wishlist).
- Roles RBAC en backend, aunque el usuario común solo vea flujos de `USER`.

No debe existir aún: listings, carrito, pagos, envíos.

## MVP 2 — Marketplace

Agregar:

- Onboarding vendedor (dirección de despacho, aceptación de términos de venta).
- Crear / editar / pausar / eliminar publicación.
- Flujo: buscar carta → condición → idioma → variante → cantidad → precio → fotos → publicar.
- Precio de mercado / mínimo / sugerido (puede ser stub si aún no hay historial: usar min/avg de listings activos).
- Perfil público de vendedor.
- Carrito multi-vendedor.
- Checkout que **parte** la compra en una orden por vendedor.
- Estados de orden internos (sin pasarela real: pago mock o sandbox).

## MVP 3 — Transacciones (marketplace funcional)

Agregar:

- Mercado Pago Checkout Pro o equivalente, con webhooks.
- Estados internos de pago (recibido / elegible para liquidación; ver [07-PAYMENTS](07-PAYMENTS.md)). No escrow del procesador.
- Métodos de envío y entrega presencial.
- Valoraciones post-compra (estrellas + comentario, una por orden/parte).
- Notificaciones in-app + email de eventos transaccionales.
- Reportes de listing/usuario.
- Panel admin mínimo: usuarios, listings, órdenes, disputas.

Con MVP 3 se puede operar un marketplace real en Chile.

## Segunda etapa (post-MVP)

Orden de código en [15-ROADMAP](15-ROADMAP.md). Inventario completo en [23-PRODUCT-BACKLOG](23-PRODUCT-BACKLOG.md).

| Feature | Requisito resumido |
|---------|-------------------|
| Disputas + reportes | Evidencia, motivos; Compra Protegida = reglas internas (10.5 / 10.7) |
| Colecciones | Ítems, qty, condición, costo, valor, % set, Completar set |
| Historial de precios | Ventas reales + listings; mediana; **confianza** |
| Wishlist | Precio objetivo, condición, idioma, alertas agrupadas |
| Scanner | Identificar → precio → colección → vender; modo lote |
| Optimizador de carrito | Menor precio / menos vendedores / más rápido |
| Importación masiva | CSV de listings: preview `POST /v1/me/listings/bulk/preview` (BULK.1). Confirmación/UI final pendiente |
| Tiendas | Cuenta `STORE`, branding, retiro en local |

## Tercera etapa (diferenciación)

Ofertas, intercambios Tengo–Quiero, seguidores/feed, deck builder, subastas, sellados/preventas, eventos/torneos, API B2B, graded con certificado.

Estas capacidades se **modelan** cuando afecta el esquema (p. ej. `Auction`, `Offer`), pero **no se implementan** hasta la fase nombrada.

## Requisitos no funcionales

| Área | Requisito |
|------|-----------|
| Clientes | Web + PWA + iOS + Android contra la misma API |
| Rendimiento búsqueda | p95 < 300 ms en catálogo MVP (Postgres) |
| Imágenes | PUT directo a R2/S3/Minio (URL prefirmada); GET listing/avatar y evidencia autenticada pasan por la API (no bucket público) |
| Auditoría | Toda mutación financiera en `AuditLog` |
| Tipos | TypeScript estricto; tipos compartidos en `packages/types` |
| Validación | Zod (o class-validator en Nest) en el borde de la API |
| i18n código | Identificadores en inglés; copy UI en español |
| Legal | Términos, privacidad, cookies; no scrapear competidores |
| Accesibilidad web | Objetivo WCAG 2.2 AA en flujos de compra |

## Fuera de alcance (explícito)

- Accesorios y sellados en MVP 1–2 (el modelo de listing debe permitir `productType` para no rediseñar después; la UI de sellados llega en segunda etapa).
- Blog / CMS de contenido.
- POS e integración ecommerce de tiendas.
- Factura electrónica SII.
- Multi-país / multi-moneda.
- Chat en tiempo real (mensajes simples pueden llegar después de MVP 3).
- Copiar catálogo, fotos o textos de TCGMatch, TCGPlayer u otros.

## Criterios de éxito del MVP 3

- Un vendedor publica una carta del catálogo con fotos y condición en < 2 minutos.
- Un comprador paga con Mercado Pago sandbox, el vendedor ve la orden, marca despachado, el comprador confirma, el pago se libera.
- Un admin puede pausar un listing y ver el audit log.
- La ficha de carta muestra vendedores ordenados por precio para la variante/condición.
