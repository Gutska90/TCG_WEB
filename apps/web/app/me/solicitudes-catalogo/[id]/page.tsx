"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CATALOG_SUBMISSION_STATUS_LABELS } from "@tcg/config";
import type { CatalogSubmissionDetailView, SetSummaryView } from "@tcg/types";
import { ApiError, api, fetchMe } from "../../../../lib/api";
import { buttonClassName } from "../../../../components/ui/button-styles";
import { controlClassName } from "../../../../components/ui/input";

const MYL_SLUG = "mitos-y-leyendas";

export default function MyCatalogSubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const [row, setRow] = useState<CatalogSubmissionDetailView | null>(null);
  const [sets, setSets] = useState<SetSummaryView[]>([]);
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
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetchMe().catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        router.replace(`/ingresar?next=/me/solicitudes-catalogo/${id}`);
      }
    });
  }, [id, router]);

  useEffect(() => {
    if (!id) return;
    void api<CatalogSubmissionDetailView>(`/v1/me/catalog-submissions/${id}`)
      .then((data) => {
        setRow(data);
        setSetId(data.set?.id ?? "");
        setProposedSetName(data.proposedSetName ?? "");
        setName(data.name);
        setNumber(data.number ?? "");
        setRarity(data.rarity ?? "");
        setCardType(typeof data.attributes.cardType === "string" ? data.attributes.cardType : (data.supertype ?? ""));
        setRaza(typeof data.attributes.raza === "string" ? data.attributes.raza : "");
        setCoste(data.attributes.coste != null ? String(data.attributes.coste) : "");
        setFuerza(data.attributes.fuerza != null ? String(data.attributes.fuerza) : "");
        setImageUrl(data.imageUrl ?? "");
        setSourceUrl(data.sourceUrl ?? "");
        setNotes(data.notes ?? "");
        void api<SetSummaryView[]>(`/v1/games/${data.game.slug}/sets`)
          .then(setSets)
          .catch(() => setSets([]));
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) return;
        setMessage(err instanceof ApiError ? err.message : "No se pudo cargar la solicitud");
      });
  }, [id]);

  const isMyl = row?.game.slug === MYL_SLUG;
  const canResubmit = row?.status === "NEEDS_INFO";

  async function submit() {
    if (!row) return;
    setMessage(null);
    setPending(true);
    try {
      const attributes: Record<string, string | number> = {};
      if (cardType) attributes.cardType = cardType;
      if (isMyl && raza) attributes.raza = raza;
      if (isMyl && coste) attributes.coste = Number(coste);
      if (isMyl && fuerza) attributes.fuerza = Number(fuerza);
      const next = await api<CatalogSubmissionDetailView>(`/v1/me/catalog-submissions/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          setId: setId || null,
          proposedSetName: setId ? null : proposedSetName || null,
          name,
          number: number || null,
          rarity: rarity || null,
          supertype: cardType || null,
          attributes,
          imageUrl: imageUrl || null,
          sourceUrl: sourceUrl || null,
          notes: notes || null,
        }),
      });
      setRow(next);
      setMessage("Solicitud reenviada. Queda otra vez en revisión.");
    } catch (err: unknown) {
      setMessage(err instanceof ApiError ? err.message : "No se pudo reenviar la solicitud");
    } finally {
      setPending(false);
    }
  }

  if (!row) {
    return (
      <main id="contenido" className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <p className="text-sm text-text-muted">{message ?? "Cargando…"}</p>
      </main>
    );
  }

  return (
    <main id="contenido" className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <p className="text-sm">
        <Link href="/me/solicitudes-catalogo" className="underline underline-offset-2">
          Mis solicitudes
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">{row.name}</h1>
      <p className="mt-2 text-sm text-text-muted">
        {CATALOG_SUBMISSION_STATUS_LABELS[row.status]} · {row.game.name} · {row.set?.name ?? row.proposedSetName ?? "sin edición"}
      </p>
      {row.reviewNotes ? (
        <p className="mt-4 rounded-[12px] border border-warning/40 bg-warning/10 p-3 text-sm whitespace-pre-wrap">
          {row.reviewNotes}
        </p>
      ) : null}
      {row.approvedCard ? (
        <p className="mt-4 text-sm">
          Carta creada:{" "}
          <Link
            href={`/${row.approvedCard.gameSlug}/${row.approvedCard.setSlug}/${row.approvedCard.slug}`}
            className="underline underline-offset-2"
          >
            {row.approvedCard.name}
          </Link>
        </p>
      ) : null}
      {message ? <p className="mt-4 text-sm">{message}</p> : null}
      {canResubmit ? (
        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="text-sm">
            Edición existente
            <select className={`mt-1 ${controlClassName}`} value={setId} onChange={(event) => setSetId(event.target.value)}>
              <option value="">Otra / no está en la lista</option>
              {sets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
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
            <input className={`mt-1 ${controlClassName}`} value={cardType} onChange={(event) => setCardType(event.target.value)} />
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
          <button type="submit" disabled={pending || !name} className={buttonClassName("primary", "w-fit")}>
            {pending ? "Enviando…" : "Reenviar solicitud"}
          </button>
        </form>
      ) : (
        <dl className="mt-6 grid gap-2 text-sm">
          <div>
            <dt className="text-text-muted">Número</dt>
            <dd>{row.number ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Rareza</dt>
            <dd>{row.rarity ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Comentarios</dt>
            <dd className="whitespace-pre-wrap">{row.notes ?? "—"}</dd>
          </div>
        </dl>
      )}
    </main>
  );
}
