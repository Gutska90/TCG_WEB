# Documento Maestro — TCG Platform v1.0

**Nombre de trabajo:** TCG Market Chile  
**Nombre interno:** `tcg-platform`  
**Fecha:** 23 agosto 2026  
**Estado:** Fase **14** lista. **UI.1** ✓. **PS** ✓. **PS.1** ✓. **MYL.1/2** demo MyL. **SELLER.1** storefront. Feature freeze 15–20. **B0–B7** ✓ repo. **B1/B8** = operador. No Scanner ni pagos live. **M2** no implementar.

Este repositorio no es una copia de TCGMatch. TCGMatch es **referencia funcional** de un marketplace chileno de cartas. El producto objetivo es una **plataforma TCG integral** para coleccionistas, jugadores y tiendas, con web, PWA y apps móviles sobre **un solo backend y una sola base de datos**.

## Cómo usar este documento

1. Leer este índice y [00-VISION](00-VISION.md).
2. Tratar [01-REQUIREMENTS](01-REQUIREMENTS.md) y [15-ROADMAP](15-ROADMAP.md) como alcance cerrado del MVP.
3. No escribir código de features hasta que Fase 0 esté aceptada.
4. Cursor debe seguir [CURSOR.md](CURSOR.md). El prompt inicial está al final de ese archivo.

## Índice

| # | Documento | Contenido |
|---|-----------|-----------|
| 00 | [VISION](00-VISION.md) | Producto, pilares, posicionamiento |
| 01 | [REQUIREMENTS](01-REQUIREMENTS.md) | Alcance MVP vs futuro |
| 02 | [ARCHITECTURE](02-ARCHITECTURE.md) | Monorepo, stack, API-first |
| 03 | [DATABASE](03-DATABASE.md) | Modelo Prisma completo |
| 04 | [API](04-API.md) | Contratos REST v1 |
| 05 | [AUTH](05-AUTH.md) | Identidad, sesiones, RBAC |
| 06 | [MARKETPLACE](06-MARKETPLACE.md) | Catálogo, listings, carrito, órdenes |
| 07 | [PAYMENTS](07-PAYMENTS.md) | MP cuenta plataforma; HELD/RELEASED internos; production gate |
| 08 | [SHIPPING](08-SHIPPING.md) | Envíos y entrega presencial |
| 09 | [WEB](09-WEB.md) | IA web, SEO, pantallas |
| 10 | [MOBILE](10-MOBILE.md) | App Expo, scanner (futuro) |
| 11 | [ADMIN](11-ADMIN.md) | Panel interno |
| 12 | [SECURITY](12-SECURITY.md) | Amenazas, auditoría, cumplimiento |
| 13 | [TESTING](13-TESTING.md) | Pirámide de tests |
| 14 | [DEPLOYMENT](14-DEPLOYMENT.md) | Entornos, Docker, CI |
| 15 | [ROADMAP](15-ROADMAP.md) | Fases 0–20 |
| 16 | [FLOWS](16-FLOWS.md) | Comprador, vendedor, tienda, colección, búsqueda |
| 17 | [COLLECTION / PRECIOS / WISHLIST](17-COLLECTION-PRICES-WISHLIST.md) | Retención post-MVP |
| 18 | [NOTIFICATIONS](18-NOTIFICATIONS.md) | Eventos, canales, copy |
| 19 | [CATALOG IMPORT](19-CATALOG-IMPORT.md) | Scryfall, Pokémon TCG API, jobs |
| 20 | [SCREENS](20-SCREENS.md) | Inventario web, mobile, admin |
| 21 | [ERRORS AND CONFIG](21-ERRORS-AND-CONFIG.md) | Códigos, env, comisión |
| 22 | [GLOSSARY](22-GLOSSARY.md) | Vocabulario del proyecto |
| — | [GAME-FILTERS](catalog/GAME-FILTERS.md) | CATALOG.1/2 filtros por TCG |
| — | [CARD-ATTRIBUTES](catalog/CARD-ATTRIBUTES.md) | Contrato JSON `Card.attributes` |
| — | [REAL-DATA-SOURCES](catalog/REAL-DATA-SOURCES.md) | CATALOG.2 fuentes y ToS |
| — | [CATALOG2-AUDIT](catalog/CATALOG2-AUDIT.md) | Auditoría demo vs real |
| 23 | [PRODUCT BACKLOG](23-PRODUCT-BACKLOG.md) | Confianza, compra, colección, comunidad, ops |
| — | [FINANCIAL-LEDGER](FINANCIAL-LEDGER.md) | Asientos, saldo seller, payouts 10C |
| — | [TRUST-AND-MODERATION](TRUST-AND-MODERATION.md) | Disputas, reportes, suspensión 10.5 |
| — | [OBSERVABILITY-AND-OPERATIONS](OBSERVABILITY-AND-OPERATIONS.md) | Logs, jobs, flags, kill switches 10.6 |
| — | [LEGAL-BETA](LEGAL-BETA.md) | Términos, privacidad, copy, gates de pagos live 10.7 |
| — | [COLLECTIONS](COLLECTIONS.md) | Colección personal, lotes, valor estimado, set progress 12 |
| — | [OPERATOR-KICKOFF](release/OPERATOR-KICKOFF.md) | Cuentas, secretos y orden para abrir staging/beta |
| — | [STAGING](runbooks/STAGING.md) | B1: preflight, Docker API, Minio local |
| — | [STAGING-CATALOG](runbooks/STAGING-CATALOG.md) | PS.1: seed-reference + import Magic/Pokémon |
| — | [PERFORMANCE](runbooks/PERFORMANCE.md) | B3: load HTTP, p95 search, jobs |
| — | [PRODUCTION](runbooks/PRODUCTION.md) | B5: Sentry, Redis líder, backups/incidentes |
| — | [audit-allowlist](security/audit-allowlist.json) | B2: GHSA high/critical aceptados con motivo |
| — | [WEB-BETA-QA](release/WEB-BETA-QA.md) | Checklist tester web B4 |
| — | [MOBILE-BETA-QA](release/MOBILE-BETA-QA.md) | Checklist tester mobile B4 |
| — | [ADMIN-BETA-QA](release/ADMIN-BETA-QA.md) | Checklist staff B4 |
| — | [B4-QA](release/B4-QA.md) | Índice QA beta (Playwright + Maestro opcional) |
| — | [TESTER-GUIDE](release/TESTER-GUIDE.md) | PS: guía rápida testers (sandbox, qué no probar) |
| — | [QA-MANUAL](release/QA-MANUAL.md) | PS: checklist buyer / seller / admin |
| — | [PRE-STAGING-READINESS](audits/PRE-STAGING-READINESS.md) | PS: P0 operador vs código |
| — | [B6-ANDROID-BETA](release/B6-ANDROID-BETA.md) | EAS preview APK interno (no Play) |
| — | [B7-IOS-TESTFLIGHT](release/B7-IOS-TESTFLIGHT.md) | EAS iOS + TestFlight (no App Store) |
| — | [B8-CLOSED-BETA](release/B8-CLOSED-BETA.md) | Testers invitados, sandbox |
| — | [DESIGN-SYSTEM](design/DESIGN-SYSTEM.md) | UI.1 tokens, tema, componentes |

