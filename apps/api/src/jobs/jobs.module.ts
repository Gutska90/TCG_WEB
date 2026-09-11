import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import type { RedisClientType } from "redis";
import { OrdersModule } from "../orders/orders.module";
import { PaymentsModule } from "../payments/payments.module";
import { ReconciliationModule } from "../reconciliation/reconciliation.module";
import { CollectionsModule } from "../collections/collections.module";
import { PricesModule } from "../prices/prices.module";
import { InquiriesModule } from "../inquiries/inquiries.module";
import { WishlistModule } from "../wishlist/wishlist.module";
import { RedisModule } from "../redis/redis.module";
import { JobRunner } from "./job-runner";
import { JobScheduler } from "./job-scheduler";
import { JobsService } from "./jobs.service";
import {
  AlwaysLeaderLock,
  REDIS_CLIENT,
  RedisSchedulerLock,
  SCHEDULER_LOCK,
  type RedisCommands,
} from "./scheduler-lock";

@Module({
  imports: [
    RedisModule,
    OrdersModule,
    PaymentsModule,
    ReconciliationModule,
    PricesModule,
    CollectionsModule,
    WishlistModule,
    InquiriesModule,
  ],
  providers: [
    JobRunner,
    JobsService,
    {
      provide: SCHEDULER_LOCK,
      useFactory: (client: RedisClientType | null) => {
        if (!client) return new AlwaysLeaderLock();
        const redis: RedisCommands = {
          get: (key) => client.get(key),
          set: (key, value, options) => client.set(key, value, options),
          del: async (key) => Number(await client.del(key)),
        };
        return new RedisSchedulerLock(redis, randomUUID());
      },
      inject: [REDIS_CLIENT],
    },
    JobScheduler,
  ],
  exports: [JobRunner, JobsService, JobScheduler],
})
export class JobsModule {}
