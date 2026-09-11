/** Long-text lore on Card.attributes. Shared by web/mobile; not a search filter. */

export const NO_OFFICIAL_FLAVOR_STATUS = "NO_OFFICIAL_FLAVOR_TEXT";

export const NO_OFFICIAL_FLAVOR_COPY =
  "No existe texto histórico oficial registrado para esta impresión.";

export type CardLoreView = {
  rulesText: string | null;
  flavorText: string | null;
  flavorPlaceholder: string | null;
  errataText: string | null;
  illustrator: string | null;
  keywords: string[];
  sourceUrl: string | null;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function presentCardLore(attributes: Record<string, unknown> | null | undefined): CardLoreView {
  const attrs = attributes ?? {};
  const flavorText = asString(attrs.flavorText);
  const flavorMissing = attrs.flavorTextStatus === NO_OFFICIAL_FLAVOR_STATUS || !flavorText;
  const keywordsRaw = attrs.keywords;
  const keywords = Array.isArray(keywordsRaw)
    ? keywordsRaw.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  return {
    rulesText: asString(attrs.rulesText),
    flavorText,
    flavorPlaceholder: flavorMissing ? NO_OFFICIAL_FLAVOR_COPY : null,
    errataText: asString(attrs.errataText),
    illustrator: asString(attrs.illustrator),
    keywords,
    sourceUrl: asString(attrs.sourceUrl),
  };
}