## Cobertura del Documento Maestro

Los 20 puntos acordados:

1. Alcance — `01`
2. MVP — `01`
3. Futuro — `01` + `15` + `17` + `23`
4. Arquitectura — `02`
5. Modelo de datos — `03`
6–8. Flujos comprador / vendedor / tienda — `16`
9. Pagos — `07`
10. Envíos — `08`
11. Colección — `17`
12. Búsqueda — `16` + `04` + `19`
13. Admin — `11` + `20`
14. Seguridad — `12` + `05`
15. Monorepo — `02`
16. Endpoints — `04` + `21`
17–18. Pantallas web / mobile — `09` `10` `20`
19. Roadmap — `15`
20. `CURSOR.md` + prompt inicial — `docs/CURSOR.md`

## Decisiones cerradas en v1.0

| Tema | Decisión |
|------|----------|
| Producto | Plataforma TCG completa, no “copia de TCGMatch” |
| Mercado | Chile primero (CLP, comunas, Mercado Pago) |
| Clientes | Web/PWA (Next.js) + Android/iOS (Expo) + Admin |
| Backend | Un único NestJS + PostgreSQL para todos los clientes |
| Catálogo | Agnóstico al juego: `TcgGame → Set → Card → CardVariant` |
| TCG Fase 1 | Pokémon, Magic: The Gathering, One Piece |
| Moneda | CLP entero (sin decimales) |
| Auth web | Google-first; email+password fallback; Apple en iOS |
| Pagos MVP | Mercado Pago cuenta **plataforma** (Opción A). HELD interno. Split no. Production gate legal. |
| Envíos MVP | Chilexpress, Blue Express, encuentro, retiro en tienda |
| Subastas | Diseñadas, no implementadas hasta Fase 17 |
| Scanner IA | Diseñado, no implementado hasta Fase 15 |
| Idioma UI | Español (Chile); código e identificadores en inglés |
| Monorepo | pnpm + Turborepo |
| ORM | Prisma; ninguna tabla fuera de `schema.prisma` |
| Autorización | RBAC; nunca `if (user.isAdmin)` |
| Orden de trabajo | Requerimientos → modelo → API → auth → marketplace → web → mobile |

## Decisiones abiertas (no bloquean Fase 0–2)

| Tema | Opciones | Default provisional |
|------|----------|---------------------|
| Marca pública | TCG Market Chile vs marca nueva | Nombre de trabajo hasta definir identidad |
| Comisión marketplace | SELLER_PLANS_V1 6%–3% + cap; processor fee separado | 8% fijo + MP al comprador o incluido |
| Búsqueda post-MVP | Meilisearch vs Typesense | PostgreSQL FTS + pg_trgm en MVP |
| Object storage | Cloudflare R2 vs S3 | R2 |
| Email | Resend vs Amazon SES | Resend |
| Datos de catálogo | APIs públicas licenciables (Scryfall, Pokémon TCG API, etc.) | Importadores oficiales/públicos; **nunca** scrapear TCGMatch ni copiar su catálogo |
| Facturación SII | Boleta/factura electrónica | Fuera de MVP |
| RUT vendedor | Obligatorio para tiendas | Tiendas sí; personas naturales después |

## Qué no hacemos

- Copiar identidad visual, copy, URLs o catálogo de TCGMatch u otro competidor.
- Soportar todos los TCG en el lanzamiento.
- Integrar 5 couriers, POS, o subastas en el MVP.
- Empezar por pantallas. La web se construye contra la API ya especificada.
- Inventar tablas, DTOs o roles que no estén en estos documentos.

## Relación con TCGMatch (referencia, no plantilla)

TCGMatch hoy cubre marketplace de cartas, catálogo/buscador, vendedores, accesorios, ofertas, subastas, blog y soluciones para tiendas; publicación de cartas (condición, fotos, precio, carga masiva); Mercado Pago; despacho y entrega presencial.

Nosotros cubriremos ese núcleo con arquitectura, UX e identidad propias, y nos diferenciaremos con **scanner → colección, Completar set, precios por ventas reales, wishlist y optimizador de carrito**. Ver [23-PRODUCT-BACKLOG](23-PRODUCT-BACKLOG.md).
