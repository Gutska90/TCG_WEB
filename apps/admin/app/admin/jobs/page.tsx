"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { JobRunView, Paginated } from "@tcg/types";
import { JobBadge } from "@/components/status-badge";
import { Pager } from "@/components/filters";
import { api } from "@/lib/api";

function Inner() {
  const search = useSearchParams();
  const qs = search?.toString() ?? "";
  const [data, setData] = useState<Paginated<JobRunView> | null>(null);

  useEffect(() => {
    void api<Paginated<JobRunView>>(`/v1/admin/jobs${qs ? `?${qs}` : ""}`).then(setData);
  }, [qs]);

  if (!data) return <p className="text-sm text-neutral-400">Cargando jobs…</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Jobs</h1>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-neutral-500">
            <th className="py-1">Nombre</th>
            <th>Estado</th>
            <th>Inicio</th>
            <th>Duración</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((job) => (
            <tr key={job.id} className="border-t border-neutral-800">
              <td className="py-2">
                <Link href={`/admin/jobs/${job.id}`} className="hover:underline">
                  {job.jobName}
                </Link>
              </td>
              <td>
                <JobBadge status={job.status} />
              </td>
              <td>{job.startedAt}</td>
              <td>{job.durationMs != null ? `${job.durationMs} ms` : "—"}</td>
              <td className="text-red-300">{job.errorMessage ?? job.errorCode ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={data.page} pageSize={data.pageSize} total={data.total} />
    </div>
  );
}

export default function AdminJobsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Cargando jobs…</p>}>
      <Inner />
    </Suspense>
  );
}
