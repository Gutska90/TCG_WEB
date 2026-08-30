# Game-specific catalog filters (CATALOG.1 + CATALOG.2)

Search is **per `TcgGame.slug`**. Common columns stay on `Card` / `CardVariant` / `Listing`. Game rules live in `Card.attributes` JSON with a typed `GameFilterDefinition` in `@tcg/config`.

No per-game Prisma columns. Adding a TCG is a new definition + importer, not a migration of dozens of nullables.

Options for SELECT/MULTI_SELECT come from **DISTINCT catalog values**. Labels may translate known codes; they must not invent options (MyL `ANDINO`/`COSTERO`/`AUSTRAL` are not real races).

Filters have `tier`: `PRIMARY` (sidebar) or `ADVANCED` (`Más filtros`). `visibleWhen` is a typed expression (`key`/`oneOf`/`all`/`noneOf`). UI must not branch `if (game === "pokemon")`.

Showcase cards are `sourceQuality=SYNTHETIC`. Public staging can hide them with `SHOW_SYNTHETIC_CATALOG=false`.

## Support matrix (CATALOG.2)

FULL requires a live importer, populated principal attributes, real filter options, provider-verified tests, and a verified provider. None of that is true for a complete live catalog yet.

| Game | slug | Support | Source | Missing |
|------|------|---------|--------|---------|
| Pokémon | `pokemon` | PARTIAL | Pokémon TCG API importer + `xy1-1` fixture | live catalog size; regulationMark only when provider sends it |
| Magic | `magic` | PARTIAL | Scryfall importer + reference snapshots | artist facet; default DB is showcase unless imported |
| Yu-Gi-Oh! | `yugioh` | PARTIAL | curated LOB-EN001 fixture | licensed bulk importer (no Konami scrape) |
| Mitos y Leyendas | `mitos-y-leyendas` | PARTIAL | curated tor.myl.cl fixtures | official frecuencia importer; versioned banlist (legality filter omitted) |
| One Piece | `one-piece` | PARTIAL | curated Bandai list fixtures | Bandai bulk import |
| Digimon | `digimon` | PARTIAL | curated BT14-007 + game row | official bulk importer |
| Gundam | `gundam` | PARTIAL | curated GD01-001 + game row | official bulk importer |

## Contract

- Metadata: `GET /v1/games/:slug/filters` (`PARTIAL`, `tier`, `visibleWhen`, options from DISTINCT).
- Search: `GET /v1/search/cards` + `attr.<key>` whitelist. Unknown → `INVALID_FILTER`. Other game → `FILTER_NOT_SUPPORTED_FOR_GAME`.
- Aliases: `pokemonType`→`pokemonTypes`, Magic `cardType`→`cardTypes`, One Piece `color`→`colors`.
- Facet counts are out of this MVP.

## Indexes

Migration `20260830190000_catalog1_attributes_gin`: `GIN (attributes jsonb_path_ops)`.

## Scripts

```bash
pnpm catalog:attributes:audit
pnpm catalog:attributes:backfill -- --game pokemon --dry-run
pnpm catalog:seed-reference
pnpm catalog:import-pokemon -- xy1
pnpm catalog:import-scryfall -- 10e
pnpm catalog:reference:refresh -- --game pokemon
```

`catalog:seed-reference` is **not** a CI step. Refresh is dry-run unless `--write`.
