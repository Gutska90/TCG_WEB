"use client";

import { useEffect, useState } from "react";
import { FEEDBACK_CATEGORY_LABELS } from "@tcg/config";
import type { FeedbackView } from "@tcg/types";
import { api } from "@/lib/api";

type FeedbackPage = {
  items: FeedbackView[];
  page: number;
  pageSize: number;
  total: number;
};

export default function AdminFeedbackPage() {
  const [data, setData] = useState<FeedbackPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<FeedbackPage>("/v1/admin/feedback")
      .then(setData)
      .catch(() => setError("No se pudo cargar el feedback"));
  }, []);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando…</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Feedback beta</h1>
      <p className="text-sm text-neutral-400">{data.total} mensajes. No es un helpdesk.</p>
      <ul className="grid gap-3">
        {data.items.map((row) => (
          <li key={row.id} className="rounded border border-neutral-800 p-3 text-sm">
            <p className="text-neutral-400">
              {FEEDBACK_CATEGORY_LABELS[row.category]} · {row.createdAt} · {row.screen ?? "—"}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-neutral-100">{row.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
