# 00 — Visión

## Problema

En Chile, comprar y vender cartas TCG sigue fragmentado: grupos de Facebook, WhatsApp, ferias, tiendas físicas y un marketplace especializado. El coleccionista no tiene un solo lugar donde:

1. saber **qué vale** una carta;
2. **comprar y vender** con pago protegido;
3. **llevar su colección**;
4. recibir **alertas** cuando aparece lo que busca;
5. y, a futuro, **escanear**, armar mazos y participar en comunidad.

## Producto

**TCG Platform** (nombre de trabajo: TCG Market Chile) es una plataforma integral para coleccionistas, jugadores y tiendas TCG.

No es solo un marketplace. El marketplace es el primer pilar comercial. La retención viene de colección, precios y alertas.

```text
                 TCG PLATFORM

        ┌───────────┼───────────┐
        │           │           │
   MARKETPLACE   COLECCIÓN   PRECIOS
        │           │           │
     COMUNIDAD ─── JUEGO ─── TIENDAS
```

| Pilar | Qué resuelve | Cuándo |
|-------|----------------|--------|
| Marketplace | Publicar, comprar, pagar, enviar | MVP 2–3 |
| Colección | Inventario personal valorizado | Fase 12 |
| Precios | Historial, mercado, sugerencia al vender | Fase 13 |
| Tiendas | Cuenta negocio, stock, retiro | Fase 15 |
| Juego | Decks, eventos, torneos | Fase 3 del producto |
| Comunidad | Perfiles, reputación, mensajes | Reputación en MVP 3; resto después |

## Tres productos, un sistema

```text
                  ┌─────────────────┐
                  │   WEB / PWA     │
                  │ Next.js         │
                  └────────┬────────┘
                           │
┌──────────────────┐       ▼        ┌──────────────────┐
│   APP ANDROID    │ ───► API ◄──── │     APP iOS      │
│ React Native     │                │ React Native     │
└──────────────────┘       │        └──────────────────┘
                           │
                    ┌──────▼───────┐
                    │  PostgreSQL  │
                    └──────────────┘
```

La web y la app **no tienen bases de datos propias**. Toda mutación pasa por la API.

## Usuarios

| Actor | Objetivo |
|-------|----------|
| Coleccionista | Buscar cartas, guardar favoritos, armar colección, comprar |
| Vendedor persona | Publicar cartas propias, cobrar, despachar o entregar |
| Tienda | Stock, pedidos, retiro en local, reputación comercial |
| Moderador | Revisar reportes, listings, disputas leves |
| Admin | Operar la plataforma, catálogo, pagos, configuración |

Cualquier usuario verificado puede vender. `SELLER` no es una casta aparte: es un rol que se activa al completar onboarding de vendedor. `STORE` es una cuenta de negocio.

## Principios de producto

1. **Catálogo primero.** Sin carta canónica no hay listing de calidad.
2. **Agnóstico al juego.** Agregar Yu-Gi-Oh! o Mitos y Leyendas no cambia el modelo.
3. **Publicar en menos de 60 segundos** si la carta ya está en el catálogo.
4. **Pago protegido.** El dinero no se libera al vendedor hasta confirmación o timeout de recepción.
5. **Identidad propia.** Inspiración de TCGPlayer, Cardmarket, PriceCharting, StockX y TCGMatch; ninguna interfaz copiada.
6. **Chile real.** CLP, comunas, Chilexpress/Blue Express, encuentro presencial, Mercado Pago.
7. **API-first.** Las pantallas consumen contratos; no al revés.

## Ventaja competitiva (no copiar el techo de TCGMatch)

El MVP debe ser un marketplace sólido. La diferenciación explícita, en este orden:

1. Historial de precios por variante.
2. Colección personal con valor estimado en CLP.
3. Wishlist con precio objetivo y notificación.
4. Precio sugerido al publicar (mercado / mínimo / sugerido).
5. Escáner de cartas en la app (Fase 17), con el botón central de la tab bar como firma visual.

## Tono e identidad (provisional)

Hasta definir marca:

- Visual: limpio, denso en datos (precios, condiciones), no “gaming caótico”.
- Confianza: condición normalizada, fotos reales, reputación visible.
- Color y logo: pendientes. No usar paletas ni naming de TCGMatch.

Navegación web objetivo:

```text
LOGO    Buscar cartas, sets, productos...

Cartas  Sellados  Ofertas  Subastas  Tiendas  Precios  Colecciones
                                              ❤️  🛒  👤
```

Navegación mobile objetivo:

```text
Inicio | Buscar | Escanear | Lista | Perfil
```

`Escanear` puede existir como placeholder en la app antes de la Fase 17, sin reconocimiento real.
