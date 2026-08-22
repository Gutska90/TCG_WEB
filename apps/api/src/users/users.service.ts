import { HttpStatus, Injectable } from "@nestjs/common";
import type { Role } from "@prisma/client";
import { ERROR_CODES, LEGAL, legalAcceptanceIsCurrent } from "@tcg/config";
import type { AccountDeletionView, AddressView, MeView, PublicUserView } from "@tcg/types";
import type { CreateAddressInput, PatchMeInput, SellerOnboardingInput } from "@tcg/validation";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { RequestUser } from "../auth/request-user";
import { RatingsService } from "../ratings/ratings.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ratings: RatingsService,
  ) {}

  async getMe(actor: RequestUser): Promise<MeView> {
    const user = await this.prisma.user.findFirst({
      where: { id: actor.id, deletedAt: null },
      include: { roles: true, profile: true },
    });
    if (!user) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
    }
    return toMeView(user);
  }

  async updateMe(actor: RequestUser, input: PatchMeInput): Promise<MeView> {
    await this.prisma.$transaction(async (tx) => {
      if (input.displayName) {
        await tx.user.update({
          where: { id: actor.id },
          data: { displayName: input.displayName },
        });
      }
      if (input.marketingOptIn !== undefined) {
        await tx.user.update({
          where: { id: actor.id },
          data: { marketingOptIn: input.marketingOptIn },
        });
      }
      await tx.profile.upsert({
        where: { userId: actor.id },
        update: {
          ...(input.bio !== undefined ? { bio: input.bio } : {}),
          ...(input.comuna !== undefined ? { comuna: input.comuna } : {}),
          ...(input.region !== undefined ? { region: input.region } : {}),
        },
        create: {
          userId: actor.id,
          bio: input.bio,
          comuna: input.comuna,
          region: input.region,
          country: "CL",
        },
      });
    });
    return this.getMe(actor);
  }

  async getPublic(idOrSlug: string): Promise<PublicUserView> {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const user = await this.prisma.user.findFirst({
      where: uuid
        ? { deletedAt: null, isBanned: false, OR: [{ id: idOrSlug }, { slug: idOrSlug }] }
        : { deletedAt: null, isBanned: false, slug: idOrSlug },
      include: { profile: true },
    });
    if (!user) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Usuario no encontrado");
    }
    return {
      id: user.id,
      displayName: user.displayName,
      slug: user.slug,
      profile: {
        bio: user.profile?.bio ?? null,
        comuna: user.profile?.comuna ?? null,
        region: user.profile?.region ?? null,
        country: user.profile?.country ?? "CL",
      },
      createdAt: user.createdAt.toISOString(),
      reputation: await this.ratings.summarizeOne(user.id),
    };
  }

  async onboardSeller(actor: RequestUser, input: SellerOnboardingInput): Promise<MeView> {
    if (!actor.emailVerified) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.EMAIL_NOT_VERIFIED,
        "Verifica tu email para vender",
      );
    }
    const existing = await this.prisma.profile.findUnique({ where: { userId: actor.id } });
    if (existing?.sellerOnboardedAt && actor.roles.includes("SELLER")) {
      return this.getMe(actor);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.profile.upsert({
        where: { userId: actor.id },
        update: {
          sellerOnboardedAt: existing?.sellerOnboardedAt ?? new Date(),
          comuna: input.comuna,
          region: input.region,
        },
        create: {
          userId: actor.id,
          country: "CL",
          comuna: input.comuna,
          region: input.region,
          sellerOnboardedAt: new Date(),
        },
      });
      await tx.userRole.upsert({
        where: { userId_role: { userId: actor.id, role: "SELLER" } },
        update: {},
        create: { userId: actor.id, role: "SELLER" },
      });
      const hasShipping = await tx.address.findFirst({
        where: { userId: actor.id, isDefaultShipping: true },
      });
      if (!hasShipping) {
        await tx.address.create({
          data: {
            userId: actor.id,
            label: "Despacho",
            recipientName: input.recipientName,
            phone: input.phone,
            line1: input.line1,
            line2: input.line2,
            comuna: input.comuna,
            region: input.region,
            postalCode: input.postalCode,
            isDefaultShipping: true,
          },
        });
      }
    });
    await this.audit.log({
      actorId: actor.id,
      action: "seller.onboarded",
      entityType: "User",
      entityId: actor.id,
    });
    return this.getMe({ ...actor, roles: actor.roles.includes("SELLER") ? actor.roles : [...actor.roles, "SELLER"] });
  }

  async listAddresses(userId: string): Promise<AddressView[]> {
    const rows = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefaultShipping: "desc" }, { createdAt: "asc" }],
    });
    return rows.map(toAddressView);
  }

  async createAddress(userId: string, input: CreateAddressInput): Promise<AddressView> {
    const row = await this.prisma.address.create({
      data: {
        userId,
        label: input.label,
        recipientName: input.recipientName,
        phone: input.phone,
        line1: input.line1,
        line2: input.line2,
        comuna: input.comuna,
        region: input.region,
        postalCode: input.postalCode,
        isDefaultShipping: input.isDefaultShipping ?? false,
      },
    });
    return toAddressView(row);
  }

  async deleteAddress(userId: string, id: string): Promise<void> {
    const row = await this.prisma.address.findUnique({ where: { id } });
    if (!row || row.userId !== userId) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Dirección no encontrada");
    }
    await this.prisma.address.delete({ where: { id } });
  }

  async requestDeletion(actor: RequestUser): Promise<AccountDeletionView> {
    const user = await this.prisma.user.findFirst({
      where: { id: actor.id, deletedAt: null },
    });
    if (!user) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "No autenticado");
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: actor.id },
        data: {
          deletionRequestedAt: user.deletionRequestedAt ?? now,
          deletedAt: now,
          tokenVersion: { increment: 1 },
        },
      });
      await tx.session.updateMany({
        where: { userId: actor.id, revokedAt: null },
        data: { revokedAt: now },
      });
    });
    await this.audit.log({
      actorId: actor.id,
      action: "user.deletion_requested",
      entityType: "User",
      entityId: actor.id,
    });
    return {
      status: "requested",
      deletionRequestedAt: (user.deletionRequestedAt ?? now).toISOString(),
    };
  }
}

