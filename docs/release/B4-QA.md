# B4 — QA

Checklists sobre **staging** (si el operador ya publicó B1) o **localhost**. Feature freeze: sin Scanner, pagos live ni payouts automáticos.

| Superficie | Doc | Gate |
|------------|-----|------|
| Web | [WEB-BETA-QA.md](WEB-BETA-QA.md) | `pnpm test:e2e` (Playwright, CI) |
| Admin | [ADMIN-BETA-QA.md](ADMIN-BETA-QA.md) | mismos Playwright (`admin-*-path`) |
| Mobile | [MOBILE-BETA-QA.md](MOBILE-BETA-QA.md) | checklist humana + Maestro **opcional** (`pnpm test:maestro`) |

## Qué cierra B4 (código)

- Checklists F12–14 (colección, precios, wishlist) y notificaciones **in-app** (push diferido).
- Playwright admin: dashboard, retry de refund FAILED, payout manual hasta PAID.
- Seed: restock si available < 8; expira checkouts vencidos (B0-PAY-01 / B0-CI-01). Fixture refund en Test Mon #2.
- Maestro no corre en el job `check` de CI (no hay emulador). Nightly = `workflow_dispatch` + máquina con simulador.

## Fuera de B4

Hosting/DNS/TLS (operador B1). EAS/Apple (B6/B7). 50 rps de search en CI (throttle).
