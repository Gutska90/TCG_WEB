# Real catalog data sources (CATALOG.2)

CI never calls live providers. Reference fixtures live in `apps/api/src/catalog/reference-catalog/fixtures` (metadata only, no image binaries). Refresh:

```bash
pnpm catalog:reference:refresh -- --game pokemon
pnpm catalog:reference:refresh -- --game magic --write
```

Games without a safe API stay **manual** (edit the JSON + `retrievedAt`).

## Pokémon

| | |
|--|--|
| Source | [Pokémon TCG API](https://docs.pokemontcg.io/) |
| URL | `https://api.pokemontcg.io/v2/cards/{id}` |
| Import | `pnpm catalog:import-pokemon -- xy1` (`PokemonTcgApiImporter`) |
| Auth | Optional `POKEMON_TCG_API_KEY` → header `X-Api-Key`. Never sent to the frontend. Without key: public rate limit. |
| License | Provider ToS; store remote image URLs, do not commit art. |
| Attributes | See [CARD-ATTRIBUTES](CARD-ATTRIBUTES.md). `hp` arrives as a string; mapper parses int. `regulationMark` omitted when absent. |
| Limits | Reference set is tiny vs live. Support stays PARTIAL. |
| Refresh | `catalog:reference:refresh --game pokemon` (dry-run unless `--write`). |

## Magic: The Gathering

| | |
|--|--|
| Source | [Scryfall API](https://scryfall.com/docs/api) |
| URL | `https://api.scryfall.com/cards/{set}/{number}` or named lookup |
| Import | `pnpm catalog:import-scryfall -- 10e` (existing importer, not a second one) |
| License | Scryfall ToS; rate-limit ~50–100 ms between pages. Image URLs allowed. |
| Attributes | `cardTypes[]` from `type_line`; numeric P/T only when finite. |
| Limits | Default DB is still showcase unless an operator imports. PARTIAL. |
| Refresh | `--game magic`. |

## Yu-Gi-Oh!

| | |
|--|--|
| Source | Konami official card database (conceptual). YGOPRODeck used **once** to verify password `89631139` / LOB-EN001. |
| URL | `https://www.db.yugioh-card.com/` |
| Import | **None.** No Konami scrape. No production YGOPRODeck importer (ToS/rate limits not contracted). |
| Fixture | Blue-Eyes White Dragon, LOB-EN001, LIGHT / Dragon / NORMAL / Level 8 / 3000/2500. |
| Limits | PARTIAL; curated fixture only. |

## Mitos y Leyendas

| | |
|--|--|
| Source | Official Fénix API consumed by [TOR](https://tor.myl.cl/): `https://api.myl.cl/cards/edition/{slug}` |
| Import | `pnpm catalog:import-myl-tor` / `catalog:enrich-myl`. Fallback pack: `catalog:import-myl`. **None from marketplaces.** No Serena/Stribog/Tradeck scrape. |
| Fixtures | Mitra, La Mayoría, Relámpago, Stonehenge, Excalibur, El Dorado + live PE/PB editions from TOR. |
| Limits | Raza from catalog values only. Legality filter omitted until a dated banlist exists. PARTIAL vs full live catalog of later eras. |
| Refresh | Operator: `catalog:import-myl-tor`. CI mocks the payload. |

## One Piece

| | |
|--|--|
| Source | [Bandai One Piece Card Game](https://en.onepiece-cardgame.com/) |
| Import | **None.** |
| Fixtures | Shanks OP09-001 (Leader Red 5000/5 Slash block 3); Uta OP09-002; Gum-Gum Pistol OP01-029; Marineford OP02-025. |
| Limits | PARTIAL. Event/Stage fixtures store type/color only when other stats were not re-verified in-session. |

## Digimon

| | |
|--|--|
| Source | [official Digimon Card Game card list](https://world.digimoncard.com/) |
| Import | **None.** |
| Fixture | Agumon BT14-007 SR Digimon Lv.3 Red play 3 DP 1000 Rookie Vaccine Reptile. |
| Limits | PARTIAL. Game row created by `catalog:seed-reference`. |

## Gundam

| | |
|--|--|
| Source | [official Gundam Card Game](https://www.gundam-gcg.com/) |
| Import | **None.** |
| Fixture | Gundam GD01-001 LR UNIT Blue Lv.4 Cost 3 AP 3 HP 3, Earth Federation / White Base Team, Mobile Suit Gundam, Newtype Rising. |
| Limits | PARTIAL. Game row created by `catalog:seed-reference`. |
