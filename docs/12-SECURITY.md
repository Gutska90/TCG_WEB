# 12 — Seguridad

## Amenazas relevantes

| Amenaza | Mitigación |
|---------|------------|
| Listings falsos / fotos de Google | Fotos propias, reportes, reputación, eventual KYC tiendas |
| Impago / no envío | Pago en cuenta plataforma + disputas + bans. No escrow de Mercado Pago. |
| Account takeover | argon2id, rate limit, rotación refresh, linking explícito, no fusión silenciosa |
| OAuth spoof | ID/identity token validado server-side (aud/iss/exp/firma). No se confía email del cliente. Redirect allowlist. |
| IDOR | Guards de ownership en cada mutación |
| Inflar precios / wash trading | Más adelante; no prioridad MVP |
| Webhook spoofing | Firma MP fail-closed + ventana `ts` 5 min + `WebhookEvent` unique |
| Subida de malware | MIME allowlist, tamaño máx, virus scan futuro |
| XSS | React default + sanitizar markdown si hay |
| CSRF | cookies SameSite + no cookies de access (Bearer). Mutaciones admin 10B: 20 req/min |
| Secretos en repo | `.env` gitignored, no logs de tokens |

## Autorización

Ver [05-AUTH](05-AUTH.md). Toda ruta no pública: JWT + roles + ownership. Tests de IDOR en órdenes y listings ajenos.

## Datos personales

- Email, teléfono, direcciones: acceso dueño + admin.
- Perfil público: displayName, avatar, comuna opcional, reputación, no dirección exacta.
- Derecho de acceso/corrección: `GET/PATCH /v1/me`. Baja: `POST /v1/me/deletion-request` desactiva (`deletedAt`); **no** borra Order, Payment, Refund, Ledger ni AuditLog. Ver [LEGAL-BETA.md](LEGAL-BETA.md).

## Finanzas

- `AuditLog` obligatorio: login fail masivo no; sí: onboard seller, listing price change opcional, **toda** transición de Order/Payment/Payout/Refund.
- Admins no “editan el saldo”; usan acciones de dominio (`refund.retry`, `order.cancel`, y en 10C `payout.approve` / `payout.mark-paid`). Ledger append-only (10C).
- Mutaciones admin 10B/10C: `AuditLog` `admin.order.cancel` / `admin.refund.retry` / `payout.created|approved|processing|paid|failed|cancelled` / `ledger.adjustment` con actor, reason, before/after, `sellerId`, `amountClp`, `providerRef` cuando aplica. No auditar GET. El controller no habla con bancos ni MP para payouts; solo `ManualPayoutProvider`.
- Conciliación 10D: ADMIN/SUPER_ADMIN; run 5 req/min; `recon.run.*` / `recon.issue.*`. Sin `rawPayload` ni `MP_ACCESS_TOKEN` en logs. Error de proveedor → run `FAILED`.
- Trust 10.5: ownership 404; notas internas ocultas; files de evidencia con MIME/tamaño/cantidad; rate limit de reports; texto sanitizado; parties no ven emails ajenos ni AuditLog completo; resolver disputa solo staff. MODERATOR no hereda endpoints financieros.
- 10.6 evidencia: `GET /v1/disputes/:id/evidence/:evidenceId/file` solo party o staff (IDOR → 404). Nunca bucket público.
- Helmet, CORS allowlist (nunca `*`), body 256 KiB, timeout 30s, shutdown hooks. Production/staging fail-fast si falta `DATABASE_URL`, CORS `*`, JWT inválido, o un provider OAuth habilitado sin client IDs.
- Logs JSON con `X-Request-Id`; redaction de password/JWT/MP tokens/Authorization/idToken/identityToken/refresh. `ERROR_TRACKING_ENABLED=false` por defecto.
- `ADJUSTMENT` del ledger: solo `SUPER_ADMIN`. Nunca PATCH/DELETE `/ledger`.
- Body de payout: no se acepta `amountClp` ni `commissionClp` calculados en UI.
- Mutaciones admin 10B/10C: 20 req/min. Run de conciliación: 5 req/min.
- `HELD`/`RELEASED` no son estados de Mercado Pago. Ver [07-PAYMENTS](07-PAYMENTS.md) y [ADR 0008](adr/0008-marketplace-payment-model.md).
- **Production gate:** no `MP_ACCESS_TOKEN` live sin validación contractual/legal del modelo Opción A.
- Transiciones de checkout/pago/stock: transacción Postgres + `SELECT … FOR UPDATE` en orden fijo (checkout → orders → listings). Ver [07-PAYMENTS](07-PAYMENTS.md).
- Un `approved` de Mercado Pago sobre checkout `EXPIRED`/`CANCELLED` no se ignora: se registra el cobro, no hay fulfillment, se audita `HIGH_PRIORITY` y se ejecuta refund real contra MP (P0-3). Si el proveedor falla, `Refund FAILED` y Order no se marca `REFUNDED`.
- Webhook: unique + lock de fila. Sin `Date.now()` como id de evento.
- Firma webhook: si hay `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` y HMAC son obligatorios en cualquier entorno. Sin token MP, el endpoint público no acepta eventos (usar `simulate` en local).
- Replay: `ts` entra en el HMAC (integración MP). Además la plataforma rechaza `|now - ts| > 300s`. `WebhookEvent UNIQUE(provider, providerEventId)` bloquea reentregas del mismo evento.
- `MercadoPagoPaymentProvider` **no** inventa `approved` si falta `MP_ACCESS_TOKEN`: falla cerrado. Tests usan `FakePaymentProvider`. Local sin token usa `LocalPaymentProvider` (nunca en production).
- `JWT_ACCESS_SECRET` sin fallback ni placeholders; el API no arranca si falta.
- Auth 11.5: ver [AUTH-IDENTITY-AND-SESSIONS.md](AUTH-IDENTITY-AND-SESSIONS.md). No refresh en localStorage. Mobile: SecureStore. `AUTH_STUB_OAUTH` prohibido en production.
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
