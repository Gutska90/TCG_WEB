"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { JobRunView } from "@tcg/types";
import { JobBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

export default function AdminJobDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<JobRunView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void api<JobRunView>(`/v1/admin/jobs/${id}`)
      .then(setData)
      .catch(() => setError("Job no encontrado"));
  }, [id]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando job…</p>;

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <h1 className="text-xl font-semibold">{data.jobName}</h1>
      <JobBadge status={data.status} />
      <p className="text-sm text-neutral-400">Inicio: {data.startedAt}</p>
      <p className="text-sm text-neutral-400">Fin: {data.finishedAt ?? "—"}</p>
      <p className="text-sm text-neutral-400">Duración: {data.durationMs != null ? `${data.durationMs} ms` : "—"}</p>
      <p className="text-sm text-neutral-400">Correlation: {data.correlationId ?? "—"}</p>
      {data.errorCode ? (
        <p className="text-sm text-red-300">
          {data.errorCode}: {data.errorMessage}
        </p>
      ) : null}
    </div>
  );
}
