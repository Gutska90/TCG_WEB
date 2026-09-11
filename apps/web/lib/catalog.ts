import type { CardDetailView, CardSummaryView, GameFiltersView, GameView, Paginated, SetSummaryView } from "@tcg/types";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";

export class CatalogRequestError extends Error {
  constructor(public readonly status: number) {
    super(`catalog ${status}`);
  }
}

/**
 * Server-side catalog GET against Nest (`API_ORIGIN`).
 * Default ISR 30s so set/search grids do not hammer the API on every tile navigation.
 * Pass `false` when the payload must not be cached (game filter metadata).
 */
export async function catalogGet<T>(path: string, revalidate?: number | false): Promise<T> {
  const res = await fetch(
    `${API_ORIGIN}${path}`,
    revalidate === false ? { cache: "no-store" } : { next: { revalidate: revalidate ?? 30 } },
  );
  if (!res.ok) {
    throw new CatalogRequestError(res.status);
  }
  return (await res.json()) as T;
}

export function getGames() {
  return catalogGet<GameView[]>("/v1/games");
}

export function getGame(slug: string) {
  return catalogGet<GameView>(`/v1/games/${slug}`);
}

export function getGameFilters(slug: string) {
  return catalogGet<GameFiltersView>(`/v1/games/${slug}/filters`, false);
}

export function getSets(gameSlug: string) {
  return catalogGet<SetSummaryView[]>(`/v1/games/${gameSlug}/sets`);
}

export function getSet(gameSlug: string, setSlug: string) {
  return catalogGet<SetSummaryView & { game: GameView }>(`/v1/games/${gameSlug}/sets/${setSlug}`);
}

export function getSetCards(setId: string, page = 1) {
  return catalogGet<Paginated<CardSummaryView>>(`/v1/sets/${setId}/cards?page=${page}&pageSize=40`);
}

export function getGameCards(gameSlug: string, page = 1) {
  return catalogGet<Paginated<CardSummaryView>>(`/v1/games/${gameSlug}/cards?page=${page}&pageSize=40`);
}

export function getCardBySlug(gameSlug: string, setSlug: string, cardSlug: string) {
  return catalogGet<CardDetailView>(`/v1/games/${gameSlug}/sets/${setSlug}/cards/${cardSlug}`);
}

export function getCardById(id: string) {
  return catalogGet<CardDetailView>(`/v1/cards/${id}`);
}
