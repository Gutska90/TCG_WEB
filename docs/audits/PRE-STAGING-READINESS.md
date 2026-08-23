# Pre-Staging Readiness (PS) — 23 agosto 2026

Auditoría de **repo** mientras faltan dominio, Railway, Neon, R2 y Resend. Complementa [BETA-RELEASE-AUDIT-2026-08.md](BETA-RELEASE-AUDIT-2026-08.md) (B0). No implementa Scanner / Tiendas / Subastas. `ENABLE_REAL_PAYMENTS=false`.

## Dictamen

El código puede operar una **beta interna en localhost** con `pnpm beta:seed`. **No** se puede publicar closed beta externa: los cinco P0 de B0 siguen siendo de **operador**.

| Tipo | Estado |
|------|--------|
| P0 de código (bloquean localhost) | Ninguno conocido tras B2–B4 + PS |
| P0 de publicación | 5 — infra (abajo) |
| P1 de código | Cubiertos en B2–B4 o diferidos a P2 consciente |
| Seed / UI / emails HTML / docs tester | Listos en repo |

Cuando existan las cuentas: pegar secretos, DNS, `prisma migrate deploy`, R2, Resend, `pnpm staging:preflight`. Ver [OPERATOR-KICKOFF](../release/OPERATOR-KICKOFF.md).

## P0 — solo operador (no se “arreglan” en Git)

| ID B0 | Qué falta |
|-------|-----------|
| B0-DEP-01 | Hosting, DNS, TLS, Postgres managed |
| B0-STOR-01 | R2/Minio: fotos y evidencia |
| B0-MAIL-01 | Resend/SMTP hacia testers reales |
| B0-AND-01 | EAS project, signing, API HTTPS |
| B0-IOS-01 | Cuenta Apple, TestFlight, URLs reales |

## Lo cerrado en repo (PS)

| Área | Evidencia |
|------|-----------|
| UI/UX | UI.1 + header TCG MARKET, tema, home, skeletons, 404/500, offline, `loginHref` + `reason=expired`, anti doble-submit checkout |
| Seed vitrina | `seedShowcase` en `beta:seed`: 4 juegos (Yu-Gi-Oh **solo demo**), 3 sellers ficticios, listings, `LISTING_MIN` ~14 días, colección/wishlist buyer. `SHOWCASE_COLLECTION_SIZE` para volumen local |
| Emails | HTML en `apps/api/src/mail/mail.templates.ts`; `MailMessage.html` opcional. Sin provider = log |
| Índices | Listing `(status, priceClp)` ya en Prisma; sin migración nueva. Script `pnpm db:explain` |
| Collection N+1 | `listSetProgress`: 1 query de cartas del set + 1 de listings ACTIVE (no 2N). `SHOWCASE_COLLECTION_SIZE` para volumen local |
| Mobile prep | `apps/mobile/app.config.ts`: `cl.tcgplatform.app`, scheme `tcgplatform`, splash `#171717`. Sin abrir Expo |
| Branding | `BrandMark` + `apps/web/app/icon.svg` |
| Testers | [TESTER-GUIDE](../release/TESTER-GUIDE.md), [QA-MANUAL](../release/QA-MANUAL.md) |

## Seguridad / dinero (no reabrir)

IDOR 404 en recursos ajenos, RBAC, JWT fail-closed, stock con lock, refund/payout/disputa como en B0–B4. Uploads siguen `deferred` hasta B0-STOR-01. Checkout qty=1 concurrente cubierto por tests de API.

## Performance local

Medir con API local + seed (y opcional `SHOWCASE_COLLECTION_SIZE=1000` o `5000`):

- `/buscar`, ficha, colección, historial de precios, wishlist, checkout concurrente.
- `pnpm db:explain` (necesita `DATABASE_URL`).
- `pnpm test:load` (B3; checkout off salvo `LOAD_CHECKOUT=1`).

No hace falta internet para ver seq scans o N+1.

## Fuera de PS

Scanner, Stores, Auctions. Pagos live. Payouts automáticos. Invitar testers (B8). Builds EAS (B6/B7).
