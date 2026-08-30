# Game-specific catalog filters (CATALOG.1)

Search is **per `TcgGame.slug`**. Common columns stay on `Card` / `CardVariant` / `Listing`. Game rules live in `Card.attributes` JSON with a typed `GameFilterDefinition` in `@tcg/config`.

No per-game Prisma columns (`pokemonHp`, `yugiohAtk`, …). Adding a TCG is a new definition + importer, not a migration of dozens of nullables.

## Support matrix (real repo, 2026-08-30)

| Game | slug | Support | Source in repo | Missing |
|------|------|---------|----------------|---------|
| Pokémon | `pokemon` | PARTIAL | showcase-seed demo attributes | Pokémon TCG API importer, regulation/ruleBox, official rarities |
| Magic: The Gathering | `magic` | PARTIAL | Scryfall mapper (`colors`, `manaValue`, types, P/T, legalities) + showcase | artist facet; full catalog only after Scryfall import |
| One Piece | `one-piece` | PARTIAL | showcase-seed | Bandai importer, counter, official colors |
| Yu-Gi-Oh! | `yugioh` | PARTIAL | showcase-seed | Konami importer, pendulum/link until data exists |
| Mitos y Leyendas | `mitos-y-leyendas` | PARTIAL | showcase-seed (tipo/raza/coste/fuerza; razas demo ANDINO/COSTERO/AUSTRAL) | official frecuencia, versioned banlist, bloque from provider |
| Digimon | `digimon` | PARTIAL | definition only | no game/importer in database |
| Gundam | `gundam` | PARTIAL | definition only | no game/importer in database |

`it-game-*` fixtures stay hidden from public `GET /v1/games`.

## Contract

- Metadata: `GET /v1/games/:slug/filters` (`FULL` \| `PARTIAL`, filters, options from DISTINCT catalog values).
- Search: `GET /v1/search/cards` keeps Fase 3 params. Game-specific values use **`attr.<key>`** (whitelist from the definition). Unknown key → `INVALID_FILTER` / `FILTER_NOT_SUPPORTED_FOR_GAME`.
- UI must not branch `if (game === "pokemon")` for fields; it renders `filters` + `visibleWhen`.
- Facet **counts** are out of this MVP (options without `count`).

## Indexes

Migration `20260830190000_catalog1_attributes_gin`: `GIN (attributes jsonb_path_ops)` so `@>` containment can use the index. No per-key expression indexes yet.

## Scripts

```bash
pnpm catalog:attributes:audit
pnpm catalog:attributes:backfill -- --game pokemon --dry-run
```

Backfill is idempotent (manaValue from cmc, cardType from supertype when missing). It does not invent provider data.
