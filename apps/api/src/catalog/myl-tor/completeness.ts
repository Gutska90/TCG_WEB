import type { MappedMylTorCard } from "./map-card";

export type MylTorCompletenessIssue = {
  setSlug: string;
  name: string;
  slug: string;
  missing: string[];
};

export type MylTorCompletenessReport = {
  cards: number;
  complete: number;
  incomplete: number;
  issues: MylTorCompletenessIssue[];
};

export function completenessFromMapped(cards: MappedMylTorCard[]): MylTorCompletenessReport {
  const issues = cards
    .filter((card) => card.missing.length > 0)
    .map((card) => ({
      setSlug: card.set.slug,
      name: card.name,
      slug: card.slug,
      missing: card.missing,
    }));
  return {
    cards: cards.length,
    complete: cards.length - issues.length,
    incomplete: issues.length,
    issues,
  };
}

export function formatCompletenessReport(report: MylTorCompletenessReport): string {
  const lines = [
    `Cartas: ${report.cards}`,
    `Completas: ${report.complete}`,
    `Incompletas: ${report.incomplete}`,
  ];
  for (const issue of report.issues.slice(0, 40)) {
    lines.push(`- ${issue.setSlug}/${issue.slug} (${issue.name}): ${issue.missing.join(", ")}`);
  }
  if (report.issues.length > 40) {
    lines.push(`… ${report.issues.length - 40} más`);
  }
  return lines.join("\n");
}
