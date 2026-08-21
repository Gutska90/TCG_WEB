import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PLATFORM } from "@tcg/config";
import type { Paginated, SearchCardView } from "@tcg/types";
import type { SearchCardsQuery } from "@tcg/validation";
import { PrismaService } from "../prisma/prisma.service";
import { escapeLike, hasSearchCriteria } from "./search.util";

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchCards(query: SearchCardsQuery): Promise<Paginated<SearchCardView>> {
    const page = query.page;
    const pageSize = query.pageSize ?? PLATFORM.searchPageSizeDefault;
    if (!hasSearchCriteria(query)) {
      return { items: [], page, pageSize, total: 0 };
    }

    const where = buildWhere(query);
    const orderBy = buildOrderBy(query);
    const countRows = await this.prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`SELECT COUNT(*)::bigint AS total
        FROM cards c
        INNER JOIN sets s ON s.id = c.set_id
        INNER JOIN tcg_games g ON g.id = s.game_id
        ${where}`,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const idRows = await this.prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT c.id
        FROM cards c
        INNER JOIN sets s ON s.id = c.set_id
        INNER JOIN tcg_games g ON g.id = s.game_id
        ${where}
        ${orderBy}
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    );
    const ids = idRows.map((row) => row.id);
    if (ids.length === 0) {
      return { items: [], page, pageSize, total };
    }

    const rows = await this.prisma.card.findMany({
      where: { id: { in: ids } },
      include: { set: { include: { game: true } } },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const items: SearchCardView[] = [];
    for (const id of ids) {
      const row = byId.get(id);
      if (!row) continue;
      items.push({
        id: row.id,
        slug: row.slug,
        name: row.name,
        number: row.number,
        rarity: row.rarity,
        imageUrl: row.imageUrl,
        gameSlug: row.set.game.slug,
        gameName: row.set.game.name,
        setSlug: row.set.slug,
        setName: row.set.name,
        setCode: row.set.code,
      });
    }
    return { items, page, pageSize, total };
  }
}

function buildWhere(query: SearchCardsQuery): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`g.is_active = true`];
  if (query.q) {
    const like = escapeLike(query.q);
    parts.push(Prisma.sql`(
      immutable_unaccent_lower(c.name) LIKE '%' || immutable_unaccent_lower(${like}) || '%' ESCAPE chr(92)
      OR immutable_unaccent_lower(c.number) LIKE '%' || immutable_unaccent_lower(${like}) || '%' ESCAPE chr(92)
      OR immutable_unaccent_lower(s.name) LIKE '%' || immutable_unaccent_lower(${like}) || '%' ESCAPE chr(92)
      OR immutable_unaccent_lower(s.code) LIKE '%' || immutable_unaccent_lower(${like}) || '%' ESCAPE chr(92)
      OR immutable_unaccent_lower(g.name) LIKE '%' || immutable_unaccent_lower(${like}) || '%' ESCAPE chr(92)
      OR immutable_unaccent_lower(g.slug) LIKE '%' || immutable_unaccent_lower(${like}) || '%' ESCAPE chr(92)
    )`);
  }
  if (query.game) {
    parts.push(Prisma.sql`g.slug = ${query.game}`);
  }
  if (query.set) {
    parts.push(Prisma.sql`(s.slug = ${query.set} OR lower(s.code) = lower(${query.set}))`);
  }
  if (query.rarity) {
    const like = escapeLike(query.rarity);
    parts.push(
      Prisma.sql`immutable_unaccent_lower(c.rarity) LIKE '%' || immutable_unaccent_lower(${like}) || '%' ESCAPE chr(92)`,
    );
  }
  if (query.language) {
    parts.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM card_variants v
        WHERE v.card_id = c.id AND v.language::text = ${query.language}
      )`,
    );
  }
  if (query.finish) {
    parts.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM card_variants v
        WHERE v.card_id = c.id AND v.finish::text = ${query.finish}
      )`,
    );
  }
  if (query.priceMin != null || query.priceMax != null) {
    const min = query.priceMin ?? 1;
    const max = query.priceMax ?? 2_147_483_647;
    parts.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM listings l
        INNER JOIN card_variants v ON v.id = l.variant_id
        WHERE v.card_id = c.id
          AND l.status = 'ACTIVE'
          AND l.quantity > l.quantity_reserved
          AND l.price_clp >= ${min}
          AND l.price_clp <= ${max}
      )`,
    );
  }
  return Prisma.sql`WHERE ${Prisma.join(parts, " AND ")}`;
}

function buildOrderBy(query: SearchCardsQuery): Prisma.Sql {
  if (query.sort === "price") {
    return Prisma.sql`ORDER BY (
      SELECT MIN(l.price_clp) FROM listings l
      INNER JOIN card_variants v ON v.id = l.variant_id
      WHERE v.card_id = c.id AND l.status = 'ACTIVE' AND l.quantity > l.quantity_reserved
    ) ASC NULLS LAST, c.number ASC, c.id ASC`;
  }
  if (query.sort === "releasedAt" || !query.q) {
    return Prisma.sql`ORDER BY s.released_at DESC NULLS LAST, c.number ASC, c.id ASC`;
  }
  return Prisma.sql`ORDER BY GREATEST(
      similarity(immutable_unaccent_lower(c.name), immutable_unaccent_lower(${query.q})),
      similarity(immutable_unaccent_lower(c.number), immutable_unaccent_lower(${query.q})),
      similarity(immutable_unaccent_lower(s.name), immutable_unaccent_lower(${query.q})),
      similarity(immutable_unaccent_lower(s.code), immutable_unaccent_lower(${query.q})),
      similarity(immutable_unaccent_lower(g.name), immutable_unaccent_lower(${query.q}))
    ) DESC, c.number ASC, c.id ASC`;
}
