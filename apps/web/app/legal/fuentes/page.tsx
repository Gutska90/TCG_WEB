export default function FuentesPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Fuentes de catálogo</h1>
      <p className="mt-4 text-text-muted">
        Los datos de cartas se importan desde APIs públicas o licenciables. No copiamos catálogos de
        otros marketplaces.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-text-muted">
        <li>
          Magic: The Gathering —{" "}
          <a className="underline" href="https://scryfall.com/docs/api">
            Scryfall API
          </a>
        </li>
        <li>Pokémon y One Piece — seed de prueba en desarrollo; importadores oficiales después.</li>
      </ul>
    </main>
  );
}
