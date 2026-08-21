# 05 — Autenticación y autorización

## Identidad

MVP:

- Email + password (min 10 caracteres, check de breach k-anonymity opcional después).
- Google (ID token).
- Apple (mobile obligatorio si hay Sign in with Apple en iOS; web también).

Después: Facebook no es prioridad. MFA TOTP opcional post-MVP 3.

## Flujos

### Registro email

1. `POST /v1/auth/register` crea `User` + `AuthIdentity(EMAIL)` + `UserRole(USER)`.
2. Envía email de verificación (token de un solo uso, 24 h).
3. Login permitido con email no verificado, pero **vender y checkout** requieren `emailVerifiedAt`.

### Login

1. Verifica password (argon2id).
2. Emite access JWT (15 min) + refresh opaco (30 días) en `Session`.
3. Refresh rota el token (reuse detection: si un refresh ya revocado se presenta, se revocan todas las sesiones del usuario).

### OAuth

- Si `providerSubject` existe → login.
- Si email existe con otro provider → vincular solo si el email está verificado en ambos lados; si no, 409 `ACCOUNT_CONFLICT`.
- Si no existe → crear usuario `USER`.

### Password reset

- Token aleatorio hasheado en DB, 1 hora, un solo uso.
- Respuesta de forgot-password siempre genérica.

## Tokens

| Token | Dónde | TTL |
|-------|--------|-----|
| Access JWT | Authorization header | 15 min |
| Refresh | Web: cookie `Refresh` httpOnly, Secure, SameSite=Lax. Mobile: SecureStore | 30 días |

Claims access (mínimo): `sub`, `roles`, `sid` (session id), `ver` (email verified bool).

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

`GET /v1/auth/sessions` lista dispositivos. Logout de uno o de todos.

## MFA (diseño, no MVP)

Tabla `MfaDevice`. Access token claim `amr`. Endpoints `/v1/auth/mfa/*` no se crean hasta que el roadmap lo pida.

## Admin

El panel admin usa los mismos endpoints `/v1/admin` con cookie de dominio admin. No reutilizar la cookie del marketplace. CSRF: SameSite + origin check.

## Rate limits

| Ruta | Límite |
|------|--------|
| login / register | 10 / 15 min / IP |
| forgot-password | 5 / hora / email+IP |
| API autenticada | 120 / min / user |
| search | 60 / min / IP |

## Correos transaccionales (auth)

- Verificar email
- Password reset
- Nuevo login desde dispositivo desconocido (post-MVP, recomendado en MVP 3)
