"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";
import { ROLES } from "@tcg/config";
import type { AdminUserListItem, Paginated } from "@tcg/types";
import { FilterBar, Pager, SearchInput } from "@/components/filters";
import { api } from "@/lib/api";

function Inner() {
  const search = useSearchParams();
  const qs = search?.toString() ?? "";
  const router = useRouter();
  const [data, setData] = useState<Paginated<AdminUserListItem> | null>(null);

  useEffect(() => {
    void api<Paginated<AdminUserListItem>>(`/v1/admin/users${qs ? `?${qs}` : ""}`).then(setData);
  }, [qs]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (String(value)) next.set(key, String(value));
    }
    router.push(`/admin/users?${next.toString()}`);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Usuarios</h1>
      <FilterBar onSubmit={onSubmit}>
        <SearchInput />
        <label className="flex flex-col gap-1">
          Rol
          <select
            name="role"
            defaultValue={new URLSearchParams(qs).get("role") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          >
            <option value="">Todos</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-400">
            <tr>
              <th className="py-2">Email</th>
              <th>Nombre</th>
              <th>Roles</th>
              <th>Ban</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-t border-neutral-800">
                <td className="py-2">{row.email}</td>
                <td>{row.displayName}</td>
                <td className="text-xs">{row.roles.join(", ")}</td>
                <td>{row.isBanned ? "sí" : "no"}</td>
                <td>
                  {row.roles.includes("SELLER") || row.roles.includes("STORE") ? (
                    <a href={`/admin/sellers/${row.id}/balance`} className="text-xs underline">
                      Saldo
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data ? <Pager page={data.page} pageSize={data.pageSize} total={data.total} /> : null}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Cargando…</p>}>
      <Inner />
    </Suspense>
  );
}
