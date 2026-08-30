# Card.attributes contract (CATALOG.1)

`Card.attributes` is JSONB, default `{}`. Codes are canonical (e.g. `FIRE`, `MONSTER`, `ALIADO`). Labels es-CL live in `GameFilterDefinition`, not in the row.

Validation: `packages/validation/src/card-attributes.ts` (Zod, passthrough unknown keys). Importers should parse before persist. Extra keys are reported by `inspectCardAttributes` / `GET /v1/admin/catalog/cards/:id/attributes` (read-only).

## Common columns (not JSON)

| Field | Where |
|-------|--------|
| set, number, name, rarity, supertype | `Card` |
| language, finish, finishDetail | `CardVariant` |
| condition, price, stock | `Listing` |

Do not store condition/price/seller in `attributes`.

## Per-game keys (omit if the source has no value)

**Pokémon:** `cardType`, `pokemonType[]`, `stage`, `hp`, `regulationMark`, `ruleBox[]`

**Yu-Gi-Oh!:** `category`, `attribute`, `monsterType[]`, `cardTypes[]`, `level`, `atk`, `def`, `pendulumScale`, `linkRating`, `spellTrapIcon`

**Magic:** `manaCost`, `manaValue` (and legacy `cmc`), `colors[]`, `colorIdentity[]`, `cardType`, `subtypes[]`, `power`, `toughness`, `keywords[]`, `legalities[]`, `oracleText`, `typeLine`

**Mitos y Leyendas:** `cardType` (ALIADO/TALISMAN/TOTEM/ARMA/ORO/MONUMENTO), `raza` (códigos canónicos demo `ANDINO`/`COSTERO`/`AUSTRAL`, no razas oficiales), `coste`, `fuerza`, `era`, `legalidad`

**One Piece:** `cardType`, `color`, `cost`, `power`, `attribute`

**Digimon / Gundam:** schemas exist; no importer yet. Do not invent values.

`source` records origin (`scryfall`, `showcase-seed`, `seed`).
