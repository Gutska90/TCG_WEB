# Card.attributes contract (CATALOG.1 + CATALOG.2)

`Card.attributes` is JSONB, default `{}`. Codes are canonical (`FIRE`, `MONSTER`, `ALIADO`). Labels es-CL live in `GameFilterDefinition`.

Validation: `packages/validation/src/card-attributes.ts` (Zod, passthrough). Extra keys are reported by `inspectCardAttributes`.

Provenance on every imported/reference card:

| Key | Meaning |
|-----|---------|
| `source` | provider id (`pokemon-tcg-api`, `scryfall`, `tor.myl.cl`, `myl-demo-pack`, `catalog-submission`, …) |
| `sourceQuality` | `VERIFIED_PROVIDER` \| `CURATED_VERIFIED` \| `SYNTHETIC` |
| `sourceUrl` | fetch URL |
| `sourceId` | provider id (not the printed name) |
| `sourceRetrievedAt` | ISO time |
| `verified` | `true` only when attributes were checked against a provider or official list |

`sourceQuality`, `verified`, and `SHOW_SYNTHETIC_CATALOG` are **not interchangeable**:

| Knob | Controls | Does not control |
|------|----------|------------------|
| `sourceQuality=SYNTHETIC` | Showcase/fixture rows (Ember Pup, Andes Demo, Test Mon). `isSyntheticCardAttributes` is also true when `source` is `synthetic-showcase`, `showcase-seed`, or `seed`. | Completeness of stats |
| `sourceQuality=CURATED_VERIFIED` | Human-entered identity from a known edition or admin approval (MyL demo pack, official-list fixtures, approved `CatalogSubmission`) | Whether every stat is provider-complete |
| `sourceQuality=VERIFIED_PROVIDER` | Live importer (Scryfall, Pokémon TCG API) | Visibility flags |
| `verified` | Stats/identity QA: `true` for importer + `seed-reference` fixtures; `false` when names are curated but stats are PARTIAL | Public visibility |
| `SHOW_SYNTHETIC_CATALOG=false` | Hides only synthetic-showcase rows from public search and REST game/set/card pages | Curated or provider rows, including `verified: false` |

`CURATED_VERIFIED` + `verified: false` is **intentional** for `source=myl-demo-pack` and `source=catalog-submission`. Retagging those as `SYNTHETIC` would hide the commercial MyL demo (and newly approved cards) when staging sets `SHOW_SYNTHETIC_CATALOG=false`.

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
