# 19 — Importación de catálogo

El catálogo es el corazón. Se **importa**; no se escribe a mano carta por carta (salvo correcciones admin).

## Principios

1. Fuentes **públicas o licenciables**. Atribuir en `CardVariant.externalIds` y en `/legal/fuentes`.
2. **Prohibido** scrapear TCGMatch, TCGPlayer storefront, Facebook, etc.
3. Idempotente: re-correr un set no duplica cartas (`unique(set.gameId, set.code)`, `unique(setId, number, name)` — ajustar si el publisher usa números repetidos).
4. Game-specific → `Card.attributes` JSON (contrato CATALOG.1/2). El importer conoce el juego; search/UI leen `GameFilterDefinition`.
5. Imágenes: respetar ToS de cada API. Si no se puede redistribuir el arte, guardar URL de origen o placeholder.

## TCG Fase 1 — fuentes

| Juego | slug | Fuente primaria | Notas |
|-------|------|-----------------|-------|
| Magic: The Gathering | `magic` | [Scryfall API](https://scryfall.com/docs/api) | `pnpm catalog:import-scryfall -- mh3`. `externalIds.scryfallId` |
| Pokémon | `pokemon` | [Pokémon TCG API](https://docs.pokemontcg.io/) | `pnpm catalog:import-pokemon -- xy1`. `POKEMON_TCG_API_KEY` opcional. `externalIds.pokemonTcgApiId` |
| One Piece / Yu-Gi-Oh! / Digimon / Gundam | ver [REAL-DATA-SOURCES](catalog/REAL-DATA-SOURCES.md) | curated `pnpm catalog:seed-reference` | Sin scrape masivo. PARTIAL. |
| Mitos y Leyendas | `mitos-y-leyendas` | reference fixtures + `pnpm catalog:import-myl` / `catalog:seed-myl-demo` | Pack curado local. **Prohibido** scrape de storefronts. PARTIAL. |

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
pnpm catalog:seed-reference
pnpm catalog:import-myl
pnpm catalog:import-myl -- ./data/myl-demo.json
pnpm catalog:import-myl -- --file ./data/myl-demo.json --dry-run
pnpm catalog:import-myl -- --force
pnpm catalog:seed-myl-demo
pnpm catalog:import-scryfall -- mh3
pnpm catalog:import-pokemon -- xy1
pnpm catalog:reference:refresh -- --game pokemon
```

`catalog:import-myl` acepta el pack curado del repo o un JSON local (`name`, `set`, `number`, `rarity`, `imageUrl`, `attributes`). Parser + normalizador + dedupe. Nunca borra cartas. Resumen: `Imported` / `Updated` / `Skipped` / `Conflicts`. `--dry-run` no escribe.

El importer **solo actualiza** cartas con `attributes.source = myl-demo-pack`. Cualquier otra procedencia (`catalog-submission`, proveedor oficial, fixture curado, etc.) entra en `Conflicts` y no se sobrescribe. `--force` es la única excepción explícita. `catalog:seed-myl-demo` **no** pasa `--force`.

## Carga masiva de **listings** (no catálogo)

CSV del vendedor (BULK.1) queda **fuera de este incremento**. El catálogo ya debe existir antes de publicar un listing; si falta la carta, el usuario envía `CatalogSubmission`.

## Seed local (Fase 2)

Sin llamar APIs externas en CI:

- 3 games
- 1 set cada uno
- 8–12 cartas fake **con nombres genéricos de test** (`Test Mon #1`), no arte con copyright, para tests.

Staging/prod: [STAGING-CATALOG.md](runbooks/STAGING-CATALOG.md) (`seed-reference` + 2–4 sets Magic/Pokémon, `SHOW_SYNTHETIC_CATALOG=false`).


