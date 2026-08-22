import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthProvider, Prisma, type Role, type User } from "@prisma/client";
import { ERROR_CODES, LEGAL, PLATFORM, loadFeatureFlags, type Role as AppRole } from "@tcg/config";
import type {
  AppleAuthInput,
  ForgotPasswordInput,
  GoogleAuthInput,
  LinkAppleInput,
  LinkGoogleInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SetPasswordInput,
  VerifyEmailInput,
  TestOauthInput,
} from "@tcg/validation";
import type { AuthIdentityView, AuthMethodsView, AuthTokens, SessionView } from "@tcg/types";
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
          termsVersion: LEGAL.termsVersion,
          privacyVersion: LEGAL.privacyVersion,
          acceptedAt: new Date(),
          marketingOptIn: input.marketingOptIn ?? false,
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
      subject: "Verifica tu email — TCG Platform (beta)",
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
      subject: "Restablece tu contraseña — TCG Platform (beta)",
      text: `Usa este enlace (1 hora):\n${webUrl}/recuperar-password?token=${token}${this.mailFooter(webUrl)}`,
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
      subject: "Verifica tu email — TCG Platform (beta)",
      text: this.verificationMailBody(token),
    });
  }

  async loginWithGoogle(input: GoogleAuthInput, ctx: { ip?: string; userAgent?: string }): Promise<AuthTokens> {
    const profile = await this.oauth.verifyGoogle(input.idToken);
    return this.loginWithOauth(profile, ctx, {
      acceptTerms: input.acceptTerms,
      marketingOptIn: input.marketingOptIn,
    });
  }

  async loginWithApple(input: AppleAuthInput, ctx: { ip?: string; userAgent?: string }): Promise<AuthTokens> {
    const profile = await this.oauth.verifyApple(input.identityToken);
    return this.loginWithOauth(profile, ctx, {
      acceptTerms: input.acceptTerms,
      marketingOptIn: input.marketingOptIn,
      fallbackEmail: input.email,
      fallbackName: input.displayName,
    });
  }

  async loginWithTestOauth(input: TestOauthInput, ctx: { ip?: string; userAgent?: string }): Promise<AuthTokens> {
    const flags = loadFeatureFlags();
    if (!flags.authStubOauth) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FEATURE_DISABLED, "OAuth de prueba no está habilitado");
    }
    if (input.provider === "GOOGLE" && !flags.enableGoogleAuth) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FEATURE_DISABLED, "Google no está habilitado");
    }
    if (input.provider === "APPLE" && !flags.enableAppleAuth) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FEATURE_DISABLED, "Apple no está habilitado");
    }
    return this.loginWithOauth(
      {
        provider: input.provider,
        subject: input.subject,
        email: input.email ? input.email.toLowerCase() : null,
        emailVerified: input.emailVerified ?? true,
        displayName: input.displayName ?? null,
      },
      ctx,
      {
        acceptTerms: input.acceptTerms,
        marketingOptIn: input.marketingOptIn,
        fallbackEmail: input.email,
        fallbackName: input.displayName,
      },
    );
  }

  async listAuthMethods(user: RequestUser): Promise<AuthMethodsView> {
    const full = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
      include: { identities: { orderBy: { createdAt: "asc" } } },
    });
    if (!full) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
    }
    return {
      hasPassword: Boolean(full.passwordHash),
      identities: full.identities.map((row) => this.toIdentityView(row)),
    };
  }

  async linkGoogle(user: RequestUser, input: LinkGoogleInput): Promise<AuthMethodsView> {
    const profile = await this.oauth.verifyGoogle(input.idToken);
    await this.linkProvider(user, profile, { requireMatchingVerifiedEmail: true });
    return this.listAuthMethods(user);
  }

  async linkApple(user: RequestUser, input: LinkAppleInput): Promise<AuthMethodsView> {
    const profile = await this.oauth.verifyApple(input.identityToken);
    await this.linkProvider(user, profile, { requireMatchingVerifiedEmail: false });
    return this.listAuthMethods(user);
  }

  async linkTestOauth(user: RequestUser, input: { provider: "GOOGLE" | "APPLE"; subject: string }): Promise<AuthMethodsView> {
    if (!loadFeatureFlags().authStubOauth) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FEATURE_DISABLED, "OAuth de prueba no está habilitado");
    }
    await this.linkProvider(
      user,
      {
        provider: input.provider,
        subject: input.subject,
        email: user.email,
        emailVerified: true,
        displayName: null,
      },
      { requireMatchingVerifiedEmail: input.provider === "GOOGLE" },
    );
    return this.listAuthMethods(user);
  }

  async unlinkIdentity(user: RequestUser, provider: "GOOGLE" | "APPLE"): Promise<AuthMethodsView> {
    const full = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
      include: { identities: true },
    });
    if (!full) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
    }
    const target = full.identities.find((row) => row.provider === provider);
    if (!target) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Proveedor no vinculado");
    }
    const remaining = full.identities.filter((row) => row.id !== target.id);
    const hasPassword = Boolean(full.passwordHash);
    const hasOtherOauth = remaining.some((row) => row.provider === "GOOGLE" || row.provider === "APPLE");
    if (!hasPassword && !hasOtherOauth) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ERROR_CODES.LAST_AUTH_METHOD,
        "Agrega una contraseña u otro proveedor antes de desvincular este",
      );
    }
    await this.prisma.authIdentity.delete({ where: { id: target.id } });
    await this.audit.log({
      actorId: user.id,
      action: "auth.identity_unlinked",
      entityType: "AuthIdentity",
      entityId: target.id,
      metadata: { provider },
    });
    return this.listAuthMethods(user);
  }

  async setPassword(user: RequestUser, input: SetPasswordInput): Promise<void> {
    const full = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
    });
    if (!full) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
    }
    if (full.passwordHash) {
      if (!input.currentPassword) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ERROR_CODES.PASSWORD_ALREADY_SET,
          "Debes confirmar tu contraseña actual",
        );
      }
      const ok = await this.passwords.verify(full.passwordHash, input.currentPassword);
      if (!ok) {
        throw new AppError(
          HttpStatus.UNAUTHORIZED,
          ERROR_CODES.INVALID_CREDENTIALS,
          "Email o contraseña incorrectos",
        );
      }
    }
    const passwordHash = await this.passwords.hash(input.password);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: full.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
      await tx.authIdentity.upsert({
        where: {
          provider_providerSubject: { provider: AuthProvider.EMAIL, providerSubject: full.email },
        },
        create: { userId: full.id, provider: AuthProvider.EMAIL, providerSubject: full.email },
        update: {},
      });
      await tx.session.updateMany({
        where: { userId: full.id, revokedAt: null, NOT: { id: user.sessionId } },
        data: { revokedAt: new Date() },
      });
    });
    await this.audit.log({
      actorId: user.id,
      action: "auth.password_set",
      entityType: "User",
      entityId: user.id,
    });
  }

  async revokeAllSessions(user: RequestUser): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null, NOT: { id: user.sessionId } },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      actorId: user.id,
      action: "auth.sessions_revoked_all",
      entityType: "User",
      entityId: user.id,
    });
  }

  async invalidateAccess(userId: string, action: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.audit.log({
      actorId: userId,
      action,
      entityType: "User",
      entityId: userId,
    });
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
    consent: {
      acceptTerms?: boolean;
      marketingOptIn?: boolean;
      fallbackEmail?: string;
      fallbackName?: string;
    },
  ): Promise<AuthTokens> {
    const identity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: { provider: profile.provider, providerSubject: profile.subject },
      },
      include: { user: { include: { roles: true } } },
    });
    if (identity?.user) {
      if (identity.user.deletedAt) {
        throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.ACCOUNT_DEACTIVATED, "Cuenta desactivada");
      }
      this.assertNotBanned(identity.user);
      return this.issueTokens(identity.user, ctx);
    }

    const email = profile.email ?? (consent.fallbackEmail ? normalizeEmail(consent.fallbackEmail) : null);
    if (email) {
      const existing = await this.prisma.user.findFirst({
        where: { email, deletedAt: null },
        include: { roles: true, identities: true },
      });
      if (existing) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.ACCOUNT_CONFLICT,
          "Ya existe una cuenta con este email. Ingresa y vincula el proveedor desde Seguridad.",
        );
      }
    }

    if (!email) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ERROR_CODES.ACCOUNT_CONFLICT,
        "No se pudo obtener un email para crear la cuenta",
      );
    }
    if (profile.provider === "GOOGLE" && !profile.emailVerified) {
      throw new AppError(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS,
        "Google no certificó el email",
      );
    }

    const displayName =
      profile.displayName?.trim() || consent.fallbackName?.trim() || email.split("@")[0] || "Coleccionista";
    this.requireLegalConsent(consent.acceptTerms);
    try {
      const created = await this.prisma.user.create({
        data: {
          email,
          emailVerifiedAt: profile.emailVerified ? new Date() : null,
          displayName,
          slug: slugFromName(displayName),
          termsVersion: LEGAL.termsVersion,
          privacyVersion: LEGAL.privacyVersion,
          acceptedAt: new Date(),
          marketingOptIn: consent.marketingOptIn ?? false,
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.ACCOUNT_CONFLICT,
          "Ya existe una cuenta con este email. Ingresa y vincula el proveedor desde Seguridad.",
        );
      }
      throw error;
    }
  }

  private async linkProvider(
    actor: RequestUser,
    profile: OauthProfile,
    opts: { requireMatchingVerifiedEmail: boolean },
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: actor.id, deletedAt: null },
      include: { identities: true },
    });
    if (!user) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
    }
    this.assertNotBanned(user);

    const already = user.identities.find(
      (row) => row.provider === profile.provider && row.providerSubject === profile.subject,
    );
    if (already) return;

    const taken = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: { provider: profile.provider, providerSubject: profile.subject },
      },
    });
    if (taken && taken.userId !== user.id) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ERROR_CODES.ACCOUNT_CONFLICT,
        "Este proveedor ya está vinculado a otra cuenta",
      );
    }

    if (opts.requireMatchingVerifiedEmail) {
      if (!profile.email || !profile.emailVerified || !user.emailVerifiedAt) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.ACCOUNT_CONFLICT,
          "El email del proveedor debe coincidir y estar verificado en ambos lados",
        );
      }
      if (profile.email !== user.email) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.ACCOUNT_CONFLICT,
          "El email del proveedor debe coincidir y estar verificado en ambos lados",
        );
      }
    }

    try {
      await this.prisma.authIdentity.create({
        data: {
          userId: user.id,
          provider: profile.provider,
          providerSubject: profile.subject,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(
          HttpStatus.CONFLICT,
          ERROR_CODES.ACCOUNT_CONFLICT,
          "Este proveedor ya está vinculado a otra cuenta",
        );
      }
      throw error;
    }
    if (profile.emailVerified && profile.email === user.email && !user.emailVerifiedAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }
    await this.audit.log({
      actorId: user.id,
      action: "auth.identity_linked",
      entityType: "User",
      entityId: user.id,
      metadata: { provider: profile.provider },
    });
  }

  private toIdentityView(row: { provider: AuthProvider; createdAt: Date }): AuthIdentityView {
    return {
      provider: row.provider,
      createdAt: row.createdAt.toISOString(),
    };
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
    return `Verifica tu email:\n${webUrl}/verificar-email?token=${token}${this.mailFooter(webUrl)}`;
  }

  private mailFooter(webUrl: string): string {
    return `\n\n— TCG Platform (beta)\nAyuda: ${webUrl}/ayuda\n${LEGAL.betaNotice}`;
  }

  private requireLegalConsent(acceptTerms: boolean | undefined): void {
    if (acceptTerms !== true) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.LEGAL_CONSENT_REQUIRED,
        "Debes aceptar los Términos y la Política de Privacidad",
      );
    }
  }
}
