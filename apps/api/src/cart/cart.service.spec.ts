import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { CartService } from "./cart.service";

const listingRow = {
  id: "11111111-1111-4111-8111-111111111111",
  sellerId: "seller-1",
  status: "ACTIVE",
  quantity: 4,
  quantityReserved: 1,
  productType: "SINGLE",
  title: "Test Mon #1",
  condition: "NM",
  priceClp: 1000,
  description: "",
  allowsMeetup: true,
  allowsShipping: true,
  graded: false,
  grader: null,
  grade: null,
  publishedAt: new Date("2026-08-19T00:00:00.000Z"),
  createdAt: new Date("2026-08-19T00:00:00.000Z"),
  seller: { id: "seller-1", displayName: "Luis", slug: "luis" },
  images: [],
  variant: {
    id: "v1",
    language: "ES",
    finish: "NORMAL",
    finishDetail: "",
    isDefault: true,
    card: {
      id: "c1",
      slug: "test-mon-1",
      name: "Test Mon #1",
      number: "001",
      rarity: "Common",
      imageUrl: null,
      set: { slug: "set-1", game: { slug: "pokemon" } },
    },
  },
};

describe("CartService", () => {
  const prisma = {
    listing: { findUnique: vi.fn() },
    cart: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    cartItem: { upsert: vi.fn(), deleteMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    sellerInquiry: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  };
  const service = new CartService(prisma as never);

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.cart.findUnique.mockResolvedValue({
      id: "cart-1",
      userId: "buyer-1",
      items: [],
    });
    prisma.cart.create.mockResolvedValue({ id: "cart-1", userId: "buyer-1" });
  });

  it("rejects inactive listings", async () => {
    prisma.listing.findUnique.mockResolvedValue({ ...listingRow, status: "PAUSED" });
    await expect(
      service.putItem(
        { userId: "buyer-1" },
        { listingId: listingRow.id, quantity: 1 },
      ),
    ).rejects.toMatchObject({
      code: ERROR_CODES.LISTING_NOT_ACTIVE,
      status: HttpStatus.CONFLICT,
    });
    expect(prisma.cartItem.upsert).not.toHaveBeenCalled();
  });

  it("rejects quantity above available stock and does not reserve", async () => {
    prisma.listing.findUnique.mockResolvedValue(listingRow);
    await expect(
      service.putItem(
        { userId: "buyer-1" },
        { listingId: listingRow.id, quantity: 4 },
      ),
    ).rejects.toMatchObject({
      code: ERROR_CODES.LISTING_INSUFFICIENT_STOCK,
      status: HttpStatus.CONFLICT,
    });
    expect(prisma.cartItem.upsert).not.toHaveBeenCalled();
    expect(prisma.listing.findUnique).toHaveBeenCalled();
  });

  it("upserts quantity without touching listing reservation", async () => {
    prisma.listing.findUnique.mockResolvedValue(listingRow);
    prisma.cartItem.upsert.mockResolvedValue({});
    prisma.cart.findUnique
      .mockResolvedValueOnce({ id: "cart-1", userId: "buyer-1" })
      .mockResolvedValueOnce({
        id: "cart-1",
        items: [{ listingId: listingRow.id, quantity: 2, listing: listingRow }],
      });

    const result = await service.putItem(
      { userId: "buyer-1" },
      { listingId: listingRow.id, quantity: 2 },
    );

    expect(prisma.cartItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ quantity: 2 }),
        update: { quantity: 2 },
      }),
    );
    expect(result.view.productTotalClp).toBe(2000);
    expect(result.view.itemCount).toBe(2);
  });

  it("forbids adding your own listing", async () => {
    prisma.listing.findUnique.mockResolvedValue(listingRow);
    await expect(
      service.putItem(
        { userId: "seller-1" },
        { listingId: listingRow.id, quantity: 1 },
      ),
    ).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
      status: HttpStatus.FORBIDDEN,
    });
  });

  it("merges guest quantities into the user cart capped by stock", async () => {
    prisma.cart.findUnique.mockImplementation((args: { where: { guestToken?: string; userId?: string; id?: string } }) => {
      if (args.where.guestToken) {
        return Promise.resolve({
          id: "guest-cart",
          userId: null,
          guestToken: "guest-token-value-16",
          items: [{ listingId: listingRow.id, quantity: 2, listing: listingRow }],
        });
      }
      if (args.where.userId === "buyer-1") {
        return Promise.resolve({
          id: "user-cart",
          userId: "buyer-1",
          items: [{ id: "ci-1", listingId: listingRow.id, quantity: 2 }],
        });
      }
      if (args.where.id === "user-cart") {
        return Promise.resolve({
          id: "user-cart",
          items: [{ listingId: listingRow.id, quantity: 3, listing: listingRow }],
        });
      }
      return Promise.resolve(null);
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<void>) => {
      await fn(prisma);
    });

    const result = await service.get({ userId: "buyer-1", guestToken: "guest-token-value-16" });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: "ci-1" },
      data: { quantity: 3 },
    });
    expect(prisma.cart.delete).toHaveBeenCalledWith({ where: { id: "guest-cart" } });
    expect(prisma.sellerInquiry.updateMany).toHaveBeenCalledWith({
      where: { guestToken: "guest-token-value-16", buyerId: null },
      data: { buyerId: "buyer-1" },
    });
    expect(result.clearGuestCookie).toBe(true);
    expect(result.view.productTotalClp).toBe(3000);
  });
});
