# Propuesta 9.6 — Arquitectura Mercado Pago (Chile)

**Estado:** decisión aceptada (provisional). Canónico corto: [ADR 0008](../adr/0008-marketplace-payment-model.md). Semántica: [07-PAYMENTS](../07-PAYMENTS.md).  
**Fecha:** 20 agosto 2026  
**Alcance:** arquitectura. Prisma y endpoints no se implementan aquí.

Fuentes: [07-PAYMENTS](../07-PAYMENTS.md), código `apps/api/src/payments` + `orders`, `prisma/schema.prisma`, docs Chile Split 1:1 de Mercado Pago (agosto 2026).

---

## Decisión recomendada (MVP Chile)

**Seguir Opción A: una sola cuenta Mercado Pago de la plataforma (collector único) + payout operativo al vendedor después de `RELEASED`.**

No adoptar Split 1:1 (OAuth por vendedor + `marketplace_fee`) para el primer dinero real.

Razones, en orden:

1. El producto exige **pago protegido**: el vendedor no debe poder retirar el dinero en el webhook `approved`. Split 1:1 acredita al vendedor en el cobro; no es escrow.
2. El carrito **ya es multivendedor** y el comprador paga **una** preference. Chile Split público es **1:1** (un collector por pago). 1:N solo existe con ejecutivo comercial de MP.
3. En Split, un refund total **falla** si el vendedor ya no tiene saldo. Cartas caras + C2C hace ese caso frecuente.
4. El código de 9.5A–C (locks, pago tardío, refund idempotente) encaja con un pago por checkout. Split lo parte.

Split 1:1 se **revisita** solo si ocurre una de estas:

- Legal / CMF exige que el dinero no transite por la cuenta de la plataforma.
- MP Chile habilita 1:N o retención de `marketplace_fee` / money release negociada.
- El producto acepta checkout de **un solo vendedor** y copy que **no** diga “retenemos el pago”.

Hasta entonces: **no OAuth vendedor, no `marketplace_fee`, no N preferences.**

Siguiente código: **Fase 10 — Admin**, con payout semi-manual. No hay fase 9.6 de implementación.

---

## 1. Estado actual (código)

Opción A de [07-PAYMENTS](../07-PAYMENTS.md), ya en runtime.

```text
Comprador
    │
    ▼
Checkout Pro (preference)
  Authorization: Bearer MP_ACCESS_TOKEN   ← cuenta PLATAFORMA
  items: [{ title: "Compra TCG Platform", unit_price: checkout.totalClp }]
  external_reference: checkout.id
  marketplace_fee: (no se envía)
    │
    ▼  webhook approved
Checkout PAID
  N Order (una por vendedor) → PAID
  N Payment (1:1 con Order)  → HELD
  mismo providerPaymentId en todas las filas Payment del checkout
    │
    ▼  comprador confirma recepción
Payment RELEASED     ← solo UPDATE en Postgres, cero llamada a MP
    │
    ▼
Payout (tabla existe, ningún service la escribe)
```

Hechos concretos:

| Pieza | Hoy |
|-------|-----|
| Credencial | `MP_ACCESS_TOKEN` global. No hay token por vendedor. |
| Preference | `POST /checkout/preferences`. Un ítem lump-sum = `checkout.totalClp`. |
| Checkout | 1 fila; `mercadoPagoPreferenceId` unique. |
| Order | 1 por vendedor. `commissionClp` = 8% del **subtotal de productos** (no envío), snapshot. |
| Payment | 1 por Order. `amountClp` = `order.totalClp` (productos + envío). |
| Webhook | Firma fail-closed; `WebhookEvent` unique; GET payment en MP; `applyApproved` bajo `FOR UPDATE`. |
| Refund | `POST /v1/payments/{id}/refunds` con `X-Idempotency-Key = refund.id`. Monto del `Payment` persistido. |
| Payout | Modelo Prisma. Cero uso. |
| Seller MP | No hay `mercadoPagoUserId` ni tokens. Publicar no exige cuenta MP. |

Dev: sin token → `LocalPaymentProvider` (nunca `NODE_ENV=production`). Tests: `FakePaymentProvider`.

Esto **no** es Marketplace Split de MP. Es Checkout Pro cobrado a la plataforma.

---

## 2. Modelo Split 1:1 (lo que MP Chile sí ofrece)

