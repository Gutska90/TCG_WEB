# B6 — Android Beta (EAS preview interno)

No se sube a Google Play. Pagos live siguen apagados (`EXPO_PUBLIC_ENABLE_REAL_PAYMENTS=false`). Scanner / stores / subastas no entran.

Package: `cl.tcgplatform.app`. Perfil EAS: **`preview`** → APK `distribution: internal`, keystore remoto de EAS.

## Qué queda listo en el repo

- `apps/mobile/eas.json` perfil `preview` (APK interno, canal `preview`).
- Fail-fast: staging/production exigen API HTTPS pública; EAS cloud exige `EAS_PROJECT_ID`; nunca `ENABLE_REAL_PAYMENTS=true`.
- Deep link `tcgplatform://` en intent filters. Tema sistema (`userInterfaceStyle: automatic`).
- Workflow `workflow_dispatch`: [`.github/workflows/eas-android-preview.yml`](../../.github/workflows/eas-android-preview.yml). No es gate de `ci.yml`.
- Tests: `apps/mobile/src/lib/release-config.spec.ts`.

## Checklist operador

1. Cuenta Expo + `eas login`. `cd apps/mobile && pnpm exec eas init` (o pegar el UUID en secret `EAS_PROJECT_ID`; **no** commitear el valor).
2. API staging HTTPS (B1). Secret EAS / GitHub `EXPO_PUBLIC_API_BASE_URL=https://…` (sin slash final).
3. Keystore: primera build con `credentialsSource: remote` deja que EAS lo genere. No subir `.jks` al git.
4. Build:

```bash
cd apps/mobile
EXPO_PUBLIC_API_BASE_URL=https://api.staging.example \
EAS_PROJECT_ID=<uuid> \
pnpm eas:android:preview
```

O Actions → **EAS Android preview (B6)** (secrets `EXPO_TOKEN`, `EAS_PROJECT_ID`, `EXPO_PUBLIC_API_BASE_URL`).

5. Instalar el APK en testers internos (link de Expo o `eas build:list`). No Play Console, no track interno de Play.
6. QA: [MOBILE-BETA-QA.md](MOBILE-BETA-QA.md) en un teléfono Android real contra staging. Checkout = sandbox.

## Prohibido en B6

- `eas submit --platform android`
- Perfil `production` / `testflight` para Android (AAB de store)
- `ENABLE_REAL_PAYMENTS=true`
- Icono/screenshots de Play Data safety (eso es review de store, no preview interno)

## Fuera de B6

iOS / TestFlight: [B7-IOS-TESTFLIGHT.md](B7-IOS-TESTFLIGHT.md). Testers invitados web+apps: [B8-CLOSED-BETA.md](B8-CLOSED-BETA.md). Hosting: [STAGING.md](../runbooks/STAGING.md).
