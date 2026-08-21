# 10 — Mobile

## Stack

Expo (dev build, no limitar a Expo Go cuando haya cámara nativa real). React Native + TypeScript + Expo Router + TanStack Query.

Un codebase → Android e iOS.

## Relación con la API

Idénticos contratos que web. Misma versión `/v1`. Auth: SecureStore para refresh; access en memoria.

## Tab bar (firma de producto)

```text
Inicio | Buscar | Escanear | Lista | Perfil
```

`Escanear` es el botón central visualmente destacado. En fases anteriores a 17:

- Abre una pantalla “Próximamente” **o** un flujo manual: cámara para **adjuntar foto** a una publicación (sin reconocimiento).
- No fingir que identificó “Charizard ex” con un mock aleatorio.

## Pantallas MVP 1

- Onboarding/login (Google, Apple, email).
- Home: juegos + búsqueda.
- Buscador.
- Ficha de carta.
- Favoritos.
- Perfil.

## Pantallas MVP 2–3

- Vender (wizard).
- Mis publicaciones.
- Carrito y checkout (WebView o SDK MP según recomendación oficial de Mercado Pago para RN).
- Compras / ventas.
- Push: registrar token Expo en `POST /v1/me/push-tokens` (agregar en Fase 11).

## Checkout en mobile

Preferir **Checkout Pro** (init_point) en browser/in-app browser oficial MP. No reimplementar el formulario de tarjeta.

## Escáner (Fase 17 — diseño)

```text
Cámara → modelo on-device o API de visión
  → TCG, set, número, idioma, variante
  → Acciones: Agregar colección | Vender | Ver precios
```

Requisitos futuros: dataset de entrenamiento, permisos de cámara, fallback búsqueda manual. Fuera de MVP.

## Offline

No es requisito MVP. Lista de favoritos cacheada con TanStack persist opcional más adelante.

## Stores

Cuentas Apple/Google, privacy nutrition labels, Sign in with Apple si hay otros OAuth sociales en iOS.

## Lo que no se duplica

- Lógica de órdenes, comisiones, stock.
- Catálogo local paralelo.
- Otro backend “para la app”.
