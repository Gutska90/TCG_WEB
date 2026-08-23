# B8 — Closed Beta

Testers **invitados**. Staging sandbox. **Sin plata real.** Feature freeze: no Scanner, tiendas, subastas, intercambios, deck builder ni payouts automáticos.

Esto no publica un entorno: el operador invita gente a lo que B1 + B6 + B7 ya pueden entregar.

## Superficies

| Canal | Cómo entra un tester | Doc |
|-------|----------------------|-----|
| Web | URL staging `noindex`; no anunciar en redes | [WEB-BETA-QA.md](WEB-BETA-QA.md) |
| Admin | Solo staff; `ADMIN_IP_ALLOWLIST` o no exponer el host | [ADMIN-BETA-QA.md](ADMIN-BETA-QA.md) |
| Android | APK interno Expo (no Play) | [B6-ANDROID-BETA.md](B6-ANDROID-BETA.md) |
| iOS | TestFlight interno (no App Store) | [B7-IOS-TESTFLIGHT.md](B7-IOS-TESTFLIGHT.md) |

API: misma, `ENABLE_REAL_PAYMENTS=false`. Checkout = “Pago de prueba / sandbox”.

## Cuentas

- Seed local/CI: `pnpm beta:seed` (`buyer.beta@example.test` / `seller.beta@example.test`). **No** en producción.
- Testers reales: se registran en staging (email verificado vía Resend/SMTP de B1). No commitear passwords.
- OAuth: flags off hasta client IDs de staging. No botones rotos.

## Copy y legal

- Términos / privacidad / ayuda en web y rutas in-app `/legal/*`.
- No afirmar escrow de Mercado Pago. Compra Protegida = reglas internas. Ver [LEGAL-BETA.md](../LEGAL-BETA.md).
- Feedback: `POST /v1/feedback` (web y mobile).

## Notificaciones in-app (código)

Tras pago sandbox / envío / entrega / confirmación / cancelación / reclamo / valoración, el tester ve el aviso en `/me/notificaciones` y en la app. Wishlist y `PRICE_DROP` siguen igual. Push no está activo.

## Checklist operador (abrir la beta)

1. Staging HTTPS vivo: `/health`, `/ready`, correo de verify, fotos (R2), checkout sandbox. [STAGING.md](../runbooks/STAGING.md)
2. APK Android preview instalable. [B6](B6-ANDROID-BETA.md)
3. Build iOS en TestFlight (si hay testers iOS). [B7](B7-IOS-TESTFLIGHT.md)
4. Lista de invitados (email) fuera de git. Revocar al salir.
5. Kill switches conocidos (`DISABLE_CHECKOUT`, etc.) y Sentry si B5 está cableado en el host.
6. Brief al tester: sandbox, no dinero real, reportar por feedback, no scrapear ni reenviar el APK.

## Checklist tester

Usar [WEB-BETA-QA.md](WEB-BETA-QA.md) y [MOBILE-BETA-QA.md](MOBILE-BETA-QA.md). Mínimo: registro/login, buscar carta, carrito, checkout sandbox, una publicación (seller), disputa o reporte, colección/wishlist si el flag está on.

## Qué no es B8

- Play Store / App Store públicos
- `ENABLE_REAL_PAYMENTS=true`
- Fase 15 Scanner ni el resto del freeze
- Invitar al público general (eso sería open beta, fuera de este programa)

## Cierre

Cuando el operador cumplió el checklist de abrir y hay al menos un ciclo de QA invitado, B8 está **operable**. El código de este repo no puede invitar testers por sí solo.
