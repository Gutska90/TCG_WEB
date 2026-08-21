# 12 — Seguridad

## Amenazas relevantes

| Amenaza | Mitigación |
|---------|------------|
| Listings falsos / fotos de Google | Fotos propias, reportes, reputación, eventual KYC tiendas |
| Impago / no envío | Escrow, disputas, bans |
| Account takeover | argon2id, rate limit, rotación refresh, más adelante MFA |
| IDOR | Guards de ownership en cada mutación |
| Inflar precios / wash trading | Más adelante; no prioridad MVP |
| Webhook spoofing | Firma MP, idempotencia |
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
