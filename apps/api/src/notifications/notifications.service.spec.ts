import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const prisma = {
    notification: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  const mail = { send: vi.fn() };
  const service = new NotificationsService(prisma as never, mail as never);

  beforeEach(() => vi.clearAllMocks());

  it("404s when marking another user's notification (no IDOR leak)", async () => {
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(service.markRead("user-1", "n1")).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it("maps persisted order types without collapsing to WISHLIST_HIT", async () => {
    prisma.$transaction.mockResolvedValue([
      1,
      1,
      [
        {
          id: "n1",
          type: "SALE_MADE",
          title: "Nueva venta",
          body: "Vendiste IT Card por $80.000.",
          data: { orderId: "o1" },
          readAt: null,
          createdAt: new Date("2026-08-22T12:00:00Z"),
        },
      ],
    ]);
    const page = await service.list("user-1", 1, 20);
    expect(page.items[0]?.type).toBe("SALE_MADE");
  });
});
