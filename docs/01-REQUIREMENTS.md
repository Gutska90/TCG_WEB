# 01 — Requerimientos

## Alcance geográfico y de negocio

- País: Chile.
- Moneda: CLP (enteros).
- Idioma de producto: es-CL.
- Pagos: Mercado Pago.
- Catálogo Fase 1: Pokémon, Magic: The Gathering, One Piece.

## MVP 1 — Catálogo e identidad

Debe existir:

- Registro / login (email+password, Google, Apple).
- Verificación de email.
- Recuperación de contraseña.
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
- Retención / liberación de pago (ver [07-PAYMENTS](07-PAYMENTS.md)).
- Métodos de envío y entrega presencial.
- Valoraciones post-compra (estrellas + comentario, una por orden/parte).
- Notificaciones in-app + email de eventos transaccionales.
- Reportes de listing/usuario.
- Panel admin mínimo: usuarios, listings, órdenes, disputas.

Con MVP 3 se puede operar un marketplace real en Chile.

## Segunda etapa (post-MVP)

| Feature | Requisito resumido |
|---------|-------------------|
| Colecciones | Ítems poseídos, qty, condición, costo de compra, valor actual |
| Wishlist | Precio objetivo + alerta cuando un listing ≤ objetivo |
| Historial de precios | Serie temporal por `CardVariant` |
| Importación masiva | CSV de listings para tiendas/vendedores |
| Tiendas | Cuenta `STORE`, branding, retiro en local |

## Tercera etapa (diferenciación)

Escáner IA, tasación, portfolio, recomendaciones, deck builder, marketplace de decks, subastas en vivo, eventos, torneos, comunidades.

Estas capacidades se **modelan** cuando afecta el esquema (p. ej. `Auction`), pero **no se implementan**.

## Requisitos no funcionales

| Área | Requisito |
|------|-----------|
| Clientes | Web + PWA + iOS + Android contra la misma API |
| Rendimiento búsqueda | p95 < 300 ms en catálogo MVP (Postgres) |
| Imágenes | Subida directa a object storage; API no sirve blobs |
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
