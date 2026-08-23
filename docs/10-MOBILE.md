# 10 — Mobile

## Stack (Fase 11)

Expo SDK 53, React Native, TypeScript, Expo Router, TanStack Query. Un codebase → Android e iOS.

Paquete: `apps/mobile` (`@tcg/mobile`). Misma API `/v1` que web. Tipos y validación desde `@tcg/types`, `@tcg/validation`, `@tcg/config`. No hay DTOs copiados ni lógica de órdenes/stock/comisiones en la app.

## Relación con la API

Auth: **refresh token solo en SecureStore / Keychain** (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Access token en memoria. Nunca AsyncStorage para tokens. Google (ID token) y Apple (iOS) contra la misma API. Detalle: [AUTH-IDENTITY-AND-SESSIONS.md](AUTH-IDENTITY-AND-SESSIONS.md).

`POST /v1/auth/refresh` envía `{ refreshToken }` en el body (no hay cookie httpOnly en native).

Carrito guest por cookie no aplica en native: el carrito móvil exige sesión.

## Configuración

Variables `EXPO_PUBLIC_*` (ver `apps/mobile/.env.example`):

| Variable | Uso |
|----------|-----|
| `EXPO_PUBLIC_API_BASE_URL` | Base de la API. Default dev: `http://localhost:4000` |
| `EXPO_PUBLIC_APP_ENV` | `development` \| `staging` \| `production` |
| `EXPO_PUBLIC_ENABLE_REAL_PAYMENTS` | Debe ser `false` en esta beta. Si es `false`, no se abre Checkout Pro live |
| `EXPO_PUBLIC_ANALYTICS` | `false` por defecto. Abstracción local, sin proveedor |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` / `_ANDROID` / `_WEB` | Audiencias nativas; vacías = sin botón Google real |

Flags de producto públicas: `GET /v1/config` (`features.enableGoogleAuth`, `enableAppleAuth`, `authStub`, scanner/stores apagados).

### Dispositivo físico → API local

Simulador iOS: `http://localhost:4000`.  
Emulador Android: `http://10.0.2.2:4000`.  
Teléfono real: `http://<IP-LAN-de-tu-Mac>:4000` (misma Wi‑Fi, API escuchando `0.0.0.0:4000`). Ejemplo:

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:4000 pnpm --filter @tcg/mobile start
```

Staging/producción: HTTPS. No hardcodear IPs en el repo.

## Navegación (MVP 11)

Tabs: **Inicio | Buscar | Colección | Favoritos | Carrito | Perfil**.

No hay tab Escanear ni Tiendas (Fases 15–16). No hay feed social.

Stacks: login/registro/verificar/recuperar, carta, listing, checkout, retorno de pago, compras, ventas, reclamos, publicaciones seller, saldo, direcciones, wishlist, notificaciones in-app + preferencias (push diferido), legal, feedback, colección (ítem + set).

## Auth implementado

Email/password, Google, Apple (iOS / stub de prueba). Logout, refresh, verificar email, forgot/reset, Seguridad (`/security`). 401 global: reintento de refresh; si falla, se borra SecureStore. Cuenta baneada: `ACCOUNT_BANNED`. Sesión revocada → login.

## Checkout sandbox y deep link

Scheme: `tcgplatform`. Retorno: `tcgplatform://checkout-return?checkoutId=<uuid>`.

**No se confía** en query/deep-link `status` / `collection_status`. La pantalla hace polling a `GET /v1/checkouts/:id` (processing / approved / rejected / expired / timeout). CTA “Ver mi compra”. Sandbox: `POST /v1/payments/simulate`.

Universal links / Associated Domains / App Links de staging: configurar `applinks:<host-api-o-web>` cuando exista dominio; no están firmados en esta fase.

## Notificaciones

`GET /v1/me/notifications` y `POST /v1/me/push-tokens` **no existen** en la API. La pantalla Notificaciones lo dice. No hay push inventado.

## Analytics

Eventos: `app_open`, `login_success`, `search`, `card_view`, `listing_view`, `add_to_cart`, `checkout_started`, `checkout_completed_sandbox`, `seller_listing_created`, `dispute_opened`. Deshabilitado por defecto. Sin PII (tokens, email, passwords).

## Feedback

`POST /v1/feedback` con `screen=mobile:<ruta>`, `appVersion` (versión + OS), `requestId` si hay. `platform=mobile` va en el mensaje (`[mobile]`) porque el schema no tiene campo `platform`. Sin tokens ni payloads financieros.

## EAS

`apps/mobile/eas.json`: `development` (dev client), **`preview`** (APK/ad hoc interno, B6/B7), **`testflight`** (iOS store-dist para TestFlight, B7), `production` (AAB, sin submit). Package/bundle `cl.tcgplatform.app`. Keystore y `.p8` fuera de git. `EAS_PROJECT_ID` por env/secret, no en el árbol.

Staging/production fallan al evaluar `app.config.ts` si la API no es HTTPS pública o si `EXPO_PUBLIC_ENABLE_REAL_PAYMENTS=true`. En EAS cloud también exige `EAS_PROJECT_ID`.

```text
pnpm eas:android:preview
pnpm eas:ios:testflight
```

Detalle: [release/B6-ANDROID-BETA.md](release/B6-ANDROID-BETA.md), [release/B7-IOS-TESTFLIGHT.md](release/B7-IOS-TESTFLIGHT.md). `eas submit` Android está prohibido en esta beta. iOS submit solo `--profile testflight`.

## Tests

Unit: `pnpm --filter @tcg/mobile test` (errores, analytics, timeline/checkout UI).  
E2E: Maestro en `apps/mobile/.maestro/` (login, search/card, checkout sandbox, venta, disputa/logout). Requiere simulador + API + `pnpm beta:seed`. No corre en CI (sin emulador). QA manual: [release/MOBILE-BETA-QA.md](release/MOBILE-BETA-QA.md).

## Lo que no se duplica

- Lógica de órdenes, comisiones, stock, ledger.
- Catálogo local paralelo.
- Otro backend.
- Scanner, stores, auctions, pagos live.

## 11.5 Auth (listo)

Google/Apple consistentes con web. Push tokens, centro in-app real, universal links de host público y submit a stores **siguen diferidos** (no son Colección / Fase 12).
