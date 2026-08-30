export function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function hasSearchCriteria(query: {
  q?: string;
  game?: string;
  set?: string;
  rarity?: string;
  supertype?: string;
  language?: string;
  finish?: string;
  condition?: string;
  hasListings?: boolean;
  priceMin?: number;
  priceMax?: number;
  attrs?: Record<string, string[]>;
}): boolean {
  return Boolean(
    query.q ||
      query.game ||
      query.set ||
      query.rarity ||
      query.supertype ||
      query.language ||
      query.finish ||
      query.condition ||
      query.hasListings ||
      query.priceMin ||
      query.priceMax ||
      (query.attrs && Object.keys(query.attrs).length > 0),
  );
}
