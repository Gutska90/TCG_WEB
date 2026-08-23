import Link from "next/link";
import { notFound } from "next/navigation";
import { formatClp, formatReputation } from "@tcg/config";
import { CatalogRequestError, catalogGet } from "../../../lib/catalog";
import { getListings } from "../../../lib/listings";
import type { PublicUserView, SellerRatingsPageView } from "@tcg/types";

export default async function SellerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const seller = await catalogGet<PublicUserView>(`/v1/users/${slug}`, false);
    const [listings, ratings] = await Promise.all([
      getListings({ sellerId: seller.id }),
      catalogGet<SellerRatingsPageView>(`/v1/users/${seller.id}/ratings?pageSize=20`, false),
    ]);
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold">{seller.displayName}</h1>
        <p className="mt-2 text-text-muted">
          {seller.profile.comuna ?? "Chile"} · miembro desde {new Date(seller.createdAt).getFullYear()} ·{" "}
          {formatReputation(seller.reputation.averageStars, seller.reputation.count)}
        </p>
        {seller.profile.bio ? <p className="mt-4">{seller.profile.bio}</p> : null}
        <h2 className="mt-10 text-xl font-medium">Productos</h2>
        <ul className="mt-4 grid gap-3">
          {listings.items.map((item) => (
            <li key={item.id}>
              <Link href={`/listings/${item.id}`} className="block rounded-[16px] border border-border bg-surface p-4">
                {item.title} · {formatClp(item.priceClp)}
              </Link>
            </li>
          ))}
        </ul>
        {listings.items.length === 0 ? <p className="mt-4 text-text-muted">Sin publicaciones activas.</p> : null}
        <h2 className="mt-10 text-xl font-medium">Valoraciones</h2>
        <ul className="mt-4 grid gap-3">
          {ratings.items.map((row) => (
            <li key={row.id} className="rounded-[16px] border border-border bg-surface p-3 text-sm">
              <p className="font-medium">
                {row.stars} ★ · {row.from.displayName}
              </p>
              {row.comment ? <p className="mt-1 text-text-muted">{row.comment}</p> : null}
            </li>
          ))}
        </ul>
        {ratings.items.length === 0 ? <p className="mt-4 text-text-muted">Aún no hay valoraciones públicas.</p> : null}
      </main>
    );
  } catch (error) {
    if (error instanceof CatalogRequestError && error.status === 404) notFound();
    throw error;
  }
}
