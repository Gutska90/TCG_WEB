import { Controller, Get, Param, Query } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { paginationQuerySchema, type PaginationQuery } from "@tcg/validation";
import { Public } from "../common/decorators/public.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import { CatalogService } from "./catalog.service";

@SkipThrottle()
@Public()
@Controller("v1")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("games")
  listGames() {
    return this.catalog.listGames();
  }

  @Get("games/:slug")
  getGame(@Param("slug") slug: string) {
    return this.catalog.getGame(slug);
  }

  @Get("games/:slug/sets")
  listSets(@Param("slug") slug: string) {
    return this.catalog.listSets(slug);
  }

  @Get("games/:gameSlug/sets/:setSlug")
  getSetBySlug(@Param("gameSlug") gameSlug: string, @Param("setSlug") setSlug: string) {
    return this.catalog.getSetBySlug(gameSlug, setSlug);
  }

  @Get("games/:gameSlug/sets/:setSlug/cards/:cardSlug")
  getCardBySlug(
    @Param("gameSlug") gameSlug: string,
    @Param("setSlug") setSlug: string,
    @Param("cardSlug") cardSlug: string,
  ) {
    return this.catalog.getCardBySlug(gameSlug, setSlug, cardSlug);
  }

  @Get("games/:slug/cards")
  listGameCards(
    @Param("slug") slug: string,
    @Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.catalog.listCardsByGame(slug, query.page, query.pageSize);
  }

  @Get("sets/:id")
  getSet(@Param("id") id: string) {
    return this.catalog.getSetById(id);
  }

  @Get("sets/:id/cards")
  listSetCards(
    @Param("id") id: string,
    @Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.catalog.listCardsBySet(id, query.page, query.pageSize);
  }

  @Get("cards/:id")
  getCard(@Param("id") id: string) {
    return this.catalog.getCard(id);
  }

  @Get("variants/:id/price-suggestion")
  priceSuggestion(@Param("id") id: string) {
    return this.catalog.priceSuggestion(id);
  }

  @Get("variants/:id")
  getVariant(@Param("id") id: string) {
    return this.catalog.getVariant(id);
  }
}
