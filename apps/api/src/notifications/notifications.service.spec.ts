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
});
