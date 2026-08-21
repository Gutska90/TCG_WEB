# 19 — Importación de catálogo

El catálogo es el corazón. Se **importa**; no se escribe a mano carta por carta (salvo correcciones admin).

## Principios

1. Fuentes **públicas o licenciables**. Atribuir en `CardVariant.externalIds` y en `/legal/fuentes`.
2. **Prohibido** scrapear TCGMatch, TCGPlayer storefront, Facebook, etc.
3. Idempotente: re-correr un set no duplica cartas (`unique(set.gameId, set.code)`, `unique(setId, number, name)` — ajustar si el publisher usa números repetidos).
4. Game-specific → `Card.attributes` JSON. El importer conoce el juego; el resto de la app no.
5. Imágenes: respetar ToS de cada API. Si no se puede redistribuir el arte, guardar URL de origen o placeholder.

## TCG Fase 1 — fuentes

| Juego | slug | Fuente primaria | Notas |
|-------|------|-----------------|-------|
| Magic: The Gathering | `magic` | [Scryfall API](https://scryfall.com/docs/api) | Mejor calidad. Respetar rate limit. `externalIds.scryfallId` |
| Pokémon | `pokemon` | [Pokémon TCG API](https://docs.pokemontcg.io/) | `externalIds.pokemonTcgApiId`. Verificar ToS de imágenes |
| One Piece | `one-piece` | Definir en Fase 2 (API comunitaria documentada o dataset propio curado) | No bloquear Magic+Pokémon si One Piece tarda |

TCG posteriores (Yu-Gi-Oh!, Mitos y Leyendas, Lorcana, Digimon, Riftbound, FaB, Gundam): mismo patrón, **nuevo importer**, cero cambios de esquema.

## Pipeline

```text
CLI o job admin “Import set”
  → fetch remoto
  → map a TcgGame / Set / Card / CardVariant
  → upsert
  → AuditLog catalog.imported
```

Runtime: `apps/api` o `packages/importers`. **No** importar en el request HTTP del usuario. El admin dispara el job.

### Variantes

Una carta Scryfall/Pokémon puede generar N `CardVariant` (idioma, finish). Si la fuente no trae todos los idiomas, crear al menos `EN` + `NORMAL`/`HOLO` según el dato. Idiomas extra se agregan en reimport o a mano.

### Slugs web

- `TcgGame.slug`: `pokemon`, `magic`, `one-piece`
- `TcgSet.slug`: único por game, URL-safe: `151`, `mh3`
- `Card.slug`: único por set: `charizard-ex`

Slugs implementados en Fase 2. Reimportar un set reutiliza el slug existente (`unique(setId, number, name)`).

## CLI local

```bash
pnpm catalog:seed
# opcional, llama Scryfall (rate limit ~80ms entre páginas):
pnpm catalog:import-scryfall -- mh3
```

## Seed local (Fase 2)

Sin llamar APIs externas en CI:

- 3 games
- 1 set cada uno
- 8–12 cartas fake **con nombres genéricos de test** (`Test Mon #1`), no arte con copyright, para tests.

Staging/prod: import real.

## Carga masiva de **listings** (no catálogo)

CSV vendedor/tienda (segunda etapa): `variantExternalId, condition, qty, priceClp`. El catálogo ya debe existir. Archivo distinto al importer de cartas.
