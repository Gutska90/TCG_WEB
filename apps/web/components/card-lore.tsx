import { presentCardLore } from "@tcg/config";

export function CardLore({ attributes }: { attributes: Record<string, unknown> }) {
  const lore = presentCardLore(attributes);
  if (!lore.rulesText && !lore.flavorText && !lore.flavorPlaceholder && !lore.errataText && !lore.sourceUrl) {
    return null;
  }
  return (
    <section className="mt-6 space-y-4">
      {lore.rulesText ? (
        <div>
          <h2 className="text-xs font-medium tracking-wide text-text-muted uppercase">Habilidad</h2>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{lore.rulesText}</p>
        </div>
      ) : null}
      {lore.flavorText ? (
        <div>
          <h2 className="text-xs font-medium tracking-wide text-text-muted uppercase">Historia</h2>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed italic text-text-muted">{lore.flavorText}</p>
        </div>
      ) : lore.flavorPlaceholder ? (
        <div>
          <h2 className="text-xs font-medium tracking-wide text-text-muted uppercase">Historia</h2>
          <p className="mt-1 text-sm text-text-muted">{lore.flavorPlaceholder}</p>
        </div>
      ) : null}
      {lore.errataText ? (
        <div>
          <h2 className="text-xs font-medium tracking-wide text-text-muted uppercase">Errata</h2>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{lore.errataText}</p>
        </div>
      ) : null}
      {lore.sourceUrl ? (
        <p className="text-xs text-text-muted">
          Fuente oficial:{" "}
          <a className="underline underline-offset-2" href={lore.sourceUrl} rel="noreferrer" target="_blank">
            TOR / Fénix
          </a>
        </p>
      ) : null}
    </section>
  );
}
