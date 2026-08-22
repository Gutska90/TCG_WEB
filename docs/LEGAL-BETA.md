# Legal / Privacy / Beta copy — Fase 10.7

Documento de producto. **No** es asesoría legal ni un contrato validado por abogado.

Aviso: *Documento de beta / sujeto a revisión legal antes de producción real.*

## Cubierto en esta fase

- Páginas públicas: `/terminos`, `/privacidad`, `/marketplace`, `/refunds`, `/ayuda`. App: `/legal/[slug]` con el mismo copy de `@tcg/config`.
- Consentimiento al registrarse (`acceptTerms` obligatorio, checkbox no preseleccionado). Alta OAuth (Google/Apple) persiste las mismas versiones; no se crea cuenta nueva sin `acceptTerms: true`.
- Versionado `TERMS_VERSION` / `PRIVACY_VERSION` en `@tcg/config` (`LEGAL.termsVersion`, `LEGAL.privacyVersion`), guardado en `User`.
- Opt-in de marketing separado (`marketingOptIn`).
- Detección de aceptación anterior (`legal.stale` en `GET /v1/me`). No se fuerza reconsentimiento en 10.7.
- Copy de pagos para usuario final (recibido / elegible para liquidación / liquidación). Sin “Mercado Pago retiene”, “escrow Mercado Pago” ni “dinero protegido por Mercado Pago”.
- Compra Protegida = reglas internas de soporte, moderación y disputas. No es seguro, escrow, garantía financiera ni certificación de autenticidad.
- Baja de cuenta: solicitud + desactivación (`deletedAt` + `deletionRequestedAt`). No hard delete de Order, Payment, Refund, Ledger ni AuditLog.
- Feedback beta `POST /v1/feedback` (rate limit). Admin `GET /v1/admin/feedback` (lista simple, no helpdesk).
- Banner Beta discreto.
- Gate extra: producción + `ENABLE_REAL_PAYMENTS=true` exige `REAL_PAYMENTS_LEGAL_APPROVED=true`. Esa marca **no** va en `true` en el repositorio.
- Cookies/storage documentados según el código: web cookie `Refresh` + `sessionStorage` del access token. Mobile: refresh en SecureStore, access en memoria. Sin banner de cookies de marketing.
- Checklist de stores: [release/STORE-READINESS.md](release/STORE-READINESS.md). App Expo beta existe; **no** hay submit a App Store / Play. QA: [release/MOBILE-BETA-QA.md](release/MOBILE-BETA-QA.md).

## Copy provisional (humano + legal)

Todo el texto de términos, privacidad, marketplace y refunds es copy de beta. Debe revisarlo un abogado chileno antes de cobros reales o de marcar producción.

Emails transaccionales (verificar, reset) llevan branding beta y link a `/ayuda`. No incluyen secretos ni payloads de pago.

## Qué necesita revisión legal real

- Contrato con Mercado Pago para cobro en cuenta plataforma y custodia de fondos de terceros (ADR 0008).
- Tratamiento tributario (SII) y comisiones.
- Términos y privacidad con fuerza contractual (capacidad, consumidores, Ley 19.628 / normativa vigente).
- Transferencias internacionales de datos (Google, Apple, Mercado Pago, Resend, R2).
- Plazos de retención de datos y de registros financieros.
- Chargebacks, responsabilidad frente al comprador, KYC de vendedores.
- Copy de “Compra Protegida” si se quiere usar como promesa de producto.
- Si se agregan analíticas no esenciales: consentimiento separado.

## Condiciones que bloquean pagos live

No habilitar `ENABLE_REAL_PAYMENTS` ni `MP_ACCESS_TOKEN` de producción hasta:

1. Production gate de [ADR 0008](adr/0008-marketplace-payment-model.md) firmado.
2. `REAL_PAYMENTS_LEGAL_APPROVED=true` **fuera del repo**, solo en el entorno aprobado.
3. Revisión legal de términos, privacidad y modelo de custodia.
4. Revisión de copy de pagos (no escrow del procesador).

Esto es defensa en profundidad. Un sandbox que funciona no cierra el gate.

## Baja de cuenta y finanzas

Los registros financieros y de auditoría se conservan según la política de la plataforma. La solicitud de eliminación **desactiva** el login; no borra dinero ni auditoría.

## Reconsentimiento futuro

El sistema compara `User.termsVersion` / `privacyVersion` con `LEGAL.*`. Una cuenta antigua o con `null` es `stale`. 10.7 no bloquea el uso ni pide un nuevo checkbox automático. En web 11.0 el aviso es no bloqueante en `/me`.

Checklist de tester web: [release/WEB-BETA-QA.md](release/WEB-BETA-QA.md).
