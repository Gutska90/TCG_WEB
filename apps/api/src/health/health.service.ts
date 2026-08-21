import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  liveness(): { status: "ok" } {
    return { status: "ok" };
  }

  async readiness(): Promise<{ status: "ready" | "not_ready" }> {
    const ready = await this.prisma.isReady();
    return { status: ready ? "ready" : "not_ready" };
  }
}
