import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import type { CartSellerGroupView, CartView, ListingView } from "@tcg/types";
import { InquiriesService } from "./inquiries.service";

const seller = {
  id: "seller-1",
  displayName: "Mitos Store",
  slug: "mitos-store",
  reputation: { averageStars: null, count: 0 },
  contactWhatsappEnabled: true,
  contactWhatsapp: "+56911111111",
};

const listing = {
  id: "listing-1",
  title: "Hestia",
  condition: "NM",
  priceClp: 3300,
  variant: {
    id: "variant-1",
    card: { name: "Hestia", setName: "Helénica" },
  },
  seller,
} as ListingView;

const group: CartSellerGroupView = {
  seller,
  subtotalClp: 6600,
  items: [
    {
      listingId: "listing-1",
      quantity: 2,
      lineTotalClp: 6600,
      purchasable: true,
      issue: null,
      listing,
    },
  ],
};

const cartView: CartView = {
  id: "cart-1",
  groups: [group],
  items: group.items,
  productTotalClp: 6600,
  itemCount: 2,
};

const createdRow = {
  id: "inquiry-1",
  inquiryNumber: "C-12",
  status: "OPEN" as const,
  subtotalClp: 6600,
  messageText: "Consulta N° 12",
  expiresAt: new Date("2026-09-12T22:00:00.000Z"),
  createdAt: new Date("2026-09-11T22:00:00.000Z"),
  seller: {
    id: seller.id,
    displayName: seller.displayName,
    slug: seller.slug,
    profile: { contactWhatsapp: seller.contactWhatsapp, contactWhatsappEnabled: true },
  },
  items: [
    {
      listingId: "listing-1",
      variantId: "variant-1",
      titleSnapshot: "Hestia",
      condition: "NM" as const,
      quantity: 2,
      unitPriceClp: 3300,
      lineTotalClp: 6600,
    },
  ],
};

describe("InquiriesService", () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    listing: { update: vi.fn() },
    sellerInquiry: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };
  const carts = { get: vi.fn() };
  const audit = { log: vi.fn() };
  const notifications = { safeEmit: vi.fn() };
  const service = new InquiriesService(prisma as never, carts as never, audit as never, notifications as never);

  beforeEach(() => {
    vi.clearAllMocks();
    carts.get.mockResolvedValue({ view: cartView, issuedGuestToken: "guest-token-16chars" });
    prisma.user.findUnique.mockResolvedValue({ displayName: "Gutska" });
    prisma.$queryRaw.mockResolvedValue([{ n: 12n }]);
    prisma.sellerInquiry.create.mockResolvedValue(createdRow);
    audit.log.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") {
        return arg(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
  });

  it("creates an inquiry from a seller cart group without reserving stock", async () => {
    const result = await service.create(
      { userId: "buyer-1" },
      { sellerId: "seller-1", cartUrl: "https://example.test/carrito" },
    );
    expect(result.view.inquiryNumber).toBe("C-12");
    expect(result.view.subtotalClp).toBe(6600);
    expect(result.view.messageText).toContain("Consulta N° 12");
    expect(prisma.listing.update).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "inquiry.created", entityType: "SellerInquiry" }),
      prisma,
    );
    expect(notifications.safeEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "seller-1",
        type: "SELLER_INQUIRY",
        data: { inquiryId: "inquiry-1", inquiryNumber: "C-12" },
      }),
    );
  });

  it("rejects an empty or unpurchasable seller group", async () => {
    carts.get.mockResolvedValue({
      view: { ...cartView, groups: [{ ...group, items: [{ ...group.items[0], purchasable: false, issue: "OWN_LISTING" }] }] },
    });
    await expect(service.create({ userId: "buyer-1" }, { sellerId: "seller-1" })).rejects.toMatchObject({
      code: ERROR_CODES.CART_EMPTY,
      status: HttpStatus.CONFLICT,
    });
    expect(prisma.sellerInquiry.create).not.toHaveBeenCalled();
    expect(notifications.safeEmit).not.toHaveBeenCalled();
  });

  it("skips the caller's own listing", async () => {
    carts.get.mockResolvedValue({ view: { ...cartView, groups: [] } });
    await expect(service.create({ userId: "seller-1" }, { sellerId: "seller-1" })).rejects.toMatchObject({
      code: ERROR_CODES.CART_EMPTY,
    });
  });

  it("expires open inquiries past expiresAt", async () => {
    prisma.sellerInquiry.updateMany.mockResolvedValue({ count: 2 });
    await expect(service.expireOpen()).resolves.toEqual({ expired: 2 });
    expect(prisma.sellerInquiry.updateMany).toHaveBeenCalledWith({
      where: { status: "OPEN", expiresAt: { lte: expect.any(Date) } },
      data: { status: "EXPIRED" },
    });
  });

  it("404s when another party reads an inquiry", async () => {
    prisma.sellerInquiry.findFirst.mockResolvedValue(null);
    await expect(service.get({ userId: "stranger" }, "inquiry-1")).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  });
});
