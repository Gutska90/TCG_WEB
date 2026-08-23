import { CARD_FINISHES, CARD_LANGUAGES } from "@tcg/config";
import type { GameView } from "@tcg/types";
import type { SearchCardsInput } from "../lib/search";
import { controlClassName } from "./ui/input";
import { SearchInput } from "./ui/search-input";
import { buttonClassName } from "./ui/button-styles";

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
      <form action="/buscar" method="get" className="w-full">
        <label className="sr-only" htmlFor="header-q">
          Buscar cartas
        </label>
        <SearchInput
          id="header-q"
          name="q"
          defaultValue={values?.q ?? ""}
          placeholder="Buscar cartas..."
        />
      </form>
    );
  }

  return (
    <form action="/buscar" method="get" className="grid gap-4">
      <label className="text-sm">
        Nombre o número
        <SearchInput id="q" name="q" defaultValue={values?.q ?? ""} className="mt-1" placeholder="Nombre, número o set" />
      </label>
      <label className="text-sm">
        Juego
        <select name="game" defaultValue={values?.game ?? ""} className={`mt-1 ${controlClassName}`}>
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
        <input name="set" defaultValue={values?.set ?? ""} className={`mt-1 ${controlClassName}`} />
      </label>
      <label className="text-sm">
        Rareza
        <input name="rarity" defaultValue={values?.rarity ?? ""} className={`mt-1 ${controlClassName}`} />
      </label>
      <label className="text-sm">
        Idioma
        <select name="language" defaultValue={values?.language ?? ""} className={`mt-1 ${controlClassName}`}>
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
        <select name="finish" defaultValue={values?.finish ?? ""} className={`mt-1 ${controlClassName}`}>
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
        <select name="sort" defaultValue={values?.sort ?? "relevance"} className={`mt-1 ${controlClassName}`}>
          <option value="relevance">Relevancia</option>
          <option value="releasedAt">Novedad del set</option>
          <option value="price">Precio mínimo</option>
        </select>
      </label>
      <label className="text-sm">
        Precio mín. CLP
        <input name="priceMin" type="number" min={1} defaultValue={values?.priceMin ?? ""} className={`mt-1 ${controlClassName}`} />
      </label>
      <label className="text-sm">
        Precio máx. CLP
        <input name="priceMax" type="number" min={1} defaultValue={values?.priceMax ?? ""} className={`mt-1 ${controlClassName}`} />
      </label>
      <div className="flex items-end">
        <button type="submit" className={buttonClassName("primary")}>
          Buscar
        </button>
      </div>
    </form>
  );
}
