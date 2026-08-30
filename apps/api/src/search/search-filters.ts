import { Prisma } from "@prisma/client";
import {
  ERROR_CODES,
  getGameFilterDefinition,
  isCommonSearchKey,
  isKnownCatalogAttrKey,
  isSyntheticCardAttributes,
  loadFeatureFlags,
  normalizeCatalogCode,
  resolveAttrFilterKey,
  sortAllowedForGame,
  SYNTHETIC_ATTRIBUTE_SOURCES,
  type CatalogFilterDef,
} from "@tcg/config";
import { HttpStatus } from "@nestjs/common";
import type { SearchCardsQuery } from "@tcg/validation";
import { AppError } from "../common/errors/app-error";

export function assertSearchFilters(query: SearchCardsQuery): void {
  const attrs = query.attrs ?? {};
  const attrKeys = Object.keys(attrs);
  if (attrKeys.length > 0 && !query.game) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ERROR_CODES.INVALID_FILTER,
      "Los filtros de atributos requieren un juego.",
    );
  }
  if (query.game && !sortAllowedForGame(query.sort, query.game)) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ERROR_CODES.FILTER_NOT_SUPPORTED_FOR_GAME,
      "Ese orden no aplica a este juego.",
      { sort: query.sort, game: query.game },
    );
  }
  if (!query.game && ["hp", "atk", "level", "manaValue"].includes(query.sort)) {
    throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.INVALID_FILTER, "Ese orden requiere un juego.");
  }
  if (attrKeys.length === 0) return;
  const definition = getGameFilterDefinition(query.game);
  for (const key of attrKeys) {
    if (isCommonSearchKey(key) || key === "priceMin" || key === "priceMax") {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.INVALID_FILTER,
        "Ese filtro no se envía como atributo.",
        { key },
      );
    }
    const filter = resolveAttrFilterKey(definition, key);
    if (!filter || filter.source.kind !== "json") {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        isKnownCatalogAttrKey(key)
          ? ERROR_CODES.FILTER_NOT_SUPPORTED_FOR_GAME
          : ERROR_CODES.INVALID_FILTER,
        isKnownCatalogAttrKey(key)
          ? "Ese filtro no aplica a este juego."
          : "Filtro desconocido.",
        { key, game: query.game },
      );
    }
    if (filter.type === "NUMBER_RANGE") {
      const values = attrs[key] ?? [];
      for (const value of values) {
        if (!/^-?\d+(\.\d+)?$/.test(value)) {
          throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.INVALID_FILTER, "Rango inválido.", { key });
        }
      }
    }
  }
}

export function attributeWhereParts(query: SearchCardsQuery): Prisma.Sql[] {
  const attrs = query.attrs ?? {};
  if (!query.game || Object.keys(attrs).length === 0) return [];
  const definition = getGameFilterDefinition(query.game);
  const parts: Prisma.Sql[] = [];
  const rangeHandled = new Set<string>();

  for (const [rawKey, values] of Object.entries(attrs)) {
    const filter = resolveAttrFilterKey(definition, rawKey);
    if (!filter || filter.source.kind !== "json") continue;
    if (filter.type === "NUMBER_RANGE") {
      if (rangeHandled.has(filter.key)) continue;
      rangeHandled.add(filter.key);
      const min = firstNumber(attrs[`${filter.key}Min`] ?? (rawKey.endsWith("Min") ? values : undefined));
      const max = firstNumber(attrs[`${filter.key}Max`] ?? (rawKey.endsWith("Max") ? values : undefined));
      const exact =
        !rawKey.endsWith("Min") && !rawKey.endsWith("Max") ? firstNumber(values) : undefined;
      parts.push(jsonNumericRange(filter.source.path, min ?? exact, max ?? exact));
      continue;
    }
    if (rawKey.endsWith("Min") || rawKey.endsWith("Max")) continue;
    const normalized = values.map((value) => (/\s/.test(value) ? value : normalizeCatalogCode(value)));
    if (filter.source.array || filter.type === "MULTI_SELECT") {
      parts.push(jsonArrayContainsAny(filter.source.path, normalized));
    } else {
      parts.push(jsonTextIn(filter.source.path, normalized));
    }
  }
  return parts;
}

function firstNumber(values: string[] | undefined): number | undefined {
  if (!values?.[0]) return undefined;
  const parsed = Number(values[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function jsonTextIn(path: string, values: string[]): Prisma.Sql {
  const clauses = values.map((value) => {
    const payload = JSON.stringify({ [path]: value });
    return Prisma.sql`c.attributes @> ${payload}::jsonb`;
  });
  return Prisma.sql`(${Prisma.join(clauses, " OR ")})`;
}

function jsonArrayContainsAny(path: string, values: string[]): Prisma.Sql {
  const clauses = values.map((value) => {
    const payload = JSON.stringify({ [path]: [value] });
    return Prisma.sql`c.attributes @> ${payload}::jsonb`;
  });
  return Prisma.sql`(${Prisma.join(clauses, " OR ")})`;
}

function jsonNumericRange(path: string, min: number | undefined, max: number | undefined): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`(c.attributes->>${path}) ~ '^-?[0-9]+(\\.[0-9]+)?$'`,
  ];
  if (min != null) parts.push(Prisma.sql`(c.attributes->>${path})::numeric >= ${min}`);
  if (max != null) parts.push(Prisma.sql`(c.attributes->>${path})::numeric <= ${max}`);
  return Prisma.sql`(${Prisma.join(parts, " AND ")})`;
}

export function catalogVisibilitySql(): Prisma.Sql[] {
  if (loadFeatureFlags().showSyntheticCatalog) return [];
  return [
    Prisma.sql`(
      COALESCE(c.attributes->>'sourceQuality', '') <> 'SYNTHETIC'
      AND COALESCE(c.attributes->>'source', '') NOT IN ('synthetic-showcase', 'showcase-seed', 'seed')
    )`,
  ];
}

/** Prisma `CardWhereInput` equivalent of `catalogVisibilitySql` for REST catalog pages. */
export function publicCatalogCardWhere(): Prisma.CardWhereInput {
  if (loadFeatureFlags().showSyntheticCatalog) return {};
  return {
    AND: [
      { NOT: { attributes: { path: ["sourceQuality"], equals: "SYNTHETIC" } } },
      ...SYNTHETIC_ATTRIBUTE_SOURCES.map((source) => ({
        NOT: { attributes: { path: ["source"], equals: source } },
      })),
    ],
  };
}

export function isHiddenSyntheticCard(attributes: Prisma.JsonValue | Record<string, unknown> | null): boolean {
  if (loadFeatureFlags().showSyntheticCatalog) return false;
  const raw =
    attributes && typeof attributes === "object" && !Array.isArray(attributes)
      ? (attributes as Record<string, unknown>)
      : {};
  return isSyntheticCardAttributes(raw);
}

export function jsonSortExpression(filter: CatalogFilterDef | undefined): Prisma.Sql | null {
  if (!filter || filter.source.kind !== "json") return null;
  return Prisma.sql`(
    CASE WHEN (c.attributes->>${filter.source.path}) ~ '^-?[0-9]+(\\.[0-9]+)?$'
    THEN (c.attributes->>${filter.source.path})::numeric END
  )`;
}
