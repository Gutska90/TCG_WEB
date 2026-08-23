# 22 — Glosario

| Término | Significado en este proyecto |
|---------|------------------------------|
| Variante | Combinación carta + idioma + finish. Unidad de precio y de listing single. |
| Listing | Publicación de venta. Un single apunta a una variante. |
| Checkout | Agrupa N órdenes (una por vendedor) y un intento de pago. |
| Order | Contrato comprador–vendedor. Una por seller por compra. Snapshot de comisión M1. |
| Plan de vendedor | Entitlement FREE / PLUS / PRO / STORE. Default FREE. Mensualidad informativa en M1. |
| Comisión TCG Market | `PLATFORM_FEE` sobre subtotal de productos, con cap. Distinta del processor fee. |
| Promo `LAUNCH_3_PERCENT` | Ventana por env: 3% / cap $15.000 para todos los planes. No reescribe Orders viejas. |
| HELD | Cobro MP approved **en la cuenta plataforma**. El seller aún no es liquidable. **No** es retención de Mercado Pago. |
| RELEASED | Orden elegible para `Payout`. `confirm()` no llama a MP. |
| Payout | Única salida real de fondos al vendedor. `PAID` exige `providerRef`. MVP: lote manual (`ManualPayoutProvider`). |
| LedgerEntry | Asiento append-only. Fuente de verdad del saldo seller. Nunca UPDATE. Ver [FINANCIAL-LEDGER](FINANCIAL-LEDGER.md). |
| Conciliación | Comparación MP vs Postgres (10D). Abre issues; **no** mueve dinero. Ver [RECONCILIATION](RECONCILIATION.md). |
| Disputa | Caso de mercancía sobre una `Order`. No mueve dinero. Ver [TRUST-AND-MODERATION](TRUST-AND-MODERATION.md). |
| Report | Denuncia USER/LISTING/IMAGE. No suspende ni oculta solo. |
| SellerSuspension | Historial de bloqueo de vendedor (no borra la cuenta). |
| availableClp | Neto `RELEASED` aún no reservado en un payout activo. |
| pendingClp | Neto `HELD` (capturado, no confirmado). |
| reservedClp | Neto en un payout `PENDING`/`APPROVED`/`PROCESSING`. |
| Plan de vendedor | Entitlement FREE/PLUS/PRO/STORE. Default FREE. Mensualidad informativa en M1; cobro real es M2. |
| Comisión TCG Market | `PLATFORM_FEE` sobre subtotal de productos, con cap. Snapshot en Order. Distinta del processor fee. |
| Promo `LAUNCH_3_PERCENT` | Ventana env: 3% / cap $15.000 para todos los planes. No reescribe Orders viejas. |
| Encuentro / meetup | Entrega presencial coordinada. |
| Escrow operativo | Obligación interna (HELD→Payout). MP no es el escrow. Ver ADR 0008. |
| Compra Protegida | Reglas internas de soporte, moderación y disputas. No es seguro, escrow, garantía financiera ni certificación de autenticidad. |
| TERMS_VERSION / PRIVACY_VERSION | Versión legal vigente en `@tcg/config` (`LEGAL.*`). Se guarda en `User` al aceptar. |
| Favorito | Bookmark de variante. Sin precio objetivo. |
| Wishlist | Cartas que quiero, con precio máximo. Distinto de favorito y de colección. Alerta `WISHLIST_HIT`. |
| Colección | Inventario poseído (privado). Lotes de costo. Ver [COLLECTIONS.md](COLLECTIONS.md). |
| TCG Market Chile | Índice interno de precio por variante (ventas COMPLETED + listings). No es TCGPlayer/Cardmarket/TCGMatch. |
| RBAC | Roles en `UserRole`; políticas centralizadas. |
| API-first | No hay UI de feature sin contrato en `/docs` y endpoint. |
| TCGMatch | Competidor de referencia funcional. No es plantilla de código ni de marca. |

## Identidad visual (provisional, Fase 0 no la necesita)

Hasta marca definitiva:

- No usar rojo/negro/amarillo distintivos de TCGMatch ni su wordmark.
- Dirección: interfaz densa en datos (precios, badges de condición), confianza > gamificación.
- Tab mobile: botón **Escanear** central como firma, aunque sea placeholder.
