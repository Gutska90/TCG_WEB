# 12 — Seguridad

## Amenazas relevantes

| Amenaza | Mitigación |
|---------|------------|
| Listings falsos / fotos de Google | Fotos propias, reportes, reputación, eventual KYC tiendas |
| Impago / no envío | Escrow, disputas, bans |
| Account takeover | argon2id, rate limit, rotación refresh, más adelante MFA |
| IDOR | Guards de ownership en cada mutación |
| Inflar precios / wash trading | Más adelante; no prioridad MVP |
| Webhook spoofing | Firma MP fail-closed + ventana `ts` 5 min + `WebhookEvent` unique |
| Subida de malware | MIME allowlist, tamaño máx, virus scan futuro |
| XSS | React default + sanitizar markdown si hay |
| CSRF | cookies SameSite + no cookies de access |
| Secretos en repo | `.env` gitignored, no logs de tokens |

## Autorización

Ver [05-AUTH](05-AUTH.md). Toda ruta no pública: JWT + roles + ownership. Tests de IDOR en órdenes y listings ajenos.

## Datos personales

- Email, teléfono, direcciones: acceso dueño + admin.
- Perfil público: displayName, avatar, comuna opcional, reputación, no dirección exacta.
- Derecho de acceso/borrado: endpoint admin/proceso manual en MVP; diseñar `deletedAt` en User.

## Finanzas

- `AuditLog` obligatorio: login fail masivo no; sí: onboard seller, listing price change opcional, **toda** transición de Order/Payment/Payout/Refund.
- Admins no “editan el saldo”; usan acciones de dominio (`release_payment`, `refund`).
- Transiciones de checkout/pago/stock: transacción Postgres + `SELECT … FOR UPDATE` en orden fijo (checkout → orders → listings). Ver [07-PAYMENTS](07-PAYMENTS.md).
- Un `approved` de Mercado Pago sobre checkout `EXPIRED`/`CANCELLED` no se ignora: se registra el cobro, no hay fulfillment, se audita `HIGH_PRIORITY` y se ejecuta refund real contra MP (P0-3). Si el proveedor falla, `Refund FAILED` y Order no se marca `REFUNDED`.
- Webhook: unique + lock de fila. Sin `Date.now()` como id de evento.
- Firma webhook: si hay `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` y HMAC son obligatorios en cualquier entorno. Sin token MP, el endpoint público no acepta eventos (usar `simulate` en local).
- Replay: `ts` entra en el HMAC (integración MP). Además la plataforma rechaza `|now - ts| > 300s`. `WebhookEvent UNIQUE(provider, providerEventId)` bloquea reentregas del mismo evento.
- `MercadoPagoPaymentProvider` **no** inventa `approved` si falta `MP_ACCESS_TOKEN`: falla cerrado. Tests usan `FakePaymentProvider`. Local sin token usa `LocalPaymentProvider` (nunca en production).
- `JWT_ACCESS_SECRET` sin fallback ni placeholders; el API no arranca si falta.
- Refund: idempotente (`providerRefundId` unique + `X-Idempotency-Key`). Nunca confiar en `amountClp` del cliente.

## Headers y API

- Helmet en Nest.
- CORS allowlist de web, admin, esquema Expo.
- Payload máximo limitado.
- No `any` para saltear validación.

## Dependencias

- Lockfile committed.
- `pnpm audit` en CI.
- No commitear `.env`, credenciales, dumps.

## Catálogo y copyright

Importadores atribuyen fuente. Imágenes de cartas: respetar términos de cada API/publisher. Si no hay derecho de redistribución, usar thumbnails según licencia o imagen placeholder + link.

## Legal producto (humano, no el agente)

Términos, privacidad, políticas de reembolso y encuentro presencial los redacta el negocio antes de producción. El software debe enlazarlos en registro y checkout.