Documentación Chile: [Split Payments 1:1](https://www.mercadopago.cl/developers/en/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace).

```text
Vendedor autoriza OAuth (offline_access)
    → access_token + refresh_token + user_id (= collector_id)
Preference / pago se crea con:
    Authorization: Bearer {access_token DEL VENDEDOR}
    marketplace_fee: <CLP entero>     // Checkout Pro
    // o application_fee en Checkout API
MP descuenta:
    1. comisión Mercado Pago (del vendedor)
    2. marketplace_fee (del resto) → cuenta plataforma
Saldo neto → cuenta MP del vendedor (en el approved)
```

Requisitos MP (prerrequisitos Chile):

- App de marketplace en developers MP (redirect URI OAuth).
- Cuenta vendedor MP con KYC (docs: nivel 6).
- Checkout Pro **o** Checkout API. Nosotros ya usamos Pro; no hace falta Checkout API para Split.
- 1:N (varios collectors en un pago): **no** está en el self-serve Chile; solo portafolio asesorado.

Implicación dura: **un pago MP = un vendedor.** Un carrito de 3 vendedores no se convierte en un split mágico.

---

## 3. Cómo guardar OAuth (si algún día hay Split)

No crear ahora. Contrato futuro, para no improvisar secretos.

```text
MercadoPagoSellerConnection    // 1:1 con User vendedor
  userId                         unique
  mercadoPagoUserId              unique   // collector_id
  publicKey                      // del vendedor; no es secreto de cobro
  accessTokenEnc                 // ciphertext
  refreshTokenEnc                // ciphertext
  tokenExpiresAt
  scopes                         String[]  // p.ej. offline_access, write
  status                         DISCONNECTED | ACTIVE | EXPIRED | REVOKED
  lastError                      nullable
  connectedAt, disconnectedAt, lastRefreshedAt
```

Reglas:

- Cifrar `access` y `refresh` con AES-256-GCM y clave `MP_TOKEN_ENCRYPTION_KEY` (o KMS). Nunca plaintext en Postgres, logs ni JWT.
- El cliente **nunca** ve tokens. Solo `status` + `mercadoPagoUserId` enmascarado.
- Refresh en job **antes** de `tokenExpiresAt` (margen 24 h). Si refresh falla → `EXPIRED`.
- Rotar `MP_TOKEN_ENCRYPTION_KEY` con re-encrypt batch; no versionar la clave en git.
- `client_secret` de la app marketplace: solo env de API, igual que `MP_ACCESS_TOKEN`.
- Audit: `seller.mp.connected` / `.revoked` / `.token_refresh_failed`. Sin metadata de tokens.

En Opción A **no hace falta esta tabla.**

---

## 4. `marketplace_fee` y comisión

Hoy:

```text
commissionClp = floor(subtotalClp * 800 / 10000)   // 8%, no envío
Order.totalClp = subtotalClp + shippingClp
Preference.unit_price = suma de totalClp del checkout
MP cobra su fee a la CUENTA PLATAFORMA (nosotros absorbemos, per 07)
```

Bajo Split 1:1:

```text
Preference se crea con token del vendedor
unit_price     = order.totalClp          // esa orden sola
marketplace_fee = order.commissionClp    // CLP entero, no %
Seller neto    = total - fee_MP - marketplace_fee
Fee MP lo paga el VENDEDOR, no la plataforma
```

El default “8% incluye cubrir fee MP” de [07-PAYMENTS](../07-PAYMENTS.md) **deja de ser cierto** en Split: el vendedor paga fee MP **más** 8%. Habría que bajar `commissionBps` o mostrar ambos fees en onboarding. No mezclar envío en `marketplace_fee`.

En Opción A recomendada: **no enviar `marketplace_fee`**. La comisión es interna: `Order.commissionClp` se resta al armar el `Payout`.

```text
payoutClp = order.totalClp - order.commissionClp
          = subtotal + envío - 8%·subtotal
```

El envío se transfiere al vendedor (él paga el courier). Revisar con contador antes de prod.

---

## 5. Checkout un vendedor

Opción A (recomendado): igual que hoy. 1 Order, 1 Payment, 1 preference, 1 cobro.

Split 1:1: 1 Order, preference con token de ese vendedor + `marketplace_fee`. UX casi igual (un redirect a MP). La diferencia es **quién recibe el dinero en `approved`**.

---

## 6. Checkout multivendedor — alternativas A / B / C

El dominio interno no cambia: **1 Checkout, N Order**. Cambia cómo se cobra en MP.

### A — Un pago global y “distribuir”

Dos lecturas distintas:

| | A1. Collector plataforma (hoy) | A2. Split 1:N MP |
|--|-------------------------------|------------------|
| Qué es | Un preference, plata a la plataforma, N Payment internos | Un pago MP partido a N collectors |
| Chile self-serve | **Sí** | **No** (solo 1:N comercial) |
| Escrow | Sí (plata en nuestra cuenta) | Depende del producto 1:N (no asumir) |

A1 es el código actual. A2 **no** es una opción de implementación ahora.

### B — Una preference / un pago por vendedor

Cada `Order` tiene su preference (token del seller + `marketplace_fee`). N redirects a Checkout Pro.

### C — Checkout lógico único + pagos consecutivos

La UI es un solo “Pagar”. El backend ejecuta B en serie: paga vendedor 1, si `approved` sigue al 2, etc.

C no es un producto MP; es orquestación nuestra sobre B.

### Comparación

| Criterio | A1 plataforma | B N preferences | C orquestado |
|----------|---------------|-----------------|--------------|
| **UX** | Un pago. Mejor. | N pantallas MP. Abandono alto. | Parece un pago; si falla el 2º, carrito a medias. |
| **Complejidad** | Ya está (9.5). | OAuth, tokens, N webhooks, N ids. | B + máquina de estados parcial. |
| **Seguridad / escrow** | Plataforma retiene. Pago protegido real. | Dinero al seller en cada `approved`. | Igual que B, peor: mix PAID/PENDING. |
| **Refunds** | Un `providerPaymentId`; reembolso parcial por orden = `amountClp` de esa fila. | Refund por pago/seller. Falla si el seller no tiene saldo. | Refunds parciales del lote + órdenes no cobradas a cancelar. |
| **Conciliación** | Un cobro MP vs N Payment (mismo id). Tratar el pago MP como padre. | 1:1 Order↔pago MP. Más limpio. | Igual B + checkout “parcialmente pagado”. |
| **Implementación** | Preference lump-sum; `applyApproved` marca N órdenes. | `Order.mercadoPagoPreferenceId`; token por seller; no compartir `providerPaymentId`. | B + `Checkout.status` nuevos (`PARTIALLY_PAID`). |
| **Schema** | Casi nulo. Falta uso de `Payout`. Opcional: `Payment.providerPaymentId` no unique (hoy se duplica). | `MercadoPagoSellerConnection`; preference por orden; estados OAuth. | Eso + estados de checkout parcial. |
| **API** | Sin cambio de contrato. Admin payout. | OAuth connect/callback; listing exige conexión ACTIVE. | Idempotency por paso; poll por orden. |
| **Web/mobile** | `/checkout` + un `initPoint`. | N CTAs o wizard. | Wizard automático; copy de “pago 2 de 3”. |

**A2 (1:N)** se descarta para MVP: no está en la API pública Chile.

**B y C se descartan para MVP** porque rompen escrow y el pago único. C además introduce órdenes pagadas y no pagadas en el mismo carrito (stock, envíos, disputas).

---

## 7. `HELD` / `RELEASED` / `Payout` — qué son de verdad

| Campo | ¿Dinero en Mercado Pago? | ¿Qué es? |
|-------|--------------------------|----------|
| `PaymentStatus.PENDING` | Aún no hay cobro (o preference abierta) | Espejo débil de MP |
| `APPROVED` | En código casi no se usa como estado estable post-webhook | El webhook `approved` escribe **`HELD`**, no `APPROVED` |
| `REJECTED` | MP rechazó / canceló | Sí, espejo |
| **`HELD`** | **No.** MP ya acreditó a la **plataforma** (Opción A). | Candado **interno** de fulfillment: “no pagar al vendedor” |
| **`RELEASED`** | **No.** No hay API MP de “release” en este flujo. | Candado interno: “elegible para Payout”. El UPDATE es solo Postgres |
| `REFUNDED` | Sí, si `Refund.COMPLETED` + `providerRefundId` | Espejo tras refund MP |
| **`Payout`** | **Sí, cuando exista el service.** | Única fila que representa **plata saliendo** de la plataforma al vendedor (transferencia / MP payout / lote) |

`confirm()` hoy:

```text
Payment HELD → RELEASED
Order DELIVERED → COMPLETED
```

Cero HTTP a Mercado Pago. Por eso **no** hay escrow de proveedor. Hay escrow operativo: el dinero está en la cuenta MP de la plataforma hasta que un humano/job ejecute `Payout`.

### Modelo conceptual corregido (sin tocar Prisma ahora)

No renombrar enums en esta fase (rompe poco, documenta mucho). Semántica cerrada:

```text
Payment.status
  HELD      = cobro MP aprobado a la plataforma; vendedor NO cobrado
  RELEASED  = comprador confirmó (o auto-confirm); aún NO implica transferencia
  REFUNDED  = MP devolvió al comprador

Payout.status
  PENDING   = lote creado, no transferido
  PAID      = proveedor de payout confirmó (providerRef)
  FAILED    = reintentar
```

Copy de producto:

- Correcto: “El pago queda retenido en la plataforma hasta que confirmes la recepción.”
- Incorrecto: “Mercado Pago retiene el dinero en split” / “el vendedor ya cobró.”

Si en el futuro hubiera Split 1:1, **HELD dejaría de significar retención de fondos**. Habría que partir el enum (estado proveedor vs estado de disputa) o dejar de usar HELD. Eso es otra decisión; no mezclarlo en el MVP.

Hueco operativo actual (audit 9.5): **`RELEASED` no crea `Payout`.** Sin Fase 10, el marketplace cobra y no liquida. Eso es el riesgo P1 de producción, no Split.

---

## 8. Refund en split (referencia; no MVP)

Docs MP 1:1: el refund se prorratea entre vendedor y marketplace. Si el vendedor no tiene saldo, la plataforma **solo** puede devolver su parte (`marketplace_fee`); el resto es deuda del vendedor “por otros medios”.

Para TCG ( collages de alto valor, vendedores persona natural) eso es inaceptable como único camino.

En Opción A: el refund sale de **nuestra** cuenta MP (el cobro original). El vendedor aún no tenía el dinero si el Payment seguía `HELD`. Si ya hubo `Payout PAID`, el refund al comprador es de la plataforma y el vendedor queda a deber (clawback interno + no payout futuros). Esa regla hay que escribirla en términos y en Admin.

Refund parcial multivendedor **hoy** (A1): mismo `providerPaymentId`, `Refund.amountClp = Payment.amountClp` de **esa** orden. Es un refund parcial del cobro padre. Hay que implementar el service de cancelación PAID para no reembolsar de más si dos órdenes del mismo checkout se cancelan a la vez (suma de parciales ≤ monto MP). Los locks 9.5A ya serializan el grafo.

---

## 9–12. Conexión MP del vendedor

Bajo **Opción A (MVP)** estos casos **no aplican** al cobro:

| Pregunta | Opción A | Split 1:1 (rechazado MVP) |
|----------|----------|---------------------------|
| 9. Seller desconecta MP | No hay conexión. Listings siguen. Payout usa datos bancarios/MP de onboarding futuro. | `REVOKED`. Pausar listings. Órdenes PAID ya cobradas no se deshacen. |
| 10. Token expira / OAuth revocado | N/A. Solo `MP_ACCESS_TOKEN` de plataforma. Si ese expira, **todo** el checkout muere (alerta ops). | `EXPIRED`; refresh; si falla, no crear preference; pausar ACTIVE. |
| 11. Vendedor sin MP | Puede publicar. El comprador paga a la plataforma. | No publicar / no checkout. Onboarding seller exige OAuth ACTIVE. |
| 12. Listings si pierde conexión | Sin efecto. | Auto-`PAUSED` con motivo `mp_disconnected`. No cancelar PAID. Checkout PENDING de ese seller: expirar y no cobrar. |

Para Opción A, el onboarding vendedor sigue siendo dirección + términos. **Cuenta MP del vendedor no es requisito de listing.** Datos de liquidación (RUT, banco o alias MP) sí serán requisito de **Payout** en Fase 10 — distinto de OAuth Split.

---

## 13. Webhooks

Hoy (mantener):

- `POST /v1/webhooks/mercadopago`, HMAC + ventana `ts` 300s.
- Resolver checkout por `external_reference` (= `checkout.id`) o `preference_id`.
- `approved` → grafo a `HELD`/`PAID`. Nunca `RELEASED`.
- `approved` tarde (`EXPIRED`/`CANCELLED`) → Payment registro + Refund real.
- `refunded` post-PAID → sync idempotente.

Si hubiera Split B:

- `external_reference` debería ser **`order.id`**, no checkout.
- Un webhook no puede marcar N órdenes.
- La firma sigue siendo de **nuestra** app; el GET `/v1/payments/:id` usaría el token del **collector** (seller) o el de la app según MP. Confirmar con sandbox antes de diseñar. No asumir que el token de plataforma lee pagos de otro collector.

Opción A: no cambiar el contrato del webhook.

---

## 14. Idempotencia

Ya cerrado en 9.5 y se conserva:

| Superficie | Mecanismo |
|------------|-----------|
| Checkout | `Idempotency-Key` + unique `(buyerId, idempotencyKey)` |
| Preference | Reusar `checkout.mercadoPagoPreferenceId` |
| Webhook | `UNIQUE(provider, providerEventId)` + `FOR UPDATE` |
| `applyApproved` | Checkout ya `PAID` → no-op |
| Refund | `refund.id` como `X-Idempotency-Key`; `providerRefundId` unique |

B/C añadirían idempotencia **por orden** al crear preference. No hace falta en MVP.

---

## 15. Conciliación diaria

Objetivo: cada peso en MP tiene fila, y viceversa.

Opción A:

```text
1. Export / API search de payments de la cuenta PLATAFORMA (día T)
2. Join Payment.providerPaymentId
   - MP approved sin fila → alerta (webhook perdido; GET y apply o refund)
   - Fila HELD/RELEASED sin MP → alerta (dato huérfano)
3. Suma Payment.amountClp por providerPaymentId = transaction_amount MP
   (N filas internas, 1 cobro)
4. Refunds COMPLETED vs /v1/payments/{id}/refunds
5. Payout PAID vs transferencias del día (banco o MP)
6. Alertas: payment_failed, refund_failed, webhook_invalid, payout_unmatched
```

Hasta Fase 10 el paso 5 es planilla. El paso 1–4 puede ser un comando admin o job; no es Split.

No usar el return URL del browser para conciliar.

---

## 16. Riesgos legales / operativos a confirmar **antes** de producción

Humanos (negocio + abogado + contador). El software no los cierra.

1. **Intermediación de fondos.** Opción A = la plataforma es merchant of record ante MP y retiene saldos de terceros. Confirmar: términos de MP Chile para no-split, CMF, SII, si hace falta giro de “pago por cuenta de terceros” o cuenta segregada.
2. **Contrato comprador/vendedor.** Quién factura, quién es responsable de la carta, plazos de liberación (hoy 7 días post-`DELIVERED` en spec), encuentros presenciales.
3. **Payout KYC.** RUT, titularidad, banco. Sin esto no hay liquidación legal aunque el código marque `RELEASED`.
4. **IVA / comisión.** `commissionClp` es bruto interno. El software no emite boleta.
5. **Chargebacks MP.** La disputa la gana/pierde la **cuenta plataforma**. Dinero puede salir de MP después de `RELEASED`/`Payout`. Necesitamos cola admin (Fase 10 / 10.5).
6. **Copy “pago protegido”.** Solo es verdad mientras no hagamos Split y mientras no paguemos al vendedor en `approved`.
7. **Fee MP real en CLP.** Recalcular si 8% cubre MP + margen. Hoy es un default.
8. **Multivendedor + un `providerPaymentId`.** Refund parcial debe estar cubierto por tests de integración (suma ≤ cobro padre).
9. **No hay job de auto-confirm** ni de expire checkout en producción más allá de lo que el request dispara. Fase 10 / jobs.
10. **Contacto comercial MP** si en el futuro se quiere 1:N o fecha de liberación de comisión. No bloquear MVP.

Si legal **prohíbe** retener el dinero: no improvisar Split en un sprint. Reabrir 9.6, restringir carrito a **un vendedor**, y aceptar que HELD deja de ser escrow. Eso **sí** sería un cambio de fases (documentar antes).

---

## Impacto si se acepta esta propuesta

| Doc / código | Qué |
|--------------|-----|
| Este archivo | Decisión. |
| `07-PAYMENTS` | Alinear en el cambio que acepte la propuesta: Opción B Split **no** es el MVP. HELD/RELEASED = internos. Payout = dinero real al seller. |
| Prisma | **No** `MercadoPagoSellerConnection`. Usar `Payout` en Fase 10. |
| API | **No** `/v1/me/mercadopago/connect`. Admin payout en Fase 10. |
| Web | Un `initPoint`. Onboarding seller **sin** “conecta Mercado Pago”. |
| Roadmap | 9.6 cierra como decisión. Siguiente: Fase 10. Sin fase de implementación Split. |

---

## Resumen ejecutivo

Chile no nos da un split multivendedor con escrow. El código ya cobra bien a una cuenta y retiene por estados internos. El agujero para dinero real no es OAuth: es **liquidar al vendedor (`Payout`) con Admin, conciliación y textos legales**.

**Arquitectura MVP Chile: Opción A (collector plataforma, 1 preference por checkout, HELD interno, Payout post-RELEASED).**
