# Runbook — catálogo de staging

Bootstrap **después** de `prisma migrate deploy` y **antes** de invitar testers (B8). No crea usuarios, listings ni pagos. `ENABLE_REAL_PAYMENTS` sigue `false`.

`SHOW_SYNTHETIC_CATALOG=false` en `.env.staging` (ver `.env.staging.example`). Así Ember Pup, Andes Demo y Test Mon no salen en búsqueda, facets ni páginas de juego/set.

No scrapear TCGMatch ni storefronts. Imágenes: URL remota permitida por ToS de la fuente; si no hay derecho de redistribución, queda placeholder.

## Orden

```bash
pnpm exec prisma migrate deploy

pnpm catalog:seed-reference

# Magic — 2–4 sets modernos, no toda la historia
pnpm catalog:import-scryfall -- mh3
pnpm catalog:import-scryfall -- blb
pnpm catalog:import-scryfall -- dsk
pnpm catalog:import-scryfall -- fdn

# Pokémon — 2–4 expansiones; POKEMON_TCG_API_KEY opcional (solo API, nunca frontend)
pnpm catalog:import-pokemon -- sv8
pnpm catalog:import-pokemon -- sv6
pnpm catalog:import-pokemon -- sv3
pnpm catalog:import-pokemon -- xy1

pnpm catalog:attributes:audit
```

Yu-Gi-Oh!, MyL, One Piece, Digimon y Gundam quedan en **PARTIAL** con el reference seed. No hay importers masivos en PS.1.

## Verificar synthetic off

En el host de staging:

```bash
# debe ser false
echo "$SHOW_SYNTHETIC_CATALOG"

pnpm staging:preflight -- --env-file .env.staging
```

Si el preflight imprime `Synthetic showcase catalog is visible in staging`, corrige el env y reinicia la API.

Smoke (con API arriba):

- `GET /health` y `GET /ready`
- `/buscar?game=pokemon` — Venusaur-EX / sets importados; **no** Ember Pup
- `/buscar?game=magic` — cartas Scryfall
- `/pokemon/cartas`, `/magic/cartas`, `/{game}/{set}` — mismos filtros metadata-driven
- Un juego sin cartas públicas: “El catálogo de … está en preparación.”

## Re-run

`seed-reference` e import Scryfall/Pokémon son **upsert**. Volver a correr un set no duplica `Card` (`unique(setId, number, name)`).

Listar sets remotos:

- Magic: [Scryfall sets](https://scryfall.com/sets) — código corto (`mh3`, `blb`, …)
- Pokémon: [pokemontcg.io sets](https://docs.pokemontcg.io/#api_v2_sets_get) — id (`sv8`, `xy1`, …)

Refresh de snapshots de reference (dev, dry-run por defecto):

```bash
pnpm catalog:reference:refresh -- --game pokemon
pnpm catalog:reference:refresh -- --game magic
```

`--write` solo en máquina de desarrollo, no como paso de CI.
