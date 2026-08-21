import type { ListingView, ReputationView } from "@tcg/types";

const EMPTY_REPUTATION: ReputationView = { averageStars: null, count: 0 };

type ListingRow = {
  id: string;
  status: ListingView["status"];
  productType: "SINGLE" | "SEALED" | "ACCESSORY";
  title: string;
  condition: ListingView["condition"] | null;
  quantity: number;
  quantityReserved: number;
  priceClp: number;
  description: string;
  allowsMeetup: boolean;
  allowsShipping: boolean;
  graded: boolean;
  grader: string | null;
  grade: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  seller: { id: string; displayName: string; slug: string };
  images: Array<{ fileId: string; sortOrder: number }>;
  variant: {
    id: string;
    language: ListingView["variant"]["language"];
    finish: ListingView["variant"]["finish"];
    finishDetail: string;
    isDefault: boolean;
    card: {
      id: string;
      slug: string;
      name: string;
      number: string;
      rarity: string;
      imageUrl: string | null;
      set: { slug: string; game: { slug: string } };
    };
  } | null;
};

export const listingInclude = {
  seller: { select: { id: true, displayName: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const }, select: { fileId: true, sortOrder: true } },
  variant: { include: { card: { include: { set: { include: { game: true } } } } } },
} as const;

export function toListingView(row: ListingRow): ListingView {
  if (!row.variant || !row.condition || row.productType !== "SINGLE") {
    throw new Error("listing mapper: Fase 4 solo publica singles");
  }
  return {
    id: row.id,
    status: row.status,
    productType: "SINGLE",
    title: row.title,
    condition: row.condition,
    quantity: row.quantity,
    quantityReserved: row.quantityReserved,
    available: row.quantity - row.quantityReserved,
    priceClp: row.priceClp,
    description: row.description,
    allowsMeetup: row.allowsMeetup,
    allowsShipping: row.allowsShipping,
    graded: row.graded,
    grader: row.grader,
    grade: row.grade,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    seller: {
      ...row.seller,
      reputation: EMPTY_REPUTATION,
    },
    variant: {
      id: row.variant.id,
      language: row.variant.language,
      finish: row.variant.finish,
      finishDetail: row.variant.finishDetail,
      isDefault: row.variant.isDefault,
      card: {
        id: row.variant.card.id,
        slug: row.variant.card.slug,
        name: row.variant.card.name,
        number: row.variant.card.number,
        rarity: row.variant.card.rarity,
        imageUrl: row.variant.card.imageUrl,
        gameSlug: row.variant.card.set.game.slug,
        setSlug: row.variant.card.set.slug,
      },
    },
    images: row.images,
  };
}
