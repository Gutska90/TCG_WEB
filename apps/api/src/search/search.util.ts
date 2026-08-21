export function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function hasSearchCriteria(query: {
  q?: string;
  game?: string;
  set?: string;
  rarity?: string;
  language?: string;
  finish?: string;
  priceMin?: number;
  priceMax?: number;
}): boolean {
  return Boolean(
    query.q || query.game || query.set || query.rarity || query.language || query.finish || query.priceMin || query.priceMax,
  );
}
