import { slugifyStable } from "../slug";

export function normalizeCatalogName(name: string): string {
  return slugifyStable(name.trim(), "carta");
}

export function isLikelyDuplicateCard(existing: {
  name: string;
  number: string;
  setId: string;
}, proposed: {
  name: string;
  number: string | null | undefined;
  setId: string | null | undefined;
}): boolean {
  const sameSet = !proposed.setId || existing.setId === proposed.setId;
  const sameName = normalizeCatalogName(existing.name) === normalizeCatalogName(proposed.name);
  const proposedNumber = proposed.number?.trim();
  const sameNumber =
    proposedNumber != null &&
    proposedNumber.length > 0 &&
    existing.number.trim().toLowerCase() === proposedNumber.toLowerCase();
  if (sameSet && sameName) return true;
  if (sameSet && sameNumber && sameName) return true;
  if (sameNumber && sameName) return true;
  return false;
}
