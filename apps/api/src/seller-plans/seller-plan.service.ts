import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ERROR_CODES, SELLER_PLAN_RATES, type SellerPlan } from "@tcg/config";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { RequestUser } from "../auth/request-user";

export type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class SellerPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async lockSellers(tx: Prisma.TransactionClient, sellerIds: string[]): Promise<void> {
    const ids = [...new Set(sellerIds)].sort();
    if (ids.length === 0) return;
    await tx.$queryRaw`
      SELECT id
      FROM users
      WHERE id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
      ORDER BY id
      FOR UPDATE
    `;
    await tx.$queryRaw`
      SELECT id
      FROM seller_subscriptions
      WHERE seller_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
        AND status = 'ACTIVE'
      ORDER BY id
      FOR UPDATE
    `;
  }

  async getEffectivePlan(sellerId: string, at: Date, client: DbClient = this.prisma): Promise<SellerPlan> {
    const subscription = await client.sellerSubscription.findFirst({
      where: {
        sellerId,
        status: "ACTIVE",
        startsAt: { lte: at },
        OR: [{ endsAt: null }, { endsAt: { gt: at } }],
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    });
    return subscription?.plan ?? "FREE";
  }

  async getActiveSubscription(sellerId: string, at: Date, client: DbClient = this.prisma) {
    return client.sellerSubscription.findFirst({
      where: {
        sellerId,
        status: "ACTIVE",
        startsAt: { lte: at },
        OR: [{ endsAt: null }, { endsAt: { gt: at } }],
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    });
  }

  async assignPlan(
    actor: RequestUser,
    sellerId: string,
    input: { plan: SellerPlan; reason: string; startsAt?: Date; endsAt?: Date },
  ) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true, deletedAt: true },
    });
    if (!seller || seller.deletedAt) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Vendedor no encontrado");
    }
    const startsAt = input.startsAt ?? new Date();
    if (input.endsAt && input.endsAt <= startsAt) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "endsAt debe ser posterior a startsAt");
    }

    await this.prisma.$transaction(async (tx) => {
      await this.lockSellers(tx, [sellerId]);
      const now = new Date();
      await tx.sellerSubscription.updateMany({
        where: { sellerId, status: "ACTIVE" },
        data: { status: "CANCELLED", endsAt: now },
      });
      if (input.plan !== "FREE") {
        await tx.sellerSubscription.create({
          data: {
            sellerId,
            plan: input.plan,
            status: "ACTIVE",
            source: "MANUAL",
            startsAt,
            endsAt: input.endsAt ?? null,
            reason: input.reason,
          },
        });
      }
    });

    await this.audit.log({
      actorId: actor.id,
      action: "seller.plan.assigned",
      entityType: "User",
      entityId: sellerId,
      metadata: {
        plan: input.plan,
        reason: input.reason,
        source: "MANUAL",
        startsAt: startsAt.toISOString(),
        endsAt: input.endsAt?.toISOString() ?? null,
        billing: "manual_beta_no_recurring_charge",
      },
    });

    return {
      sellerId,
      plan: input.plan,
      source: "MANUAL" as const,
      startsAt: startsAt.toISOString(),
      endsAt: input.endsAt?.toISOString() ?? null,
      monthlyPriceClp: SELLER_PLAN_RATES[input.plan].monthlyPriceClp,
      notice:
        "Plan asignado manualmente. No existe cobro recurrente automático. La mensualidad no genera Payment, Order ni asiento de ledger.",
    };
  }
}
