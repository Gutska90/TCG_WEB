import { CARD_FINISHES, CARD_LANGUAGES } from "@tcg/config";
import type { GameView } from "@tcg/types";
import type { SearchCardsInput } from "../lib/search";

const inputClass = "mt-1 w-full rounded border px-3 py-2 text-sm";

export function SearchForm({
  games,
  values,
  compact = false,
}: {
  games?: GameView[];
  values?: SearchCardsInput;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <form action="/buscar" method="get" className="hidden sm:block">
        <label className="sr-only" htmlFor="header-q">
          Buscar cartas
        </label>
        <input
          id="header-q"
          name="q"
          type="search"
          defaultValue={values?.q ?? ""}
          placeholder="Buscar cartas"
          className="w-48 rounded border px-3 py-1.5 text-sm"
        />
      </form>
    );
  }

  return (
    <form action="/buscar" method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">
        Nombre o número
        <input id="q" name="q" type="search" defaultValue={values?.q ?? ""} className={inputClass} />
      </label>
      <label className="text-sm">
        Juego
        <select name="game" defaultValue={values?.game ?? ""} className={inputClass}>
          <option value="">Todos</option>
          {(games ?? []).map((game) => (
            <option key={game.id} value={game.slug}>
              {game.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Set (slug o código)
        <input name="set" defaultValue={values?.set ?? ""} className={inputClass} />
      </label>
      <label className="text-sm">
        Rareza
        <input name="rarity" defaultValue={values?.rarity ?? ""} className={inputClass} />
      </label>
      <label className="text-sm">
        Idioma
        <select name="language" defaultValue={values?.language ?? ""} className={inputClass}>
          <option value="">Todos</option>
          {CARD_LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Finish
        <select name="finish" defaultValue={values?.finish ?? ""} className={inputClass}>
          <option value="">Todos</option>
          {CARD_FINISHES.map((finish) => (
            <option key={finish} value={finish}>
              {finish}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Orden
        <select name="sort" defaultValue={values?.sort ?? "relevance"} className={inputClass}>
          <option value="relevance">Relevancia</option>
          <option value="releasedAt">Novedad del set</option>
          <option value="price">Precio mínimo</option>
        </select>
      </label>
      <label className="text-sm">
        Precio mín. CLP
        <input name="priceMin" type="number" min={1} defaultValue={values?.priceMin ?? ""} className={inputClass} />
      </label>
      <label className="text-sm">
        Precio máx. CLP
        <input name="priceMax" type="number" min={1} defaultValue={values?.priceMax ?? ""} className={inputClass} />
      </label>
      <div className="flex items-end">
        <button type="submit" className="rounded border px-4 py-2 text-sm">
          Buscar
        </button>
      </div>
    </form>
  );
}
