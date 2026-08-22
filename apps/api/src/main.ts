import "reflect-metadata";
import { json, urlencoded, type NextFunction, type Request, type Response } from "express";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { PLATFORM, assertOauthRuntimeConfig, assertRealPaymentsLegalGate } from "@tcg/config";
import { AppModule } from "./app.module";
import { JsonLogger } from "./observability/json-logger";
import { resolveJwtAccessSecret } from "./auth/jwt-secret";

function assertRuntimeConfig(): void {
  const env = process.env.NODE_ENV ?? "development";
  if (env === "production" || env === "staging") {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required in production/staging");
    }
    const origins = process.env.CORS_ORIGINS ?? "";
    if (!origins.trim() || origins.split(",").some((origin) => origin.trim() === "*")) {
      throw new Error("CORS_ORIGINS must be an explicit allowlist (no *) in production/staging");
    }
    resolveJwtAccessSecret(process.env.JWT_ACCESS_SECRET, env);
  }
  assertOauthRuntimeConfig(process.env);
  assertRealPaymentsLegalGate(process.env);
}

async function bootstrap() {
  assertRuntimeConfig();
  const app = await NestFactory.create(AppModule, { logger: new JsonLogger(), bodyParser: false });
  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3002")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(json({ limit: PLATFORM.jsonBodyLimitBytes }));
  app.use(urlencoded({ extended: false, limit: PLATFORM.jsonBodyLimitBytes }));
  app.use(cookieParser());
  app.enableCors({ origin: origins, credentials: true });
  app.enableShutdownHooks();
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.setTimeout(30_000);
    res.setTimeout(30_000);
    next();
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
