import { Logger } from "@nestjs/common";
import { isStrictDeployEnv } from "@tcg/config";
import { createClient, type RedisClientType } from "redis";

const logger = new Logger("Redis");

export async function connectRedis(
  env: NodeJS.Dict<string> = process.env,
): Promise<RedisClientType | null> {
  const url = env.REDIS_URL?.trim();
  if (!url || env.NODE_ENV === "test") return null;

  const client = createClient({ url, socket: { connectTimeout: 3_000 } });
  client.on("error", (error) => {
    logger.error(error instanceof Error ? error.message : "redis error");
  });
  try {
    await client.connect();
    return client as RedisClientType;
  } catch (error) {
    if (isStrictDeployEnv(env)) {
      throw new Error(
        `REDIS_URL is set but Redis is unreachable: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
    logger.warn("Redis unreachable; job scheduler runs without a leader lock");
    return null;
  }
}
