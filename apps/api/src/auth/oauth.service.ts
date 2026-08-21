import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { ERROR_CODES } from "@tcg/config";
import { AppError } from "../common/errors/app-error";

export type OauthProfile = {
  provider: "GOOGLE" | "APPLE";
  subject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
};

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

@Injectable()
export class OauthService {
  constructor(private readonly config: ConfigService) {}

  async verifyGoogle(idToken: string): Promise<OauthProfile> {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    if (!clientId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.OAUTH_NOT_CONFIGURED,
        "Google no está configurado",
      );
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
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
  }

  async verifyApple(identityToken: string): Promise<OauthProfile> {
    const clientId = this.config.get<string>("APPLE_CLIENT_ID");
    if (!clientId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.OAUTH_NOT_CONFIGURED,
        "Apple no está configurado",
      );
    }

    try {
      const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: APPLE_ISSUER,
        audience: clientId,
      });
      const subject = typeof payload.sub === "string" ? payload.sub : null;
      if (!subject) {
        throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, "Token inválido");
      }

      const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
      const emailVerified =
        payload.email_verified === true || payload.email_verified === "true";

      return {
        provider: "APPLE",
        subject,
        email,
        emailVerified,
        displayName: null,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, "Token inválido");
    }
  }
}
