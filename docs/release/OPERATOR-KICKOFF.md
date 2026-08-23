# Kickoff operador — qué tienes que hacer tú

El código de la closed beta **ya está en `main`**. Yo no puedo crear cuentas de hosting, DNS, Expo ni Apple. Esto es exactamente lo que falta de tu lado, en orden.

No enciendas `ENABLE_REAL_PAYMENTS`. No subas a Play ni App Store. No implementes Scanner.

Lista canónica. Detalle técnico: [STAGING.md](../runbooks/STAGING.md), [B6](B6-ANDROID-BETA.md), [B7](B7-IOS-TESTFLIGHT.md), [B8](B8-CLOSED-BETA.md).

---

## Día 0 — cuentas (crear, aunque el servidor aún no exista)

| # | Cuenta | Para qué | URL |
|---|--------|----------|-----|
| 1 | Dominio | `staging.…`, `api.staging.…`, `admin.staging.…` (nombres a tu gusto) | tu registrador |
| 2 | DNS + TLS | Cloudflare (recomendado en la auditoría) o el DNS del host | [dash.cloudflare.com](https://dash.cloudflare.com) |
| 3 | Postgres managed | Base única. Backups diarios del proveedor | Neon / RDS / Fly Postgres / Cloud SQL |
| 4 | Host API | Un proceso Node (`docker/Dockerfile.api`), puerto 4000 | Fly / Render / Railway |
| 5 | Host web + admin | Next.js, `API_ORIGIN` = API HTTPS | Vercel (dos proyectos) u el mismo cluster |
| 6 | Cloudflare R2 | Fotos, avatares, evidencia. Bucket **privado** | [dash.cloudflare.com → R2](https://dash.cloudflare.com) |
| 7 | Resend | Verify/reset/alertas. Dominio verificado | [resend.com](https://resend.com) |
| 8 | GitHub (este repo) | Secrets de EAS más adelante | el repo ya está |

Opcional el mismo día (no bloquea web):

| # | Cuenta | Para qué |
|---|--------|----------|
| 9 | Redis managed | Solo si vas a correr **más de una** réplica API (`REDIS_URL`) |
| 10 | Sentry | Errores API (`ERROR_TRACKING_ENABLED=true` + `SENTRY_DSN`) |
| 11 | Expo | APK interno Android |
| 12 | Apple Developer (99 USD/año) | TestFlight iOS |

Google Cloud / Apple OAuth: **no** el día 0. Deja `ENABLE_GOOGLE_AUTH=false` y `ENABLE_APPLE_AUTH=false`.

Mercado Pago live: **no**. Staging usa sandbox / “Pago de prueba”.

---

## Día 1 — decidir 3 hostnames y pegarlos

Ejemplo (sustituye el dominio real):

```text
APP_WEB_URL=https://staging.tudominio.cl
APP_ADMIN_URL=https://admin.staging.tudominio.cl
API_PUBLIC_URL=https://api.staging.tudominio.cl
CORS_ORIGINS=https://staging.tudominio.cl,https://admin.staging.tudominio.cl
```

Web y admin, en el host Next:

```text
API_ORIGIN=https://api.staging.tudominio.cl
```

TLS en los tres. Sin HTTP en staging.

---

## Día 1 — secretos de la API (obligatorios para boot)

Copia `.env.staging.example` → `.env.staging` (gitignored). Llena:

| Variable | Qué poner |
|----------|-----------|
| `DATABASE_URL` | Connection string del Postgres managed |
| `JWT_ACCESS_SECRET` | ≥ 32 caracteres, no `change-me` |
| `R2_ACCOUNT_ID` `R2_ACCESS_KEY_ID` `R2_SECRET_ACCESS_KEY` `R2_BUCKET` | API token R2 con permiso al bucket |
| `RESEND_API_KEY` | API key Resend |
| `EMAIL_FROM` | `TCG Market Chile <noreply@tudominio.cl>` (dominio verificado) |
| `LEGAL_CONTACT_EMAIL` | p.ej. `soporte@tudominio.cl` (API + web + admin) |
| `LEGAL_PRIVACY_EMAIL` | p.ej. `privacidad@tudominio.cl` |
| `ADMIN_IP_ALLOWLIST` | IPs públicas de staff, separadas por coma (o no publiques el host admin) |
| `ENABLE_REAL_PAYMENTS` | `false` |
| `AUTH_STUB_OAUTH` | `false` |
| `ENABLE_SCANNER` `ENABLE_STORES` `ENABLE_AUCTIONS` | `false` |
| `JOBS_ENABLED` | `true` |

R2 CORS: orígenes web y admin, métodos `PUT` y `HEAD`. Bucket no público.

Comprueba **antes** de pegar en el host:

```bash
pnpm staging:preflight -- --env-file .env.staging
```

Exit 1 = aún no invites testers.

---

## Día 1 — deploy

1. `pnpm exec prisma migrate deploy` contra el `DATABASE_URL` de staging (**nunca** `db push`).
2. API: `docker build -f docker/Dockerfile.api -t tcg-api .` y el runtime del host con el `.env.staging`.
3. Web: `API_ORIGIN` + `LEGAL_*` + `LEGAL_CONTACT_EMAIL`.
4. Admin: igual + `ADMIN_IP_ALLOWLIST` en el middleware (ya lee env).
5. Smoke: `GET https://api.…/health` y `/ready`. Registro + correo en Inbucket no: tiene que llegar Resend. Subir foto de listing. Checkout “Pago de prueba / sandbox”.

Opcional: `REDIS_URL` (1 réplica puede vivir sin Redis). Sentry: `ERROR_TRACKING_ENABLED=true` y `SENTRY_DSN`. Backup diario del Postgres **en el panel del proveedor**.

---

## Día 2 — Android (si hay testers con teléfono)

1. Cuenta [expo.dev](https://expo.dev).
2. En tu máquina: `cd apps/mobile && pnpm exec eas login && pnpm exec eas init`.
3. GitHub → Settings → Secrets: `EXPO_TOKEN`, `EAS_PROJECT_ID`, `EXPO_PUBLIC_API_BASE_URL` = `https://api.staging.…` (HTTPS, sin slash final).
4. Actions → **EAS Android preview (B6)** o `pnpm eas:android:preview`.
5. Instalar el APK por el link de Expo. **No** Play Console.

---

## Día 2 — iOS (solo si hay testers iPhone)

1. Apple Developer + App Store Connect. Bundle `cl.tcgplatform.app`.
2. Mismo `EAS_PROJECT_ID` y API HTTPS.
3. `pnpm eas:ios:testflight` y `eas submit --platform ios --profile testflight --latest`.
4. **No** submit a App Store.

---

## Día 3 — abrir la beta

1. Lista de emails de testers **fuera de git**.
2. Brief: sandbox, no plata real, no reenviar el APK, feedback in-app.
3. Checklists: [WEB-BETA-QA.md](WEB-BETA-QA.md), [MOBILE-BETA-QA.md](MOBILE-BETA-QA.md), staff [ADMIN-BETA-QA.md](ADMIN-BETA-QA.md).
4. Cuentas `buyer.beta@example.test` son solo local/`pnpm beta:seed`. En staging la gente se registra de verdad.

---

## Qué no hagas

- `ENABLE_REAL_PAYMENTS=true`
- `eas submit --platform android`
- App Store release
- Commitear `.env.staging`, keystores, `.p8`, `google-services.json`
- `AUTH_STUB_OAUTH=true` en staging
- Anunciar la URL en redes (es closed beta)

---

## Qué devolvérmelo para que yo siga

Cuando tengas **una** de estas, lo engancho en el repo/host:

1. Los 3 hostnames HTTPS ya resolviendo, o
2. Qué proveedor elegiste (Fly, Render, Vercel, Neon, …) si quieres que deje `fly.toml` / proyecto Vercel, o
3. `eas login` hecho y el `EAS_PROJECT_ID` (por chat o secret, **no** en git)

Sin (1) no hay gestión de testers reales. El resto del producto en código está listo.
