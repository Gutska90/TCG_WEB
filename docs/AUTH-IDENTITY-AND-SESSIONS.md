# Auth identity and sessions (Fase 11.5)

Fuente de verdad de identidad para web, admin y mobile: **una API, una base**.

## Modelo

| Entidad | Rol |
|---------|-----|
| `User` | Cuenta de plataforma (email, `passwordHash` opcional, `emailVerifiedAt`, `tokenVersion`, `isBanned`, consentimiento legal, `deletedAt`) |
| `AuthIdentity` | Método de login: `EMAIL` \| `GOOGLE` \| `APPLE`. Unique `(provider, providerSubject)` |
| `Session` | Refresh opaco hasheado. Multi-dispositivo. `revokedAt` |

`providerSubject`: para email es el email normalizado; para Google/Apple es el `sub` estable del proveedor. **Nunca** se usa el email de Apple como identificador.

No se guardan access tokens de Google/Apple.

## Login

- **Email/password:** verifica argon2id. Mensaje genérico si falla.
- **Google:** ID token validado server-side (`aud` = allowlist `GOOGLE_CLIENT_ID*` , firma, exp).
- **Apple:** identity token validado server-side (JWKS Apple, `iss`, `aud`, exp, `sub`).

Si `AuthIdentity` ya existe → emite sesión. No se pide consentimiento de nuevo.

Si el email del token coincide con un `User` existente y el `sub` es nuevo → **409 `ACCOUNT_CONFLICT`**. No hay fusión silenciosa.

Alta OAuth nueva exige `acceptTerms: true` persistido (`termsVersion`, `privacyVersion`, `acceptedAt`). El checkbox del cliente no basta.

## Linking / unlink

Preferido: usuario **ya autenticado** vincula desde Seguridad.

| Método | Path |
|--------|------|
| GET | `/v1/me/auth-identities` |
| POST | `/v1/me/auth-identities/link/google` `{ idToken }` |
| POST | `/v1/me/auth-identities/link/apple` `{ identityToken }` |
| DELETE | `/v1/me/auth-identities/:provider` `GOOGLE` \| `APPLE` |

Google link: el email del token debe coincidir con el `User` y estar verificado **en ambos lados**.

Apple link: basta identity token válido (relay / email solo la primera vez). No se busca cuenta por email del cliente.

Unlink solo si queda al menos un método: `passwordHash` u otro OAuth. `LAST_AUTH_METHOD` si no.

OAuth-only puede agregar password: `POST /v1/me/password` (sesión válida). Si ya hay password, exige `currentPassword`.

## Sesiones y refresh

Refresh **rota**: el token presentado se revoca y se emite otro (hash nuevo). Reuse de un refresh ya revocado revoca **todas** las sesiones (`auth.refresh_reuse`).

| Método | Path |
|--------|------|
| GET | `/v1/auth/sessions` y `/v1/me/sessions` |
| DELETE | `/v1/auth/sessions/:id` y `/v1/me/sessions/:id` |
| POST | `/v1/auth/sessions/revoke-all` y `/v1/me/sessions/revoke-all` |

Nunca se expone `refreshTokenHash`. Logout actual: `POST /v1/auth/logout`. Revoke-all **conserva** la sesión corriente.

`User.tokenVersion` sube en reset de password, set password y `invalidateAccess` (ban/desactivación). El access JWT lleva `tv`; si no coincide, 401.

## Token storage

| | Access | Refresh |
|--|--------|---------|
| Web | `sessionStorage` (`tcg.accessToken`) | cookie `Refresh` httpOnly, SameSite=Lax, Path `/`, Secure si `NODE_ENV=production` o `APP_WEB_URL` es https. TTL 30 días |
| Mobile | memoria | SecureStore / Keychain, `WHEN_UNLOCKED_THIS_DEVICE_ONLY` |

No localStorage ni AsyncStorage para refresh.

## Email verificado

Email/password: login permitido sin verificar; checkout/vender siguen exigiendo `emailVerifiedAt`.

Google: si el proveedor certifica `email_verified`, se setea `emailVerifiedAt` en el alta. Si no lo certifica, se rechaza el alta Google.

Apple: `emailVerifiedAt` solo si el identity token trae `email_verified`.

## Banned vs seller suspendido vs desactivado

| Estado | Login | Refresh | Access JWT | Marketplace |
|--------|-------|---------|------------|-------------|
| `User.isBanned` | 403 `ACCOUNT_BANNED` | 403 o 401 si ya se revocó | 403 | no |
| `SellerSuspension` | sí | sí | sí | no publicar / payouts según 10.5 |
| `deletedAt` (baja) | no (usuario no encontrado) | 401 | 401 | — |

Ban/desactivación revocan sesiones y suben `tokenVersion`. La baja **no** borra Order/Payment/Refund/Ledger/AuditLog.

## Flags y secretos

`ENABLE_GOOGLE_AUTH` / `ENABLE_APPLE_AUTH`. UI oculta el botón; la API rechaza igual (`FEATURE_DISABLED`).

Staging/production: si el flag está on y faltan client IDs → fail-fast.

`AUTH_STUB_OAUTH` solo tests/CI. Prohibido en production y con pagos reales. Endpoints `/v1/auth/oauth/test` y `/v1/me/auth-identities/link/test`.

`GOOGLE_CLIENT_SECRET` no se usa para ID tokens. `APPLE_PRIVATE_KEY` no va al repo (`APPLE_PRIVATE_KEY_REF`).

## Deep links mobile

Permitidos: `tcgplatform://oauth`, `https://auth.expo.io/*` (Expo Go). No se abren URLs arbitrarias.

| Entorno | Callback |
|---------|----------|
| development (dev client) | `tcgplatform://oauth` |
| preview EAS | `tcgplatform://oauth` |
| production | `tcgplatform://oauth` (universal links de host público: pendiente, no es Collection) |

## Test provider

CI no llama a Google/Apple. Playwright usa el stub. Maestro `06-oauth-google.yaml` igual.
