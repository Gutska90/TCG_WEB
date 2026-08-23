# 05 — Autenticación y autorización

## Identidad

**Web (decisión):** Sign in with Google es el onboarding por defecto. El primer login crea `User` + `AuthIdentity(GOOGLE)` + `UserRole(USER)`. Google entrega `sub`, email y `email_verified`; si el email está verificado en Google, se setea `emailVerifiedAt` y **no** se envía correo de verificación nuestro.

Google **no** reemplaza: fila `User`, `Session`, JWT de la plataforma, RBAC, onboarding de vendedor, términos, dirección, ni Mercado Pago. Solo identidad y prueba de email.

Detalle de linking, sesiones y storage: [AUTH-IDENTITY-AND-SESSIONS.md](AUTH-IDENTITY-AND-SESSIONS.md).

- Google (ID token / GIS). Audiencias: `GOOGLE_CLIENT_ID` y/o `GOOGLE_CLIENT_ID_WEB` / `_IOS` / `_ANDROID`. Flag `ENABLE_GOOGLE_AUTH`.
- Apple: obligatorio en iOS si hay login de terceros (regla App Store). Flag `ENABLE_APPLE_AUTH`. Web no ofrece Apple en esta fase.
- Email + password: cuentas existentes, fallback, y alta explícita en `/registro`.

Después: Facebook no es prioridad. MFA TOTP opcional post-MVP 3.

## Flujos

### Registro email (legacy / fallback)

1. `POST /v1/auth/register` crea `User` + `AuthIdentity(EMAIL)` + `UserRole(USER)`.
2. Exige `acceptTerms: true` (no preseleccionado en UI). Guarda `termsVersion`, `privacyVersion`, `acceptedAt`. `marketingOptIn` es opcional y separado.
3. Envía email de verificación (token de un solo uso, 24 h).
4. Login permitido con email no verificado, pero **vender y checkout** requieren `emailVerifiedAt`.

Los usuarios nuevos de Google no pasan por este flujo.

### Login email (legacy)

1. Verifica password (argon2id).
2. Emite access JWT (15 min) + refresh opaco (30 días) en `Session`.
3. Refresh rota el token (reuse detection: si un refresh ya revocado se presenta, se revocan todas las sesiones del usuario).

### OAuth (Google / Apple)

- Si `providerSubject` existe → login (sin reconsentir).
- Si el email coincide con otro `User` y el `sub` es nuevo → **no** vincular en el login. 409 `ACCOUNT_CONFLICT`. El usuario entra con su método actual y vincula desde Seguridad.
- Si no existe → crear `USER`. Google exige `email_verified` del proveedor. La **creación** exige `acceptTerms: true` persistido. Cuentas existentes no se reconsienten (`legal.stale` informativo).
- Linking autenticado: `POST /v1/me/auth-identities/link/google|apple` con prueba del proveedor (ID/identity token). Unlink solo si queda password u otro OAuth.
- `emailVerifiedAt` se copia solo si el proveedor certifica el email.

### Password reset

- Token aleatorio hasheado en DB, 1 hora, un solo uso.
- Respuesta de forgot-password siempre genérica.

## Tokens

| Token | Dónde | TTL |
|-------|--------|-----|
| Access JWT | Authorization header | 15 min |
| Refresh | Web: cookie `Refresh` httpOnly, Secure, SameSite=Lax. Mobile: SecureStore | 30 días |

Claims access (mínimo): `sub`, `roles`, `sid` (session id), `ver` (email verified bool).

`JWT_ACCESS_SECRET` es obligatorio al boot (mínimo 32 caracteres). No hay fallback `dev-only-change-me`. Placeholders (`change-me`, `dev-only`) abortan el proceso. Rotar el secreto invalida access tokens; las sesiones refresh siguen hasta revocar o subir `User.tokenVersion`.

El refresh es opaco (hash en `Session`), no JWT: no se usa un segundo secreto de firma.

No guardar PII innecesaria en JWT.

## RBAC

Roles (`docs/03-DATABASE.md`): `USER`, `SELLER`, `STORE`, `MODERATOR`, `ADMIN`, `SUPER_ADMIN`.

Un usuario tiene **N roles**. La autorización consulta roles + ownership.

```text
Prohibido:
  if (user.isAdmin) { ... }

Obligatorio:
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Policies('listing:pause:any')
```

Implementación Nest: `RolesGuard` + opcional CASL/`PoliciesGuard` para ownership (`listing:update:own`).

### Matriz resumida

| Acción | USER | SELLER | STORE | MOD | ADMIN | SUPER |
|--------|------|--------|-------|-----|-------|-------|
| Ver catálogo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Favoritos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Publicar listing | | ✓ | ✓ | | | |
| Comprar | ✓* | ✓ | ✓ | | | |
| Moderar listings | | | | ✓ | ✓ | ✓ |
| Impersonar / config | | | | | | ✓ |
| Ver pagos raw | | | | | ✓ | ✓ |

\* Email verificado.

`STORE` no sustituye `SELLER`: un miembro de tienda publica como la tienda (`Listing.sellerId` = user del owner o `storeId` en listing — **decisión: `Listing.storeId` opcional** además de `sellerId` para atribución).

Actualizar [03-DATABASE](03-DATABASE.md) en implementación: agregar `Listing.storeId?`.

## Onboarding vendedor

`POST /v1/me/seller-onboarding`:

- Dirección de despacho.
- Teléfono.
- Aceptación de términos de vendedor.
- Otorga `SELLER` y escribe `Profile.sellerOnboardedAt`.
- Audit log `seller.onboarded`.

## Sesiones

`GET /v1/me/sessions` (alias `/v1/auth/sessions`) lista dispositivos. Logout de uno, de todos los demás, o de la sesión actual. Refresh con rotación y detección de reuse. Ver [AUTH-IDENTITY-AND-SESSIONS.md](AUTH-IDENTITY-AND-SESSIONS.md).

## MFA (diseño, no MVP)

Tabla `MfaDevice`. Access token claim `amr`. Endpoints `/v1/auth/mfa/*` no se crean hasta que el roadmap lo pida.

## Admin

El panel admin usa los mismos endpoints `/v1/admin` con cookie de dominio admin. No reutilizar la cookie del marketplace. CSRF: SameSite + origin check.

## Rate limits

| Ruta | Límite |
|------|--------|
| login / register / OAuth / linking | 10 / 15 min / IP |
| forgot-password / resend-verification | 5 / hora / email+IP |
| API autenticada | 120 / min / user |
Los límites aplican en **staging y production**. En `development`/`test` (y si `E2E_RELAX_THROTTLE=true`) el guard no cuenta: si no, Playwright supera el tope de login 10/15 min. No usar ese flag en staging/producción.

## Correos transaccionales (auth)

- Verificar email (solo cuentas `EMAIL`, no Google con `email_verified`)
- Password reset (solo cuentas con password)
- Nuevo login desde dispositivo desconocido (post-MVP, recomendado en MVP 3)
