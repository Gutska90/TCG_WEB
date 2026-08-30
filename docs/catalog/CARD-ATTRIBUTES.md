# Card.attributes contract (CATALOG.1 + CATALOG.2)

`Card.attributes` is JSONB, default `{}`. Codes are canonical (`FIRE`, `MONSTER`, `ALIADO`). Labels es-CL live in `GameFilterDefinition`.

Validation: `packages/validation/src/card-attributes.ts` (Zod, passthrough). Extra keys are reported by `inspectCardAttributes`.

Provenance on every imported/reference card:

| Key | Meaning |
|-----|---------|
| `source` | provider id (`pokemon-tcg-api`, `scryfall`, `tor.myl.cl`, …) |
| `sourceQuality` | `VERIFIED_PROVIDER` \| `CURATED_VERIFIED` \| `SYNTHETIC` |
| `sourceUrl` | fetch URL |
| `sourceId` | provider id (not the printed name) |
| `sourceRetrievedAt` | ISO time |
| `verified` | true for reference/provider data |

`CardVariant.externalIds` holds provider ids (`pokemonTcgApiId`, `scryfallId`, `konamiPassword`, `bandaiNumber`, `torPath`).

## Common columns (not JSON)

| Field | Where |
|-------|--------|
| set, number, name, rarity, supertype | `Card` |
| language, finish, finishDetail | `CardVariant` |
| condition, price, stock | `Listing` |

## Per-game keys (omit if the source has no value)

**Pokémon:** `cardType` POKEMON/TRAINER/ENERGY, `subtypes[]`, `pokemonTypes[]` (Pokémon cards only in UI), `hp`, `evolvesFrom`, `evolvesTo[]`, `regulationMark`, `retreatCost`, `weaknesses[]` / `weaknessTypes[]`, `resistances[]`, `attackCosts[]`, `maxAttackEnergyCost`, `illustrator`, `legalities[]`. Do not persist attack text.

**Yu-Gi-Oh!:** `category`, `attribute`, `monsterType[]`, `mechanics[]` (NORMAL/EFFECT/XYZ/LINK/…), `level`, `rank`, `atk`, `def`, `pendulumScale`, `linkRating`, `linkMarkers[]`, `spellTrapIcon`. Level and Rank are separate.

**Magic:** `cardTypes[]` (ARTIFACT+CREATURE), `supertypes[]`, `subtypes[]`, `typeLine`, `powerText`/`toughnessText`, `powerNumeric`/`toughnessNumeric` only when `Number(value)` is finite, `colors[]`, `colorIdentity[]`, `manaValue`, `manaCost`, `keywords[]`, `legalities[]`. Do not store full oracle text in reference fixtures.

**Mitos y Leyendas:** `cardType` ALIADO/TALISMAN/TOTEM/ARMA/ORO (MONUMENTO only if the product uses it), `raza` from catalog (ANCESTRAL, SOMBRA, … — never ANDINO/COSTERO/AUSTRAL), `coste`, `fuerza`, `keywords[]`, `edicion`, `era`. Rarity/frecuencia stays `Card.rarity`. Do not store unversioned `legalidad`.

**One Piece:** `cardType` LEADER/CHARACTER/EVENT/STAGE, `colors[]`, `cost`, `power`, `counter`, `life`, `attribute`, `traits[]`, `blockIcon`, `illustrationType`, `trigger`.

**Digimon:** `colors[]`, `cardType`, `level`, `playCost`, `dp`, `form`, `attribute`, `traits[]`, `digivolutionRequirements[]`.

**Gundam:** `cardType`, `color`, `level`, `cost`, `ap`, `hp`, `zones[]`, `sourceTitle`, `traits[]`, `linkConditions[]`, `alternateArt`.

Showcase demo cards use `source: synthetic-showcase` and `sourceQuality: SYNTHETIC`. They are not proof of taxonomy.
