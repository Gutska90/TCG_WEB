import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.connected = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`Database unavailable at startup: ${message}`);
      this.connected = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.connected = false;
  }

  async isReady(): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
