# Store readiness (App Store / Play) — preparación

No subir todavía. Checklist para cuando exista app (Fase 11). URLs de esta beta asumen el origen web público.

## Identidad

| Campo | Estado beta | Notas |
|-------|-------------|--------|
| App name | TCG Platform / TCG Market Chile (provisional) | Nombre de tienda TBD |
| Package / bundle IDs | `cl.tcgplatform.app` (iOS + Android) | Provisionales de beta; confirmar cuenta developer |
| App icon | placeholder beta en `apps/mobile/assets` | Asset de producción pendiente |
| Screenshots | no | Capturas de web no sustituyen las de la app |

## URLs públicas (web)

Sustituir el host por el dominio real de staging/producción.

| Uso | Ruta |
|-----|------|
| Privacy | `/privacidad` |
| Terms | `/terminos` |
| Support | `/ayuda` |
| Marketplace rules | `/marketplace` |
| Refunds | `/refunds` |

Contacto: `soporte@localhost` y `privacidad@localhost` son placeholders de beta. Reemplazar antes de review de store.

## Declaraciones

- Edad / contenido: cartas coleccionables; no hay juego de azar en el MVP. Confirmar rating con legal/producto.
- Account deletion path: perfil → “Solicitar desactivación de cuenta”. No hard delete financiero. Documentar en Data safety que se conservan órdenes/pagos/auditoría.
- Data safety / privacy answers: ver [LEGAL-BETA.md](../LEGAL-BETA.md) y la página `/privacidad`. Solo datos que el código maneja (cuenta, perfil, direcciones, listings, órdenes, metadatos de pago, disputas, logs, feedback).
- Cookies: web `Refresh` + `sessionStorage`; mobile SecureStore (refresh) + memoria (access). Analytics de app deshabilitado por defecto.

## Beta / review

| Campo | Notas |
|-------|--------|
| Beta description | Marketplace TCG Chile en prueba. Pagos reales deshabilitados. Funciones pueden cambiar. |
| Test credentials | Solo si el review de store lo exige; no commitear passwords. Cuenta sandbox, sin `ENABLE_REAL_PAYMENTS`. |
| Login Google/Apple | Implementado (11.5). Apple en iOS. Web: Google. Stub en CI. |

## Bloqueos antes de submit

- App Expo MVP + OAuth 11.5 existen; **no** publicar Play/App Store. B6 = APK interno; B7 = TestFlight. Pendiente para store pública: push, universal links de host público, review.
- `ENABLE_REAL_PAYMENTS=false`.
- Revisión legal de términos/privacidad.
- Emails de soporte y privacidad reales (blocker de review, no de preview interno).
- Icono, screenshots, IDs y cuenta de developer.

Detalle operativo: [B6-ANDROID-BETA](B6-ANDROID-BETA.md), [B7-IOS-TESTFLIGHT](B7-IOS-TESTFLIGHT.md), [B8-CLOSED-BETA](B8-CLOSED-BETA.md).
