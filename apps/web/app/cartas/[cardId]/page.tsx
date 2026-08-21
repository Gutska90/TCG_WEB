import { notFound, redirect } from "next/navigation";
import { CatalogRequestError, getCardById } from "../../../lib/catalog";

export default async function CardIdRedirect({ params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  try {
    const card = await getCardById(cardId);
    redirect(`/${card.game.slug}/${card.set.slug}/${card.slug}`);
  } catch (error) {
    if (error instanceof CatalogRequestError && error.status === 404) notFound();
    throw error;
  }
}
