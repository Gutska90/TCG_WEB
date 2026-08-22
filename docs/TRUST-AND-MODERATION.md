# Trust and moderation (Fase 10.5)

Contrato de disputas, reportes, evidencia, revisiones de listing, acciones de moderación y suspensión de vendedor. **No mueve dinero.**

`SupportCase` y chat de soporte **no** están en este incremento.

## Invariantes

- Una disputa **activa** por orden (`OPEN`, `WAITING_BUYER`, `WAITING_SELLER`, `UNDER_REVIEW`).
- Dispute **no** muta Payment, Refund, Ledger ni Payout. Resolver a favor del comprador no ejecuta refund. Resolver a favor del vendedor no libera payout.
- Un Report **no** pausa listings ni suspende sellers. Staff decide con `ModerationAction`.
- `DisputeEvidence`, `ListingRevision` y `ModerationAction` son append-only (el SQL bloquea UPDATE).
- Moderación siempre deja `ModerationAction` + `AuditLog`.
- Seller suspendido no crea listings, no reactiva (`ACTIVE`) ni recibe **payouts nuevos**. Las órdenes pagadas siguen existiendo.
- Suspender **auto-pausa** listings ACTIVE (`LISTING_PAUSED` + `AuditLog`). No cancela ventas. Restore **no** reactiva listings.

## Dispute

Máquina de estados:

```text
OPEN ─┬─► WAITING_BUYER ─┬─► UNDER_REVIEW ─┬─► RESOLVED_BUYER
      ├─► WAITING_SELLER ┘                 ├─► RESOLVED_SELLER
      └─► CANCELLED / RESOLVED_*           └─► CANCELLED
```

Quién abre: comprador **o** vendedor de la orden. Terceros: **404**.

Estados de orden admitidos: `PAID`, `PREPARING`, `SHIPPED`, `READY_FOR_MEETUP`, `DELIVERED`, `CONFIRMED`, `COMPLETED`, `DISPUTED` (si no hay disputa activa). Abrir pasa la orden a `DISPUTED`. Cerrar la disputa **no** cambia el estado de la orden ni el pago (`HELD` se mantiene). Ops usa cancel/refund/confirm aparte. `COMPLETED` está incluido para poder congelar payout (10.6).

Mensajes: API + polling. Notas `isInternalAdminNote` solo staff; buyer/seller no las ven. Texto sanitizado (sin HTML).

Evidencia: `File` existente, purpose `DISPUTE_EVIDENCE`. MIME allowlist, 10 MB, máx. 8 por disputa. Solo dueño del file. Descarga: `GET /v1/disputes/:disputeId/evidence/:evidenceId/file` (buyer, seller o staff). IDOR → 404. Storage deferred no hace el objeto público.

Resolución: solo admin/moderator, con `note` obligatorio. El cliente no puede resolver.

## Report

```text
OPEN → IN_REVIEW → RESOLVED | DISMISSED
OPEN → DISMISSED
```

Targets: `USER`, `LISTING`, `IMAGE` (`targetId` = `fileId` de `ListingImage`).

Anti-spam: 5 reportes / 10 min por usuario; unique parcial mismo reporter+target+reason si `OPEN`/`IN_REVIEW`; no auto-reporte ni reportar listing/imagen propios.

## ListingRevision

Append-only. Snapshot `priceClp`, `condition`, `quantity`, `description`, `status`. Fuentes `SELLER` | `ADMIN` | `SYSTEM`. Sirve a investigación de disputa; nunca se reescribe.

## ModerationAction

Tipos: `LISTING_PAUSED`, `LISTING_RESTORED`, `USER_WARNED`, `SELLER_SUSPENDED`, `SELLER_RESTORED`, `REPORT_RESOLVED`, `DISPUTE_ASSIGNED`, `DISPUTE_RESOLVED`.

Toda acción: fila + `AuditLog` `moderation.*`.

## SellerSuspension

Historial. Activa ⇔ `liftedAt` is null. Una activa por seller.

| Bloquea | No bloquea |
|---------|------------|
| `POST /v1/listings` | órdenes ya pagadas / en curso |
| reactivar listing (`activate` seller o restore admin) | payouts ya `PROCESSING`/`PAID` |
| `POST /v1/admin/payouts` nuevos | — |

## RBAC

| Rol | Disputas/reportes, pause listing | Suspender seller | Dashboard/payouts/ledger/recon/refund |
|-----|----------------------------------|------------------|----------------------------------------|
| USER | no (solo sus entidades) | no | no |
| MODERATOR | sí | no | no |
| ADMIN / SUPER_ADMIN | sí | sí | sí (10A–10D) |

IDOR: entidades ajenas → **404**. Emails de contraparte no van al detalle de usuario. AuditLog completo solo admin. Notas internas ocultas a parties.

## Payout freeze (10.6)

Estados activos: `OPEN | WAITING_BUYER | WAITING_SELLER | UNDER_REVIEW`.

- El asiento `SELLER_PAYABLE` **no se borra**.
- `availableClp` excluye esa obligación (`disputedClp`).
- No entra a un `PayoutItem` nuevo.
- Payout `PENDING`/`APPROVED` que la contiene: se **cancela** (`dispute_opened`) + `PAYOUT_REVERSED`.
- `PROCESSING`: no se toca; alerta admin `payout_processing_disputed`.
- `PAID`: no se revierte.

Al resolver la disputa, la obligación vuelve a `availableClp` si no hay refund ni lock.

## Qué no hace 10.5/10.6

- Corrección automática de conciliación
- Payout automático / live MP
- Compra Protegida como badge de seguro/escrow (10.7 la define solo como reglas internas)
- Chat de soporte / `SupportCase`
- WebSocket
- Freeze de `SELLER_PAYABLE` al abrir disputa (hecho en 10.6 vía elegibilidad, no mutando ledger)
- Auto-pausa de listings al suspender (hecho en 10.6)
