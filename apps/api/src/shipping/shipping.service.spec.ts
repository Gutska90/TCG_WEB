import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES, findChilePlace, quoteShippingClp } from "@tcg/config";
import { ShippingService } from "./shipping.service";
import type { RequestUser } from "../auth/request-user";

const buyer: RequestUser = {
  id: "buyer-1",
  email: "b@b.cl",
  roles: ["USER"],
  sessionId: "s1",
  emailVerified: true,
  tokenVersion: 0,
};

describe("shipping quotes", () => {
  it("meetup is always 0", () => {
    expect(quoteShippingClp("MEETUP", "RM", "REGIONS")).toBe(0);
  });

  it("uses RM vs regiones table", () => {
    expect(quoteShippingClp("CHILEXPRESS", "RM", "RM")).toBe(3990);
    expect(quoteShippingClp("CHILEXPRESS", "RM", "REGIONS")).toBe(5990);
    expect(quoteShippingClp("BLUE_EXPRESS", "RM", "RM")).toBe(3790);
  });

  it("does not offer store pickup", () => {
    expect(quoteShippingClp("STORE_PICKUP", "RM", "RM")).toBeNull();
  });

  it("maps comunas to RM vs regiones", () => {
    expect(findChilePlace("Las Condes")?.zone).toBe("RM");
    expect(findChilePlace("Valparaíso")?.zone).toBe("REGIONS");
  });
});

describe("ShippingService", () => {
  const prisma = {
    user: { findFirst: vi.fn() },
    shippingRate: { findUnique: vi.fn() },
    shipment: { findUnique: vi.fn() },
  };
  const service = new ShippingService(prisma as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("404s an unknown seller", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.quote({ sellerId: "11111111-1111-1111-1111-111111111111", method: "MEETUP", comuna: "Santiago" }),
    ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND, status: HttpStatus.NOT_FOUND });
  });

  it("rejects store pickup", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: "seller-1",
      profile: { comuna: "Santiago", region: "Metropolitana de Santiago" },
    });
    await expect(
      service.quote({
        sellerId: "11111111-1111-1111-1111-111111111111",
        method: "STORE_PICKUP",
        comuna: "Santiago",
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.SHIPPING_METHOD_UNAVAILABLE,
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it("quotes chilexpress RM to Valparaíso from the table", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: "seller-1",
      profile: { comuna: "Santiago", region: "Metropolitana de Santiago" },
    });
    prisma.shippingRate.findUnique.mockResolvedValue({ priceClp: 5990 });
    await expect(
      service.quote({
        sellerId: "11111111-1111-1111-1111-111111111111",
        method: "CHILEXPRESS",
        comuna: "Valparaíso",
      }),
    ).resolves.toMatchObject({
      originComuna: "Santiago",
      destComuna: "Valparaíso",
      originZone: "RM",
      destZone: "REGIONS",
      priceClp: 5990,
    });
  });

  it("404s another user's shipment", async () => {
    prisma.shipment.findUnique.mockResolvedValue({
      id: "sh1",
      orderId: "o1",
      method: "CHILEXPRESS",
      status: "PENDING",
      carrier: "CHILEXPRESS",
      trackingCode: null,
      meetupAt: null,
      meetupPlace: null,
      labelUrl: null,
      order: { buyerId: "other", sellerId: "seller-9" },
    });
    await expect(service.getForParticipant(buyer, "sh1")).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  });
});
