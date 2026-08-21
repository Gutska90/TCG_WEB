import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthProvider, type Role, type User } from "@prisma/client";
import { ERROR_CODES, PLATFORM, type Role as AppRole } from "@tcg/config";
import type {
  AppleAuthInput,
  ForgotPasswordInput,
  GoogleAuthInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "@tcg/validation";
import type { AuthTokens, SessionView } from "@tcg/types";
import { AuditService } from "../audit/audit.service";
import { AppError } from "../common/errors/app-error";
import { normalizeEmail, randomToken, sha256, slugFromName } from "../common/crypto/tokens";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { OauthService, type OauthProfile } from "./oauth.service";
import { PasswordService } from "./password.service";
import type { RequestUser } from "./request-user";

type UserWithRoles = User & { roles: { role: Role }[] };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly oauth: OauthService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterInput, ctx: { ip?: string; userAgent?: string }): Promise<AuthTokens> {
    const email = normalizeEmail(input.email);
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.EMAIL_TAKEN, "El email ya está registrado");
    }

    const passwordHash = await this.passwords.hash(input.password);
    let verifyToken = "";
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName: input.displayName.trim(),
          slug: slugFromName(input.displayName),
          roles: { create: { role: "USER" } },
          identities: { create: { provider: AuthProvider.EMAIL, providerSubject: email } },
          profile: { create: { country: PLATFORM.country } },
        },
        include: { roles: true },
      });
      verifyToken = await this.createEmailToken(tx, created.id);
      return created;
    });

    await this.mail.send({
      to: email,
      subject: "Verifica tu email — TCG Platform",
      text: this.verificationMailBody(verifyToken),
    });
    await this.audit.log({
      actorId: user.id,
      action: "user.registered",
      entityType: "User",
      entityId: user.id,
      ip: ctx.ip,
    });
    return this.issueTokens(user, ctx);
  }

  async login(input: LoginInput, ctx: { ip?: string; userAgent?: string }): Promise<AuthTokens> {
    const email = normalizeEmail(input.email);
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { roles: true },
    });
    if (!user?.passwordHash) {
      throw new AppError(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS,
        "Email o contraseña incorrectos",
      );
    }
    const ok = await this.passwords.verify(user.passwordHash, input.password);
    if (!ok) {
      throw new AppError(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS,
        "Email o contraseña incorrectos",
      );
    }
    this.assertNotBanned(user);
    await this.audit.log({
      actorId: user.id,
      action: "user.login",
      entityType: "User",
      entityId: user.id,
      ip: ctx.ip,
    });
    return this.issueTokens(user, ctx);
  }

  async refresh(rawToken: string | undefined, ctx: { ip?: string; userAgent?: string }): Promise<AuthTokens> {
    if (!rawToken) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
    }
    const hash = sha256(rawToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    if (!session) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
    }
    if (session.revokedAt) {
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.log({
        actorId: session.userId,
        action: "auth.refresh_reuse",
        entityType: "Session",
        entityId: session.id,
        ip: ctx.ip,
      });
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
    }

    const user = await this.prisma.user.findFirst({
      where: { id: session.userId, deletedAt: null },
      include: { roles: true },
    });
    if (!user) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
    }
    this.assertNotBanned(user);

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(user, ctx);
  }

  async logout(user: RequestUser): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: user.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      actorId: user.id,
      action: "user.logout",
      entityType: "Session",
      entityId: user.sessionId,
    });
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const email = normalizeEmail(input.email);
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) {
      return;
    }
    const token = randomToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const webUrl = this.config.get<string>("APP_WEB_URL") ?? "http://localhost:3000";
    await this.mail.send({
      to: email,
      subject: "Restablece tu contraseña — TCG Platform",
      text: `Usa este enlace (1 hora):\n${webUrl}/recuperar-password?token=${token}`,
    });
  }

  async resetPassword(input: ResetPasswordInput, ip?: string): Promise<void> {
    const tokenHash = sha256(input.token);
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "Token inválido o expirado");
    }
    const passwordHash = await this.passwords.hash(input.password);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      this.prisma.session.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit.log({
      actorId: row.userId,
      action: "user.password_reset",
      entityType: "User",
      entityId: row.userId,
      ip,
    });
  }

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const tokenHash = sha256(input.token);
    const row = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "Token inválido o expirado");
    }
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
    await this.audit.log({
      actorId: row.userId,
      action: "user.email_verified",
      entityType: "User",
      entityId: row.userId,
    });
  }

  async resendVerification(user: RequestUser): Promise<void> {
    const full = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (full.emailVerifiedAt) {
      return;
    }
    const token = await this.prisma.$transaction(async (tx) => this.createEmailToken(tx, full.id));
    await this.mail.send({
      to: full.email,
      subject: "Verifica tu email — TCG Platform",
      text: this.verificationMailBody(token),
    });
  }

  async loginWithGoogle(input: GoogleAuthInput, ctx: { ip?: string; userAgent?: string }): Promise<AuthTokens> {
    const profile = await this.oauth.verifyGoogle(input.idToken);
    return this.loginWithOauth(profile, ctx);
  }

  async loginWithApple(input: AppleAuthInput, ctx: { ip?: string; userAgent?: string }): Promise<AuthTokens> {
    const profile = await this.oauth.verifyApple(input.identityToken);
    return this.loginWithOauth(
      {
        ...profile,
        email: profile.email ?? input.email ?? null,
        displayName: profile.displayName ?? input.displayName ?? null,
      },
      ctx,
    );
  }

  async listSessions(user: RequestUser): Promise<SessionView[]> {
    const rows = await this.prisma.session.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      userAgent: row.userAgent,
      ip: row.ip,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      current: row.id === user.sessionId,
    }));
  }

  async revokeSession(user: RequestUser, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId: user.id },
    });
    if (!session) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Sesión no encontrada");
    }
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      actorId: user.id,
      action: "session.revoked",
      entityType: "Session",
      entityId: session.id,
    });
  }

  private async loginWithOauth(
    profile: OauthProfile,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const identity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: { provider: profile.provider, providerSubject: profile.subject },
      },
      include: { user: { include: { roles: true } } },
    });
    if (identity?.user && !identity.user.deletedAt) {
      this.assertNotBanned(identity.user);
      return this.issueTokens(identity.user, ctx);
    }

    if (!profile.email) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ERROR_CODES.ACCOUNT_CONFLICT,
        "No se pudo obtener un email verificado",
      );
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: profile.email, deletedAt: null },
      include: { roles: true, identities: true },
    });

    if (existing) {
      const canLink = existing.emailVerifiedAt && profile.emailVerified;
      if (!canLink) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.ACCOUNT_CONFLICT,
          "Ya existe una cuenta con este email",
        );
      }
      this.assertNotBanned(existing);
      await this.prisma.authIdentity.create({
        data: {
          userId: existing.id,
          provider: profile.provider,
          providerSubject: profile.subject,
        },
      });
      return this.issueTokens(existing, ctx);
    }

    const displayName = profile.displayName?.trim() || profile.email.split("@")[0] || "Coleccionista";
    const created = await this.prisma.user.create({
      data: {
        email: profile.email,
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        displayName,
        slug: slugFromName(displayName),
        roles: { create: { role: "USER" } },
        identities: { create: { provider: profile.provider, providerSubject: profile.subject } },
        profile: { create: { country: PLATFORM.country } },
      },
      include: { roles: true },
    });
    await this.audit.log({
      actorId: created.id,
      action: "user.registered_oauth",
      entityType: "User",
      entityId: created.id,
      metadata: { provider: profile.provider },
      ip: ctx.ip,
    });
    return this.issueTokens(created, ctx);
  }

  private async issueTokens(
    user: UserWithRoles,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const refreshToken = randomToken();
    const expiresAt = new Date(Date.now() + PLATFORM.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: sha256(refreshToken),
        userAgent: ctx.userAgent ?? null,
        ip: ctx.ip ?? null,
        expiresAt,
      },
    });
    const roles = user.roles.map((row) => row.role) as AppRole[];
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      roles,
      sid: session.id,
      ver: Boolean(user.emailVerifiedAt),
      tv: user.tokenVersion,
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: PLATFORM.accessTokenTtlSec,
      tokenType: "Bearer",
    };
  }

  private assertNotBanned(user: Pick<User, "isBanned">): void {
    if (user.isBanned) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.ACCOUNT_BANNED, "Cuenta suspendida");
    }
  }

  private async createEmailToken(
    tx: { emailVerificationToken: PrismaService["emailVerificationToken"] },
    userId: string,
  ): Promise<string> {
    const token = randomToken();
    await tx.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return token;
  }

  private verificationMailBody(token: string): string {
    const webUrl = this.config.get<string>("APP_WEB_URL") ?? "http://localhost:3000";
    return `Verifica tu email:\n${webUrl}/verificar-email?token=${token}`;
  }
}
