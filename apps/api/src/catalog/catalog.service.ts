import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ERROR_CODES, PLATFORM, presentAttributeFields } from "@tcg/config";
import type {
  AdminCardAttributesView,
  CardDetailView,
  CardSummaryView,
  GameView,
  Paginated,
  SetSummaryView,
  VariantDetailView,
} from "@tcg/types";
import { inspectCardAttributes } from "@tcg/validation";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { ListingsService } from "../listings/listings.service";
import { MarketService } from "../listings/market.service";
import { PricesService } from "../prices/prices.service";

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly listings: ListingsService,
    private readonly prices: PricesService,
  ) {}

  async listGames(): Promise<GameView[]> {
    const rows = await this.prisma.tcgGame.findMany({
      where: { isActive: true, NOT: { slug: { startsWith: "it-game-" } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(toGameView);
  }

  async getGame(slug: string): Promise<GameView> {
    const row = await this.prisma.tcgGame.findFirst({ where: { slug, isActive: true } });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Juego no encontrado");
    }
    return toGameView(row);
  }

  async listSets(gameSlug: string): Promise<SetSummaryView[]> {
    const game = await this.requireGame(gameSlug);
    const rows = await this.prisma.tcgSet.findMany({
      where: { gameId: game.id },
      orderBy: [{ releasedAt: "desc" }, { name: "asc" }],
      include: { _count: { select: { cards: true } } },
    });
    return rows.map((row) => toSetView(row, row._count.cards));
  }

  async getSetById(id: string): Promise<SetSummaryView & { game: GameView }> {
    const row = await this.prisma.tcgSet.findUnique({
      where: { id },
      include: { game: true, _count: { select: { cards: true } } },
    });
    if (!row || !row.game.isActive) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Set no encontrado");
    }
    return { ...toSetView(row, row._count.cards), game: toGameView(row.game) };
  }

  async getSetBySlug(gameSlug: string, setSlug: string): Promise<SetSummaryView & { game: GameView }> {
    const game = await this.requireGame(gameSlug);
    const row = await this.prisma.tcgSet.findFirst({
      where: { gameId: game.id, slug: setSlug },
      include: { _count: { select: { cards: true } } },
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Set no encontrado");
    }
    return { ...toSetView(row, row._count.cards), game: toGameView(game) };
  }

  async listCardsBySet(
    setId: string,
    page: number,
    pageSize: number = PLATFORM.searchPageSizeDefault,
  ): Promise<Paginated<CardSummaryView>> {
    const set = await this.prisma.tcgSet.findUnique({ where: { id: setId } });
    if (!set) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Set no encontrado");
    }
    return this.pageCards({ setId }, page, pageSize);
  }

  async listCardsByGame(
    gameSlug: string,
    page: number,
    pageSize: number = PLATFORM.searchPageSizeDefault,
  ): Promise<Paginated<CardSummaryView>> {
    const game = await this.requireGame(gameSlug);
    return this.pageCards({ set: { gameId: game.id } }, page, pageSize);
  }

  async getCard(id: string): Promise<CardDetailView> {
    const row = await this.prisma.card.findUnique({
      where: { id },
      include: { variants: true, set: { include: { game: true } } },
    });
    if (!row || !row.set.game.isActive) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Carta no encontrada");
    }
    return toCardDetail(row, await this.market.summarizeForCard(row.id));
  }


  async inspectCardAttributes(id: string): Promise<AdminCardAttributesView> {
    const row = await this.prisma.card.findUnique({
      where: { id },
      include: { set: { include: { game: true } } },
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Carta no encontrada");
    }
    const attributes =
      row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes)
        ? (row.attributes as Record<string, unknown>)
        : {};
    const inspected = inspectCardAttributes(row.set.game.slug, attributes);
    return {
      cardId: row.id,
      gameSlug: row.set.game.slug,
      raw: attributes,
      validated: inspected.parsed,
      unknownKeys: inspected.unknownKeys,
      valid: inspected.valid,
      issues: inspected.issues,
    };
  }

  async getCardBySlug(gameSlug: string, setSlug: string, cardSlug: string): Promise<CardDetailView> {
    const game = await this.requireGame(gameSlug);
    const set = await this.prisma.tcgSet.findFirst({ where: { gameId: game.id, slug: setSlug } });
    if (!set) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Carta no encontrada");
    }
    const row = await this.prisma.card.findFirst({
      where: { setId: set.id, slug: cardSlug },
      include: { variants: true, set: { include: { game: true } } },
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Carta no encontrada");
    }
    return toCardDetail(row, await this.market.summarizeForCard(row.id));
  }

  async getVariant(id: string): Promise<VariantDetailView> {
    const row = await this.prisma.cardVariant.findUnique({
      where: { id },
      include: { card: { include: { set: { include: { game: true } } } } },
    });
    if (!row || !row.card.set.game.isActive) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Variante no encontrada");
    }
    const [listings, market] = await Promise.all([
      this.listings.listPublic({ variantId: id, page: 1, pageSize: 50 }),
      this.market.summarizeForVariant(id),
    ]);
    return {
      variant: {
        id: row.id,
        language: row.language,
        finish: row.finish,
        finishDetail: row.finishDetail,
        isDefault: row.isDefault,
        card: {
          id: row.card.id,
          slug: row.card.slug,
          name: row.card.name,
          number: row.card.number,
          rarity: row.card.rarity,
          imageUrl: row.card.imageUrl,
          gameSlug: row.card.set.game.slug,
          setSlug: row.card.set.slug,
        },
      },
      listings: listings.items,
      market,
    };
  }

  async priceSuggestion(variantId: string) {
    const row = await this.prisma.cardVariant.findUnique({
      where: { id: variantId },
      include: { card: { include: { set: { include: { game: true } } } } },
    });
    if (!row || !row.card.set.game.isActive) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Variante no encontrada");
    }
    return this.prices.suggestionForVariant(variantId);
  }

  async variantPrices(variantId: string, range: "1m" | "3m" | "6m" | "1a") {
    const row = await this.prisma.cardVariant.findUnique({
      where: { id: variantId },
      include: { card: { include: { set: { include: { game: true } } } } },
    });
    if (!row || !row.card.set.game.isActive) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Variante no encontrada");
    }
    return this.prices.history(variantId, range);
  }

  private async requireGame(slug: string) {
    const game = await this.prisma.tcgGame.findFirst({ where: { slug, isActive: true } });
    if (!game) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Juego no encontrado");
    }
    return game;
  }

  private async pageCards(
    where: Prisma.CardWhereInput,
    page: number,
    pageSize: number,
  ): Promise<Paginated<CardSummaryView>> {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.card.count({ where }),
      this.prisma.card.findMany({
        where,
        orderBy: [{ number: "asc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { set: { include: { game: true } } },
      }),
    ]);
    return {
      items: items.map(toCardSummary),
      page,
      pageSize,
      total,
    };
  }
}