function toAddressView(row: {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  comuna: string;
  region: string;
  postalCode: string | null;
  isDefaultShipping: boolean;
}): AddressView {
  return {
    id: row.id,
    label: row.label,
    recipientName: row.recipientName,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    comuna: row.comuna,
    region: row.region,
    postalCode: row.postalCode,
    isDefaultShipping: row.isDefaultShipping,
  };
}

function toMeView(user: {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  displayName: string;
  slug: string;
  createdAt: Date;
  termsVersion: string | null;
  privacyVersion: string | null;
  acceptedAt: Date | null;
  marketingOptIn: boolean;
  deletionRequestedAt: Date | null;
  roles: { role: Role }[];
  profile: {
    bio: string | null;
    region: string | null;
    comuna: string | null;
    country: string;
    sellerOnboardedAt: Date | null;
  } | null;
}): MeView {
  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    displayName: user.displayName,
    slug: user.slug,
    roles: user.roles.map((row) => row.role),
    profile: {
      bio: user.profile?.bio ?? null,
      region: user.profile?.region ?? null,
      comuna: user.profile?.comuna ?? null,
      country: user.profile?.country ?? "CL",
      sellerOnboardedAt: user.profile?.sellerOnboardedAt?.toISOString() ?? null,
    },
    createdAt: user.createdAt.toISOString(),
    legal: {
      termsVersion: user.termsVersion,
      privacyVersion: user.privacyVersion,
      acceptedAt: user.acceptedAt?.toISOString() ?? null,
      marketingOptIn: user.marketingOptIn,
      currentTermsVersion: LEGAL.termsVersion,
      currentPrivacyVersion: LEGAL.privacyVersion,
      stale: !legalAcceptanceIsCurrent(user),
      deletionRequestedAt: user.deletionRequestedAt?.toISOString() ?? null,
    },
  };
}
