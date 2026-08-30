# CATALOG.2 audit (before code)

Date: 2026-08-30. CATALOG.1 architecture is kept (`GameFilterDefinition` + `Card.attributes` JSONB + `attr.*`). This file records **what is demo vs real** in the repo. Showcase cards are **not** evidence that a filter is correct.

## Errors found in CATALOG.1

1. Showcase names (Ember Pup, Shadow Duel Demo, Andes Demo) were treated as if they validated game taxonomies.
2. MyL demo races `ANDINO` / `COSTERO` / `AUSTRAL` were stored **and** hardcoded as labels, so they could appear as filter options.
3. MyL `legalidad` was a timeless boolean-like enum (`LEGAL`) with no format/version.
4. Pokémon `pokemonType` was shown for Energy as well as Pokémon (`visibleWhen` included ENERGY). Official energy type applies to Pokémon cards.
5. Pokémon used invented `stage` / `ruleBox` instead of provider `subtypes`, HP, retreat, weakness, regulation.
6. Magic mapper kept a single `cardType` from `type_line` (drops Artifact from “Artifact Creature”) and treated `power`/`toughness` strings as numeric ranges (`*` is valid Magic).
7. Yu-Gi-Oh mixed Level/Rank into one `level` filter; Link/Pendulum/DEF visibility was only `category=MONSTER`.
8. One Piece stored a single `color` string; no Life/Counter/traits/block/illustration type.
9. Digimon and Gundam had filter **definitions only** — no game rows, no importer, no real cards.
10. Filter option fallback `staticOptions(labels)` could invent options that do not exist in the catalog.
11. `source` was a loose string (`showcase-seed`) without quality / URL / retrievedAt / external id on the card.

## Per-game table

| Game | slug | Current attributes (CATALOG.1) | Current filters | Source in repo | Demo | Real | Incorrect | Missing | Importer exists | Importer missing |
|------|------|--------------------------------|-----------------|----------------|------|------|-----------|---------|-----------------|------------------|
| Pokémon | `pokemon` | `cardType`, `pokemonType[]`, `stage`, `hp`, `regulationMark`, `ruleBox[]` | set, cardType, pokemonType, stage, hp, regulation, ruleBox | showcase-seed + catalog Test Mon | Ember Pup etc.; Test Mon | none | Energy sees pokemonType; stage not provider subtypes; no weakness/retreat | subtypes, pokemonTypes, evolvesFrom, retreat, weaknesses, legalities, illustrator, Rare Holo EX etc. | **no** | Pokémon TCG API |
| Magic | `magic` | `manaCost`, `manaValue`, `cmc`, `colors[]`, `colorIdentity[]`, `cardType` (single), `subtypes[]`, `power`/`toughness` strings, keywords, legalities | color, identity, cardType SELECT, subtypes, MV, power/toughness ranges, format, keywords | Scryfall mapper **real** when imported; showcase Archive of Sparks is demo | Amberbolt Adept etc. | Scryfall import only if operator ran `catalog:import-scryfall` | numeric range on raw P/T; single cardType | `cardTypes[]`, `supertypes[]`, `powerNumeric`/`toughnessNumeric`, `powerText`/`toughnessText` | **yes** Scryfall | — |
| Yu-Gi-Oh! | `yugioh` | `category`, `attribute`, `monsterType[]`, `cardTypes[]` as mechanics, `level`, atk/def, pendulum, link, spellTrapIcon | category, attribute, monster type, mechanics, **Nivel/Rango combined**, ATK/DEF, pendulum, link, icon | showcase Shadow Duel Demo | Glyphbound Sentinel etc. | none | Level=Rank; invented cards | separate rank/link; mechanics vs types; real print (Blue-Eyes) | **no** (Konami scrape not allowed) | licensed/YGOPRODeck TBD; **PARTIAL** + curated fixture |
| Mitos y Leyendas | `mitos-y-leyendas` | `cardType`, `raza` ANDINO/COSTERO/AUSTRAL, coste, fuerza, era, legalidad | tipo, raza (demo labels), coste, fuerza, era, legalidad | Andes Demo | all 6 cards | none | invented races; Common/Rare not frecuencia MyL; legalidad unversioned | ANCESTRAL/SOMBRA/… from catalog; edición; versioned formats | **no** | official MyL; no mass scrape |
| One Piece | `one-piece` | `cardType`, `color`, `cost`, `power`, `attribute` | type, color, cost, power, attribute | Grand Line Demo | Dockside Lookout etc. | none | single color; no Leader/Event/Stage samples | `colors[]`, counter, life, traits, blockIcon, illustrationType, trigger | **no** | Bandai card list |
| Digimon | `digimon` | schema only | color, cardType, level, playCost, DP, form, attribute, type | definition only | n/a | none | n/a | game row + real cards | **no** | official DCG list |
| Gundam | `gundam` | schema only | type, color, level, cost, sourceTitle, traits, alt art | definition only | n/a | none | n/a | AP/HP/zones/link; game row + real cards | **no** | official GCG site |

`it-game-*` and `catalog:seed` Test Mon remain CI fixtures (`source=seed`). Not used as taxonomy proof.

## Provider checks (2026-08-30)

**Pokémon TCG API** `GET https://api.pokemontcg.io/v2/cards/xy1-1` (no key):

| Field | API |
|-------|-----|
| id | `xy1-1` |
| name | Venusaur-EX |
| set | XY (`xy1`) |
| number | 1 |
| supertype | Pokémon |
| subtypes | Basic, EX |
| hp | `"180"` (string) |
| types | Grass |
| rarity | Rare Holo EX |
| weaknesses | Fire ×2 |
| convertedRetreatCost | 4 |
| artist | Eske Yoshinob |
| legalities | unlimited, expanded Legal |
| regulationMark | **absent** |

**Scryfall** (named / set+number):

| Card | set/n | type_line | colors | P/T |
|------|-------|-----------|--------|-----|
| Grizzly Bears | 10e/268 | Creature — Bear | G | `"2"`/`"2"` |
| Lightning Helix | mkm/218 | Instant | R,W | null |
| Sol Ring | msc/211 | Artifact | [] | null |
| Lightning Bolt | m10/146 | Instant | R | null |
| Counterspell | dsc/114 | Instant | U | null |

**YGOPRODeck** (verify only, not production importer): Blue-Eyes White Dragon id `89631139`, Normal Monster, LIGHT, Dragon, level 8, ATK 3000, DEF 2500. Konami DB remains the conceptual source; no Konami scrape.

**MyL / One Piece / Digimon / Gundam:** no licensed bulk API in repo. Reference fixtures will be **CURATED_VERIFIED** with official URLs (tor.myl.cl / Bandai / world.digimoncard.com / gundam-gcg.com). Stats for Mitra, La Mayoría, Shanks OP09-001, Agumon BT14-007, Gundam GD01-001 taken from those official lists as specified — not from showcase.

## Support after CATALOG.2 (plan)

| Game | Target | Why not FULL |
|------|--------|----------------|
| Pokémon | PARTIAL | Importer exists; reference set is tiny vs live catalog |
| Magic | PARTIAL | Scryfall importer real; default DB still mostly showcase unless imported |
| Yu-Gi-Oh! | PARTIAL | Curated fixture only |
| MyL | PARTIAL | Curated fixtures; no importer; legalidad omitted until versioned source |
| One Piece | PARTIAL | Curated fixtures |
| Digimon | PARTIAL | Curated fixtures + game row |
| Gundam | PARTIAL | Curated fixtures + game row |

FULL requires importer + populated principal attrs + real filter options + provider-verified tests. None of that is true for a complete live catalog on day one of CATALOG.2.
