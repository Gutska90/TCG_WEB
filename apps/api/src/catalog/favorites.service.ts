import { HttpStatus, Injectable } from "@nestjs/common";
import { ERROR_CODES, PLATFORM } from "@tcg/config";
import type { FavoriteView, Paginated } from "@tcg/types";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page: number, pageSize: number = PLATFORM.searchPageSizeDefault): Promise<Paginated<FavoriteView>> {
    const where = { userId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.favorite.count({ where }),
      this.prisma.favorite.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          variant: { include: { card: { include: { set: { include: { game: true } } } } } },
        },
      }),
    ]);
    return {
      items: rows.map((row) => toFavoriteView(row)),
      page,
      pageSize,
      total,
    };
  }

  async add(userId: string, variantId: string): Promise<FavoriteView> {
    const variant = await this.prisma.cardVariant.findUnique({
      where: { id: variantId },
      include: { card: { include: { set: { include: { game: true } } } } },
    });
    if (!variant) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Variante no encontrada");
    }
    const row = await this.prisma.favorite.upsert({
      where: { userId_variantId: { userId, variantId } },
      update: {},
      create: { userId, variantId },
      include: {
        variant: { include: { card: { include: { set: { include: { game: true } } } } } },
      },
    });
    return toFavoriteView(row);
  }

  async remove(userId: string, variantId: string): Promise<void> {
    const row = await this.prisma.favorite.findUnique({
      where: { userId_variantId: { userId, variantId } },
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Favorito no encontrado");
    }
    await this.prisma.favorite.delete({ where: { id: row.id } });
  }
}

function toFavoriteView(row: {
  id: string;
  variant: {
    id: string;
    language: FavoriteView["variant"]["language"];
    finish: FavoriteView["variant"]["finish"];
    finishDetail: string;
    isDefault: boolean;
    card: {
      id: string;
      slug: string;
      name: string;
      number: string;
      rarity: string;
      imageUrl: string | null;
      set: { slug: string; name: string; game: { slug: string } };
    };
  };
}): FavoriteView {
  return {
    id: row.id,
    variant: {
      id: row.variant.id,
      language: row.variant.language,
      finish: row.variant.finish,
      finishDetail: row.variant.finishDetail,
      isDefault: row.variant.isDefault,
    },
    card: {
      id: row.variant.card.id,
      slug: row.variant.card.slug,
      name: row.variant.card.name,
      number: row.variant.card.number,
      rarity: row.variant.card.rarity,
      imageUrl: row.variant.card.imageUrl,
      gameSlug: row.variant.card.set.game.slug,
      setSlug: row.variant.card.set.slug,
      setName: row.variant.card.set.name,
    },
  };
}
