import { Controller, Get, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { searchCardsQuerySchema, type SearchCardsQuery } from "@tcg/validation";
import { Public } from "../common/decorators/public.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import { SearchService } from "./search.service";

@Public()
@Controller("v1/search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get("cards")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  searchCards(@Query(new ZodPipe(searchCardsQuerySchema)) query: SearchCardsQuery) {
    return this.search.searchCards(query);
  }
}