function toGameView(row: { id: string; slug: string; name: string; publisher: string; sortOrder: number }): GameView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    publisher: row.publisher,
    sortOrder: row.sortOrder,
  };
}

function toSetView(
  row: {
    id: string;
    code: string;
    slug: string;
    name: string;
    releasedAt: Date | null;
    imageUrl: string | null;
  },
  cardCount: number,
): SetSummaryView {
  return {
    id: row.id,
    code: row.code,
    slug: row.slug,
    name: row.name,
    releasedAt: row.releasedAt?.toISOString() ?? null,
    cardCount,
    imageUrl: row.imageUrl,
  };
}

function toCardSummary(row: {
  id: string;
  slug: string;
  name: string;
  number: string;
  rarity: string;
  imageUrl: string | null;
  set: { slug: string; game: { slug: string } };
}): CardSummaryView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    number: row.number,
    rarity: row.rarity,
    imageUrl: row.imageUrl,
    gameSlug: row.set.game.slug,
    setSlug: row.set.slug,
  };
}

function toCardDetail(row: {
  id: string;
  slug: string;
  name: string;
  number: string;
  rarity: string;
  supertype: string;
  imageUrl: string | null;
  attributes: Prisma.JsonValue;
  variants: Array<{
    id: string;
    language: CardDetailView["variants"][number]["language"];
    finish: CardDetailView["variants"][number]["finish"];
    finishDetail: string;
    isDefault: boolean;
  }>;
  set: {
    id: string;
    code: string;
    slug: string;
    name: string;
    game: { id: string; slug: string; name: string };
  };
}, market: CardDetailView["market"]): CardDetailView {
  const attributes =
    row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes)
      ? (row.attributes as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    number: row.number,
    rarity: row.rarity,
    supertype: row.supertype,
    imageUrl: row.imageUrl,
    attributes,
    attributeFields: presentAttributeFields(row.set.game.slug, attributes),
    game: { id: row.set.game.id, slug: row.set.game.slug, name: row.set.game.name },
    set: { id: row.set.id, code: row.set.code, slug: row.set.slug, name: row.set.name },
    variants: row.variants.map((variant) => ({
      id: variant.id,
      language: variant.language,
      finish: variant.finish,
      finishDetail: variant.finishDetail,
      isDefault: variant.isDefault,
    })),
    market,
  };
}
