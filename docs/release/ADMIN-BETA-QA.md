# Admin beta QA — B4

Panel `apps/admin` (puerto **3002** local). No comparte cookie con la web. Login `/admin/ingresar`. Cuentas: `admin.beta@example.test` / `BetaPassw0rd!`.

`ENABLE_REAL_PAYMENTS=false`. Payouts **manuales**: no hay transferencia bancaria. Cancelar/resolver disputa no mueve dinero. HELD/RELEASED son estados internos, no escrow de Mercado Pago.

Si el host admin es público: `ADMIN_IP_ALLOWLIST` (B2). Vacío = sin filtro (solo local).

## Dashboard

- [ ] Tras ingresar, heading **Operación** y KPIs (usuarios, listings, GMV, refunds, payouts).
- [ ] Zona `America/Santiago`. Copy: códigos HELD/RELEASED no son escrow MP.

## Órdenes / refunds

- [ ] Listar órdenes y abrir detalle (buyer/seller email, ítems, pago sin `rawPayload`).
- [ ] Cancelar `PAID` con motivo (≥3): crea/ejecuta refund. Si el proveedor falla, refund **Fallido** y la orden no pasa a REFUNDED.
- [ ] Detalle de refund FAILED: **Reintentar refund** (sin `amountClp` en el body). Tras éxito, el botón desaparece (COMPLETED).
- [ ] COMPLETED no muestra retry.

E2E: `e2e/admin-refund-retry.spec.ts` usa el fixture `QA_B4_REFUND_RETRY` (listing Test Mon #2, no la carta de compra).

## Payouts (sandbox)

- [ ] Crear payout con Seller ID (y Order IDs opcionales). El monto lo calcula el servidor.
- [ ] Aprobar → Marcar en proceso → Marcar PAID con `providerRef` (comprobante externo).
- [ ] Copy: no transfiere dinero.
- [ ] Saldo seller `/admin/sellers/:id/balance`.

E2E: `e2e/admin-payout-path.spec.ts` (venta meetup hasta COMPLETED, luego el flujo manual).

## Trust

- [ ] `/admin/disputes`: listar, mensajes, resolver **sin** mover dinero.
- [ ] Reportes y moderación. Suspender seller es ADMIN/SUPER_ADMIN.

## Jobs / housekeeping

Playwright deja `JOBS_ENABLED=false` (evita flakiness). En staging el operador deja `JOBS_ENABLED=true` para `expire-checkouts` cada 60s.

Local sucio: `pnpm beta:seed` expira checkouts vencidos y restockea Test Mon #1 si available < 8.

## Automatizado

```bash
pnpm test:e2e
```

Specs: `e2e/admin-ops-path.spec.ts`, `e2e/admin-refund-retry.spec.ts`, `e2e/admin-payout-path.spec.ts`.
