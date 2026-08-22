# ADR 0008 — Modelo de cobro del marketplace (Chile)

**Estado:** aceptado (provisional)  
**Fecha:** 20 agosto 2026  
**Fase:** 9.6

Números 0001–0007 reservados para decisiones anteriores al directorio `docs/adr/`.

---

## Context

El carrito crea **N `Order` (una por vendedor)** y el comprador espera **un solo pago**.

Mercado Pago Chile documenta Split **1:1** self-service (OAuth del vendedor + `marketplace_fee`). Split **1:N** (varios collectors en un pago) está restringido a cartera comercial.

En Split 1:1 el dinero se divide entre **ese** vendedor y el marketplace en el `approved`. No hay split arbitrario multivendedor. El refund se prorratea; un refund total puede fallar si el vendedor no tiene saldo.

El código actual (Fase 7 + 9.5) cobra con `MP_ACCESS_TOKEN` de plataforma, una preference por `Checkout`, y marca `Payment.HELD` sin llamar a un release de MP.

La API de MP **permite** cobrar todo en la cuenta plataforma. Eso **no** implica que el contrato comercial o la regulación chilena lo autoricen.

---

## Decision

Para el MVP Chile:

- Un pago Mercado Pago por `Checkout` (también si hay N vendedores).
- Collector = cuenta Mercado Pago de la **plataforma**.
- N `Order` internas; ledger interno; `Payout` posterior.
- No Split 1:1. No OAuth por vendedor. No `marketplace_fee`.
- `HELD` / `RELEASED` son estados **internos**. MP no actúa como escrow.
- Payouts del primer MVP: **manuales** (Admin aprueba, transfiere, registra `providerRef`).
- **Production gate:** no pagos reales hasta validación contractual/legal/comercial por escrito.

Detalle de semántica: [07-PAYMENTS](../07-PAYMENTS.md). Análisis: [proposals/MP-MARKETPLACE-ARCHITECTURE.md](../proposals/MP-MARKETPLACE-ARCHITECTURE.md). Admin/dinero: [proposals/FASE-10-ADMIN-MONEY.md](../proposals/FASE-10-ADMIN-MONEY.md).

---

## Alternatives

| | Qué | Por qué no (MVP) |
|--|-----|------------------|
| Split 1:1 + N preferences | Un cobro MP por seller | UX de N pantallas; dinero al seller en `approved`; refund frágil |
| Split 1:1 orquestado (pagos en serie) | Un checkout lógico | Órdenes a medias; mismo problema de escrow |
| Split 1:N | Un pago, N collectors | No self-service en Chile |
| Seguir Opción A | Collector plataforma + payout | **Elegida** para producto/UX; pendiente gate legal |

---

## Consequences

**Positivo**

- Un `initPoint`, carrito multivendedor intacto.
- Pago protegido implementable: el seller no cobra en el webhook.
- Refunds salen de la cuenta plataforma (si el dinero sigue ahí).
- Código 9.5 (locks, pago tardío) se conserva.

**Negativo / riesgo**

- La plataforma custodia fondos de terceros. Riesgo contractual, CMF, SII, bloqueo de cuenta MP.
- Chargebacks caen sobre nuestra cuenta.
- Sin Fase 10C el sistema cobraba y **no liquidaba**. 10C entregó ledger + payouts **manuales**; aún no hay conciliación MP (10D) ni transferencias automáticas.
- Copy “Mercado Pago retiene” sería falso.

**Seguimiento**

- Reabrir Split solo si legal prohíbe retener fondos, o MP ofrece 1:N / retención negociada.
- Implementar 10A→10D antes de Mobile.

---

## Production Gate

No poner `MP_ACCESS_TOKEN` de **producción** ni Checkout Pro live hasta tener por escrito:

1. Si Mercado Pago permite este modelo de marketplace bajo el contrato/cuenta.
2. Si se pueden recibir fondos correspondientes a sellers terceros.
3. Cuánto tiempo se pueden mantener antes del payout.
4. Cómo deben manejarse refunds y chargebacks.
5. Requisitos KYC de vendedores.
6. Obligaciones tributarias y tratamiento de comisiones.
7. Responsabilidad frente al comprador.
8. Qué ocurre ante bloqueo de la cuenta MP de la plataforma.

Quien habilita live firma (issue/checklist) `production-gate-mp-option-a`. Además, el proceso de la API en `NODE_ENV=production` con `ENABLE_REAL_PAYMENTS=true` exige `REAL_PAYMENTS_LEGAL_APPROVED=true` (no commitear esa marca). El agente **no** considera el gate cerrado porque el sandbox funcione.
