"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ORDER_STATUS_LABELS, formatClp } from "@tcg/config";
import type { OrderView, Paginated } from "@tcg/types";
import { ApiError } from "../../../lib/api";
import { userFacingError, loginHref } from "../../../lib/errors";
import { listOrders } from "../../../lib/orders";
import { EmptyState, FormError, LoadingBlock, PageMain } from "../../../components/ui-feedback";

export default function SalesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<OrderView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOrders("seller")
      .then((data: Paginated<OrderView>) => setRows(data.items))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace(loginHref("/me/ventas"));
        else setError(userFacingError(err));
      });
  }, [router]);

  if (error) {
    return (
      <PageMain width="lg">
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!rows) {
    return (
      <PageMain width="lg">
        <LoadingBlock />
      </PageMain>
    );
  }

  return (
    <PageMain width="lg">
      <h1 className="text-2xl font-semibold">Mis ventas</h1>
      {rows.length === 0 ? (
        <EmptyState>
          Aún no hay ventas.{" "}
          <Link href="/me/publicaciones" className="underline">
            Ver publicaciones
          </Link>
        </EmptyState>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((order) => (
            <li key={order.id}>
              <Link href={`/me/ventas/${order.id}`} className="block rounded-[16px] border border-border bg-surface p-4">
                {order.orderNumber} · {ORDER_STATUS_LABELS[order.status]} · {formatClp(order.totalClp)}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-sm">
        <Link href="/me/balance" className="underline">
          Ver saldo
        </Link>
      </p>
    </PageMain>
  );
}
