"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CreateCatalogSubmissionResult, GameView, SetSummaryView } from "@tcg/types";
import { ApiError, api, fetchMe } from "../../../lib/api";
import { buttonClassName } from "../../../components/ui/button-styles";
import { controlClassName } from "../../../components/ui/input";

const MYL_SLUG = "mitos-y-leyendas";

export default function RequestCatalogCardPage() {
  const router = useRouter();
  const [games, setGames] = useState<GameView[]>([]);
  const [sets, setSets] = useState<SetSummaryView[]>([]);
  const [gameId, setGameId] = useState("");
  const [setId, setSetId] = useState("");
  const [proposedSetName, setProposedSetName] = useState("");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [rarity, setRarity] = useState("");
  const [cardType, setCardType] = useState("");
  const [raza, setRaza] = useState("");
  const [coste, setCoste] = useState("");
  const [fuerza, setFuerza] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const selectedGame = games.find((row) => row.id === gameId);
  const isMyl = selectedGame?.slug === MYL_SLUG;

  useEffect(() => {
    fetchMe().catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 401) router.replace("/ingresar?next=/vender/solicitar-carta");
    });
    void api<GameView[]>("/v1/games").then((rows) => {
      setGames(rows);
      const myl = rows.find((row) => row.slug === MYL_SLUG);
      if (myl) setGameId(myl.id);
    });
  }, [router]);

  useEffect(() => {
    const game = games.find((row) => row.id === gameId);
    if (!game) {
      setSets([]);
      return;
    }
    void api<SetSummaryView[]>(`/v1/games/${game.slug}/sets`).then(setSets).catch(() => setSets([]));
  }, [gameId, games]);

  async function submit() {
    setMessage(null);
    setPending(true);
    try {
      const attributes: Record<string, string | number> = {};
      if (cardType) attributes.cardType = cardType;
      if (isMyl && raza) attributes.raza = raza;
      if (isMyl && coste) attributes.coste = Number(coste);
      if (isMyl && fuerza) attributes.fuerza = Number(fuerza);
      await api<CreateCatalogSubmissionResult>("/v1/catalog/submissions", {
        method: "POST",
        body: JSON.stringify({
          gameId,
          setId: setId || undefined,
          proposedSetName: setId ? undefined : proposedSetName || undefined,
          name,
          number: number || undefined,
          rarity: rarity || undefined,
          supertype: cardType || undefined,
          attributes,
          imageUrl: imageUrl || undefined,
          sourceUrl: sourceUrl || undefined,
          notes: notes || undefined,
        }),
      });
      setSuccess(true);
    } catch (err: unknown) {
      setMessage(err instanceof ApiError ? err.message : "No se pudo enviar la solicitud");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <main id="contenido" className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-medium tracking-tight">Solicitud enviada</h1>
        <p className="mt-4 text-sm">La revisaremos antes de incorporarla al catálogo.</p>
        <p className="mt-6">
          <Link href="/vender" className={buttonClassName("primary")}>
            Volver a vender
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main id="contenido" className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <p className="text-sm">
        <Link href="/vender" className="underline underline-offset-2">
          Vender
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">Solicitar incorporación</h1>
      <p className="mt-2 text-sm text-text-muted">
        No creamos la carta automáticamente. Un administrador revisa la propuesta.
      </p>
      {message ? <p className="mt-4 text-sm text-danger">{message}</p> : null}
      <form
        className="mt-6 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="text-sm">
          Juego
          <select
            required
            className={`mt-1 ${controlClassName}`}
            value={gameId}
            onChange={(event) => {
              setGameId(event.target.value);
              setSetId("");
            }}
          >
            <option value="">Selecciona</option>
            {games.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Edición existente
          <select className={`mt-1 ${controlClassName}`} value={setId} onChange={(event) => setSetId(event.target.value)}>
            <option value="">Otra / no está en la lista</option>
            {sets.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        {setId ? null : (
          <label className="text-sm">
            Nombre de la edición
            <input
              className={`mt-1 ${controlClassName}`}
              value={proposedSetName}
              onChange={(event) => setProposedSetName(event.target.value)}
            />
          </label>
        )}
        <label className="text-sm">
          Nombre de la carta
          <input required className={`mt-1 ${controlClassName}`} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="text-sm">
          Número / código
          <input className={`mt-1 ${controlClassName}`} value={number} onChange={(event) => setNumber(event.target.value)} />
        </label>
        <label className="text-sm">
          Rareza
          <input className={`mt-1 ${controlClassName}`} value={rarity} onChange={(event) => setRarity(event.target.value)} />
        </label>
        <label className="text-sm">
          Tipo
          <input
            className={`mt-1 ${controlClassName}`}
            value={cardType}
            onChange={(event) => setCardType(event.target.value)}
            placeholder={isMyl ? "ALIADO, TALISMAN, TOTEM…" : ""}
          />
        </label>
        {isMyl ? (
          <>
            <label className="text-sm">
              Raza
              <input className={`mt-1 ${controlClassName}`} value={raza} onChange={(event) => setRaza(event.target.value)} />
            </label>
            <label className="text-sm">
              Coste
              <input
                type="number"
                min={0}
                className={`mt-1 ${controlClassName}`}
                value={coste}
                onChange={(event) => setCoste(event.target.value)}
              />
            </label>
            <label className="text-sm">
              Fuerza
              <input
                type="number"
                min={0}
                className={`mt-1 ${controlClassName}`}
                value={fuerza}
                onChange={(event) => setFuerza(event.target.value)}
              />
            </label>
          </>
        ) : null}
        <label className="text-sm">
          URL de imagen (https)
          <input className={`mt-1 ${controlClassName}`} value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
        </label>
        <label className="text-sm">
          URL fuente (opcional)
          <input className={`mt-1 ${controlClassName}`} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
        </label>
        <label className="text-sm">
          Comentarios
          <textarea className={`mt-1 ${controlClassName}`} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <button type="submit" disabled={pending || !gameId || !name} className={buttonClassName("primary", "w-fit")}>
          {pending ? "Enviando…" : "Enviar solicitud"}
        </button>
      </form>
    </main>
  );
}
