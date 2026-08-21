# 22 — Glosario

| Término | Significado en este proyecto |
|---------|------------------------------|
| Variante | Combinación carta + idioma + finish. Unidad de precio y de listing single. |
| Listing | Publicación de venta. Un single apunta a una variante. |
| Checkout | Agrupa N órdenes (una por vendedor) y un intento de pago. |
| Order | Contrato comprador–vendedor. Una por seller por compra. |
| HELD | Pago aprobado en MP, aún no liberado al vendedor. |
| RELEASED | Plata ya elegible para payout al vendedor. |
| GMV | Suma de `Order.subtotalClp` (productos) en un período; no incluye envío salvo que se documente lo contrario. Default: **solo productos**. |
| Encuentro / meetup | Entrega presencial coordinada. |
| Escrow operativo | Retención en cuenta plataforma (Opción A), no necesariamente producto MP Marketplace. |
| Favorito | Bookmark. |
| Wishlist | Bookmark + precio objetivo + alerta. |
| Colección | Inventario poseído valorizado. |
| RBAC | Roles en `UserRole`; políticas centralizadas. |
| API-first | No hay UI de feature sin contrato en `/docs` y endpoint. |
| TCGMatch | Competidor de referencia funcional. No es plantilla de código ni de marca. |

## Identidad visual (provisional, Fase 0 no la necesita)

Hasta marca definitiva:

- No usar rojo/negro/amarillo distintivos de TCGMatch ni su wordmark.
- Dirección: interfaz densa en datos (precios, badges de condición), confianza > gamificación.
- Tab mobile: botón **Escanear** central como firma, aunque sea placeholder.
