import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PLATFORM } from "@tcg/config";
import { AccessAuthGuard } from "../common/guards/access-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuthAccountController } from "./auth-account.controller";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { resolveJwtAccessSecret } from "./jwt-secret";
import { OauthService } from "./oauth.service";
import { PasswordService } from "./password.service";

@Module({
  imports: [
    ThrottlerModule.forRoot({
      skipIf: () => {
        const env = process.env.NODE_ENV ?? process.env.APP_ENV ?? "";
        return process.env.E2E_RELAX_THROTTLE === "true" || env === "development" || env === "test";
      },
      throttlers: [{ name: "default", ttl: 60_000, limit: 120 }],
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtAccessSecret(config.get<string>("JWT_ACCESS_SECRET")),
        signOptions: {
          issuer: config.get<string>("JWT_ISSUER") ?? "tcg-platform",
          expiresIn: `${PLATFORM.accessTokenTtlSec}s`,
        },
      }),
    }),
  ],
  controllers: [AuthController, AuthAccountController],
  providers: [
    AuthService,
    PasswordService,
    OauthService,
    AccessAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: AccessAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [AuthService, AccessAuthGuard],
})
export class AuthModule {}
