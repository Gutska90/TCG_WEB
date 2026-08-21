import type { ReputationView, SellerRatingView } from "@tcg/types";

export const EMPTY_REPUTATION: ReputationView = { averageStars: null, count: 0 };

const partySelect = { id: true, displayName: true, slug: true } as const;

export const ratingInclude = {
  from: { select: partySelect },
} as const;

export type RatingRow = {
  id: string;
  orderId: string;
  stars: number;
  comment: string;
  isPublic: boolean;
  createdAt: Date;
  from: { id: string; displayName: string; slug: string };
};

export function roundStars(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(Number(value))) {
    return null;
  }
  return Math.round(Number(value) * 10) / 10;
}

export function toSellerRatingView(row: RatingRow): SellerRatingView {
  return {
    id: row.id,
    orderId: row.orderId,
    stars: row.stars,
    comment: row.comment,
    isPublic: row.isPublic,
    createdAt: row.createdAt.toISOString(),
    from: row.from,
  };
}
