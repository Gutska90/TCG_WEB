import type { SellerInquiryView } from "@tcg/types";

const EMPTY_REPUTATION = { averageStars: null, count: 0 };

export const inquiryInclude = {
  seller: {
    select: {
      id: true,
      displayName: true,
      slug: true,
      profile: { select: { contactWhatsapp: true, contactWhatsappEnabled: true } },
    },
  },
  items: { orderBy: { createdAt: "asc" as const } },
} as const;

type InquiryRow = {
  id: string;
  inquiryNumber: string;
  status: SellerInquiryView["status"];
  subtotalClp: number;
  messageText: string;
  expiresAt: Date;
  createdAt: Date;
  seller: {
    id: string;
    displayName: string;
    slug: string;
    profile: { contactWhatsapp: string | null; contactWhatsappEnabled: boolean } | null;
  };
  items: Array<{
    listingId: string;
    variantId: string;
    titleSnapshot: string;
    condition: SellerInquiryView["items"][number]["condition"];
    quantity: number;
    unitPriceClp: number;
    lineTotalClp: number;
  }>;
};

export function toInquiryView(row: InquiryRow): SellerInquiryView {
  const enabled = Boolean(row.seller.profile?.contactWhatsappEnabled && row.seller.profile.contactWhatsapp);
  return {
    id: row.id,
    inquiryNumber: row.inquiryNumber,
    status: row.status,
    seller: {
      id: row.seller.id,
      displayName: row.seller.displayName,
      slug: row.seller.slug,
      reputation: EMPTY_REPUTATION,
      contactWhatsappEnabled: enabled,
      contactWhatsapp: enabled ? row.seller.profile?.contactWhatsapp ?? null : null,
    },
    subtotalClp: row.subtotalClp,
    messageText: row.messageText,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    items: row.items.map((item) => ({
      listingId: item.listingId,
      variantId: item.variantId,
      titleSnapshot: item.titleSnapshot,
      condition: item.condition,
      quantity: item.quantity,
      unitPriceClp: item.unitPriceClp,
      lineTotalClp: item.lineTotalClp,
    })),
  };
}
