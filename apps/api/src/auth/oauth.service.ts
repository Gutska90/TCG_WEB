import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  ERROR_CODES,
  appleClientAudiences,
  googleClientAudiences,
  loadFeatureFlags,
} from "@tcg/config";
import { AppError } from "../common/errors/app-error";
import { resolveJwtAccessSecret } from "./jwt-secret";
import { parseStubOauthToken, type OauthProfile } from "./oauth-stub";

export type { OauthProfile };

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

@Injectable()
export class OauthService {
  constructor(private readonly config: ConfigService) {}

  async verifyGoogle(idToken: string): Promise<OauthProfile> {
    this.assertProviderEnabled("GOOGLE");
    const stub = this.tryStub(idToken, "GOOGLE");
    if (stub) return stub;

    const audiences = googleClientAudiences();
    if (audiences.length === 0) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.OAUTH_NOT_CONFIGURED,
        "Google no está configurado",
      );
    }

    const client = new OAuth2Client(audiences[0]);
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: audiences });
      const payload = ticket.getPayload();
      if (!payload?.sub) {
        throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, "Token inválido");
      }
      return {
        provider: "GOOGLE",
        subject: payload.sub,
        email: payload.email ? payload.email.toLowerCase() : null,
        emailVerified: Boolean(payload.email_verified),
        displayName: payload.name ?? null,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, "Token inválido");
    }
  }

  async verifyApple(identityToken: string): Promise<OauthProfile> {
    this.assertProviderEnabled("APPLE");
    const stub = this.tryStub(identityToken, "APPLE");
    if (stub) return stub;

    const audiences = appleClientAudiences();
    if (audiences.length === 0) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.OAUTH_NOT_CONFIGURED,
        "Apple no está configurado",
      );
    }

    try {
      const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: APPLE_ISSUER,
        audience: audiences,
      });
      const subject = typeof payload.sub === "string" ? payload.sub : null;
      if (!subject) {
        throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, "Token inválido");
      }
      const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
      const emailVerified = payload.email_verified === true || payload.email_verified === "true";
      return {
        provider: "APPLE",
        subject,
        email,
        emailVerified,
        displayName: null,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, "Token inválido");
    }
  }

  private tryStub(token: string, provider: "GOOGLE" | "APPLE"): OauthProfile | null {
    const flags = loadFeatureFlags();
    if (!flags.authStubOauth || !token.startsWith("stub.")) return null;
    try {
      const profile = parseStubOauthToken(resolveJwtAccessSecret(this.config.get<string>("JWT_ACCESS_SECRET")), token);
      if (profile.provider !== provider) {
        throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, "Token inválido");
      }
      return profile;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, "Token inválido");
    }
  }

  private assertProviderEnabled(provider: "GOOGLE" | "APPLE"): void {
    const flags = loadFeatureFlags();
    const enabled = provider === "GOOGLE" ? flags.enableGoogleAuth : flags.enableAppleAuth;
    if (!enabled) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.FEATURE_DISABLED,
        provider === "GOOGLE" ? "Google no está habilitado" : "Apple no está habilitado",
      );
    }
  }
}
