import { describe, expect, it, vi } from "vitest";
import { HealthService } from "./health.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("HealthService", () => {
  it("returns liveness ok without touching the database", () => {
    const prisma = { isReady: vi.fn() } as unknown as PrismaService;
    const health = new HealthService(prisma);
    expect(health.liveness()).toEqual({ status: "ok" });
    expect(prisma.isReady).not.toHaveBeenCalled();
  });

  it("reports not_ready when prisma is down", async () => {
    const prisma = { isReady: vi.fn().mockResolvedValue(false) } as unknown as PrismaService;
    const health = new HealthService(prisma);
    await expect(health.readiness()).resolves.toEqual({ status: "not_ready" });
  });
});
