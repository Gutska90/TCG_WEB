"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ORDER_STATUS_LABELS, formatClp } from "@tcg/config";
import type { OrderView, Paginated } from "@tcg/types";
import { ApiError } from "../../../lib/api";
import { listOrders } from "../../../lib/orders";

export default function SalesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<OrderView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOrders("seller")
      .then((data: Paginated<OrderView>) => setRows(data.items))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/ingresar");
        else setError(err instanceof ApiError ? err.message : "No se pudo cargar");
      });
  }, [router]);

  if (error) return <main className="px-6 py-12 text-red-700">{error}</main>;
  if (!rows) return <main className="px-6 py-12 text-neutral-500">Cargando…</main>;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Mis ventas</h1>
      <ul className="mt-6 grid gap-3">
        {rows.map((order) => (
          <li key={order.id}>
            <Link href={`/me/ventas/${order.id}`} className="block rounded border p-4">
              {order.orderNumber} · {ORDER_STATUS_LABELS[order.status]} · {formatClp(order.totalClp)}
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="mt-4 text-neutral-500">Aún no hay ventas.</p> : null}
    </main>
  );
}
