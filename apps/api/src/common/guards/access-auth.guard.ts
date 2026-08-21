import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ERROR_CODES, type Role } from "@tcg/config";
import { AppError } from "../errors/app-error";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import type { RequestUser } from "../../auth/request-user";

type AccessPayload = {
  sub: string;
  roles: Role[];
  sid: string;
  ver: boolean;
  tv: number;
};

@Injectable()
export class AccessAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: RequestUser;
    }>();

    if (isPublic) {
      await this.attachUser(request, false);
      return true;
    }

    await this.attachUser(request, true);
    return true;
  }

  private async attachUser(
    request: { headers: { authorization?: string }; user?: RequestUser },
    required: boolean,
  ): Promise<void> {
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      if (required) {
        throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
      }
      return;
    }

    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token);
    } catch {
      if (required) {
        throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
      }
      return;
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: { roles: true },
    });
    if (!user) {
      if (required) {
        throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
      }
      return;
    }
    if (user.isBanned) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.ACCOUNT_BANNED, "Cuenta suspendida");
    }
    if (user.tokenVersion !== payload.tv) {
      if (required) {
        throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
      }
      return;
    }

    const session = await this.prisma.session.findFirst({
      where: { id: payload.sid, userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!session) {
      if (required) {
        throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
      }
      return;
    }

    request.user = {
      id: user.id,
      email: user.email,
      roles: user.roles.map((row) => row.role),
      sessionId: session.id,
      emailVerified: Boolean(user.emailVerifiedAt),
      tokenVersion: user.tokenVersion,
    };
  }
}
