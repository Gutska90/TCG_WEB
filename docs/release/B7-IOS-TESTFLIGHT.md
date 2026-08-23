# B7 — iOS TestFlight

No se publica en App Store. Pagos live siguen apagados. Sign in with Apple queda en el binario (`usesAppleSignIn`); el flag de API puede seguir off hasta tener client IDs de staging.

Bundle: `cl.tcgplatform.app`. Perfiles:

| Perfil | Uso |
|--------|-----|
| `preview` | Ad hoc interno (dispositivos registrados), misma API staging que Android |
| `testflight` | `distribution: store` solo para **TestFlight**, no para release pública |

`eas.json` `submit` solo tiene perfil **`testflight` iOS**. No hay submit Android.

## Qué queda listo en el repo

- Perfil `testflight` (store iOS, canal `testflight`, mismos env sandbox que preview).
- Associated Domains opcionales vía `EXPO_PUBLIC_ASSOCIATED_DOMAIN` (host sin esquema). Vacío = sin universal links (aceptado en B7).
- Workflow `workflow_dispatch`: [`.github/workflows/eas-ios-testflight.yml`](../../.github/workflows/eas-ios-testflight.yml).
- Fail-fast HTTPS + `EAS_PROJECT_ID` igual que B6.

## Checklist operador

1. Apple Developer + App Store Connect. App con bundle `cl.tcgplatform.app`. Capability **Sign in with Apple** si vas a prender `ENABLE_APPLE_AUTH`.
2. Mismos `EAS_PROJECT_ID` y `EXPO_PUBLIC_API_BASE_URL` HTTPS que B6.
3. Credenciales iOS remotas (EAS). No commitear `.p8` / perfiles.
4. Build:

```bash
cd apps/mobile
EXPO_PUBLIC_API_BASE_URL=https://api.staging.example \
EAS_PROJECT_ID=<uuid> \
pnpm eas:ios:testflight
```

5. Cuando el build esté listo: `eas submit --platform ios --profile testflight --latest`. **No** `eas submit --platform ios --profile production` para una release App Store.
6. Grupo interno de TestFlight (testers invitados por email). Privacy/support del listing de TestFlight: URLs **web** de staging `/privacidad` y `/ayuda` (no `localhost`). Contacto `soporte@localhost` es blocker de **review App Store**, no de TestFlight interno si el listing usa el host de staging.
7. QA: [MOBILE-BETA-QA.md](MOBILE-BETA-QA.md) en iPhone. Deep link `tcgplatform://checkout-return` + poll; no confiar query de MP.

## Prohibido en B7

- Submit a App Store (release pública)
- Pagos live
- Inventar universal links de un dominio que no existe

## Fuera de B7

Android APK interno: [B6-ANDROID-BETA.md](B6-ANDROID-BETA.md). Closed beta: [B8-CLOSED-BETA.md](B8-CLOSED-BETA.md).
