"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CARD_CONDITION_LABELS,
  SELLER_INQUIRY_STATUS_LABELS,
  formatClp,
  inquiryNumberLabel,
  whatsappMeHref,
} from "@tcg/config";
import type { SellerInquiryView } from "@tcg/types";
import { ApiError } from "../../../../lib/api";
import { userFacingError, loginHref } from "../../../../lib/errors";
import { getInquiry } from "../../../../lib/inquiries";
import { FormError, LoadingBlock, PageMain } from "../../../../components/ui-feedback";
import { buttonClassName } from "../../../../components/ui/button-styles";

export default function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [row, setRow] = useState<SellerInquiryView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInquiry(id)
      .then(setRow)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace(loginHref(`/me/consultas/${id}`));
        else setError(userFacingError(err));
      });
  }, [id, router]);

  if (error && !row) {
    return (
      <PageMain>
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!row) {
    return (
      <PageMain>
        <LoadingBlock />
      </PageMain>
    );
  }

  const wa =
    row.seller.contactWhatsappEnabled && row.seller.contactWhatsapp
      ? whatsappMeHref(row.seller.contactWhatsapp, row.messageText)
      : null;

  return (
    <PageMain>
      <p className="text-sm">
        <Link href="/me/consultas" className="underline">
          Consultas
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{inquiryNumberLabel(row.inquiryNumber)}</h1>
      <p className="mt-1 text-text-muted">
        {SELLER_INQUIRY_STATUS_LABELS[row.status]} · {row.seller.displayName} · {formatClp(row.subtotalClp)}
      </p>
      <p className="mt-2 text-sm text-text-muted">
        Vence {new Date(row.expiresAt).toLocaleString("es-CL")}. Esta consulta no reserva stock.
      </p>
      <ul className="mt-6 grid gap-2 text-sm">
        {row.items.map((item) => (
          <li key={item.listingId}>
            {item.titleSnapshot} · {CARD_CONDITION_LABELS[item.condition]} · {item.quantity} ×{" "}
            {formatClp(item.unitPriceClp)}
          </li>
        ))}
      </ul>
      {wa ? (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={`${buttonClassName("secondary")} mt-6 inline-flex`}>
          Abrir WhatsApp
        </a>
      ) : null}
      <p className="mt-6 text-sm">
        <Link href="/carrito" className="underline">
          Ir al carrito
        </Link>
        {" · "}
        <Link href="/checkout" className="underline">
          Ir a pagar
        </Link>
      </p>
    </PageMain>
  );
}
