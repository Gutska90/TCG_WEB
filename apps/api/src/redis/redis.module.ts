import { Global, Module } from "@nestjs/common";
import type { RedisClientType } from "redis";
import { REDIS_CLIENT } from "../jobs/scheduler-lock";
import { connectRedis } from "./redis.factory";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async (): Promise<RedisClientType | null> => connectRedis(),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
