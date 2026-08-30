import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  getGameFilterDefinition,
  isCommonSearchKey,
  labelForFilterValue,
  type CatalogFilterDef,
} from "@tcg/config";
import type { GameFiltersView, GameFilterOptionView, GameFilterView } from "@tcg/types";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "./catalog.service";

@Injectable()
export class GameFiltersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  async forGame(slug: string): Promise<GameFiltersView> {
    const game = await this.catalog.getGame(slug);
    const definition = getGameFilterDefinition(slug);
    const optionMap = await this.loadOptions(slug, definition.filters);
    const filters: GameFilterView[] = definition.filters
      .filter((filter) => filter.key !== "q")
      .map((filter) => {
        const options = optionMap.get(filter.key) ?? staticOptions(filter);
        return {
          key: filter.key,
          label: filter.label,
          group: filter.group,
          type: filter.type,
          multi: Boolean(filter.multi || filter.type === "MULTI_SELECT"),
          range: Boolean(filter.range || filter.type === "NUMBER_RANGE"),
          order: filter.order,
          visibleWhen: filter.visibleWhen,
          options,
        };
      })
      .filter((filter) => shouldExposeFilter(filter, definition.filters, optionMap));

    return {
      game: { id: game.id, slug: game.slug, name: game.name },
      support: definition.support,
      source: definition.source,
      missing: definition.missing,
      filters,
    };
  }

  private async loadOptions(slug: string, filters: CatalogFilterDef[]): Promise<Map<string, GameFilterOptionView[]>> {
    const map = new Map<string, GameFilterOptionView[]>();
    const [sets, rarities, supertypes] = await Promise.all([
      this.prisma.tcgSet.findMany({
        where: { game: { slug, isActive: true } },
        orderBy: [{ releasedAt: "desc" }, { name: "asc" }],
        select: { slug: true, name: true, code: true },
      }),
      this.distinctColumn(slug, Prisma.sql`c.rarity`),
      this.distinctColumn(slug, Prisma.sql`c.supertype`),
    ]);
    map.set(
      "set",
      sets.map((set) => ({ value: set.slug, label: `${set.name} (${set.code})` })),
    );
    map.set("rarity", rarities.map((value) => ({ value, label: value })));
    map.set("supertype", supertypes.map((value) => ({ value, label: value })));

    for (const filter of filters) {
      if (filter.source.kind !== "json") continue;
      const values = filter.source.array
        ? await this.distinctJsonArray(slug, filter.source.path)
        : await this.distinctJsonText(slug, filter.source.path);
      map.set(
        filter.key,
        values.map((value) => ({ value, label: labelForFilterValue(filter, value) })),
      );
    }
    return map;
  }

  private async distinctColumn(slug: string, column: Prisma.Sql): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ value: string }>>(Prisma.sql`
      SELECT DISTINCT ${column} AS value
      FROM cards c
      INNER JOIN sets s ON s.id = c.set_id
      INNER JOIN tcg_games g ON g.id = s.game_id
      WHERE g.slug = ${slug} AND g.is_active = true AND ${column} <> ''
      ORDER BY 1
      LIMIT 80
    `);
    return rows.map((row) => row.value).filter(Boolean);
  }

  private async distinctJsonText(slug: string, path: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ value: string | null }>>(Prisma.sql`
      SELECT DISTINCT c.attributes->>${path} AS value
      FROM cards c
      INNER JOIN sets s ON s.id = c.set_id
      INNER JOIN tcg_games g ON g.id = s.game_id
      WHERE g.slug = ${slug}
        AND g.is_active = true
        AND jsonb_exists(c.attributes, ${path})
        AND jsonb_typeof(c.attributes->${path}) <> 'null'
        AND c.attributes->>${path} <> ''
      ORDER BY 1
      LIMIT 80
    `);
    return rows.map((row) => row.value).filter((value): value is string => Boolean(value));
  }

  private async distinctJsonArray(slug: string, path: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ value: string | null }>>(Prisma.sql`
      SELECT DISTINCT jsonb_array_elements_text(c.attributes->${path}) AS value
      FROM cards c
      INNER JOIN sets s ON s.id = c.set_id
      INNER JOIN tcg_games g ON g.id = s.game_id
      WHERE g.slug = ${slug}
        AND g.is_active = true
        AND jsonb_typeof(c.attributes->${path}) = 'array'
      ORDER BY 1
      LIMIT 80
    `);
    return rows.map((row) => row.value).filter((value): value is string => Boolean(value));
  }
}

function staticOptions(filter: CatalogFilterDef): GameFilterOptionView[] {
  if (!filter.labels) return [];
  return Object.entries(filter.labels).map(([value, label]) => ({ value, label }));
}

function shouldExposeFilter(
  filter: GameFilterView,
  defs: CatalogFilterDef[],
  optionMap: Map<string, GameFilterOptionView[]>,
): boolean {
  if (filter.type === "TEXT" || filter.type === "NUMBER_RANGE" || filter.type === "BOOLEAN") return true;
  if (filter.key === "language" || filter.key === "finish" || filter.key === "condition") return true;
  if (filter.key === "price" || filter.key === "hasListings") return true;
  if (isCommonSearchKey(filter.key) && filter.key === "set") return (optionMap.get("set") ?? []).length > 0;
  const options = optionMap.get(filter.key) ?? [];
  if (filter.type === "SELECT" || filter.type === "MULTI_SELECT") {
    if (options.length === 0) return false;
  }
  const def = defs.find((item) => item.key === filter.key);
  if (def?.visibleWhen && options.length === 0) return false;
  return true;
}
