import { HttpStatus, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  carrierForMethod,
  findChilePlace,
  quoteShippingClp,
  type ShippingMethod,
} from "@tcg/config";
import type { ShippingQuoteView } from "@tcg/types";
import type { ShippingQuoteQuery } from "@tcg/validation";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { toShipmentView } from "./shipment.mapper";
import type { RequestUser } from "../auth/request-user";

const STAFF_ROLES = new Set(["MODERATOR", "ADMIN", "SUPER_ADMIN"]);

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(query: ShippingQuoteQuery): Promise<ShippingQuoteView> {
    const seller = await this.prisma.user.findFirst({
      where: { id: query.sellerId, deletedAt: null, isBanned: false },
      include: { profile: true },
    });
    if (!seller) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Vendedor no encontrado");
    }
    const originComuna = seller.profile?.comuna?.trim() || "";
    const originRegion = seller.profile?.region ?? null;
    return this.quoteFromPlaces({
      sellerId: seller.id,
      method: query.method,
      originComuna,
      originRegion,
      destComuna: query.comuna,
      destRegion: null,
    });
  }

  async quoteFromPlaces(input: {
    sellerId: string;
    method: ShippingMethod;
    originComuna: string;
    originRegion: string | null;
    destComuna: string;
    destRegion: string | null;
  }): Promise<ShippingQuoteView> {
    if (input.method === "STORE_PICKUP") {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.SHIPPING_METHOD_UNAVAILABLE,
        "El retiro en tienda no está disponible",
      );
    }

    const dest = findChilePlace(input.destComuna, input.destRegion);
    const origin = findChilePlace(input.originComuna, input.originRegion);

    if (input.method === "MEETUP") {
      return {
        sellerId: input.sellerId,
        method: input.method,
        originComuna: origin?.comuna || input.originComuna || "—",
        destComuna: dest?.comuna || input.destComuna,
        originZone: origin?.zone ?? dest?.zone ?? "RM",
        destZone: dest?.zone ?? origin?.zone ?? "RM",
        priceClp: 0,
      };
    }

    if (!dest) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.SHIPPING_METHOD_UNAVAILABLE,
        "Comuna de destino no reconocida",
      );
    }
    if (!origin) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.SHIPPING_METHOD_UNAVAILABLE,
        "El vendedor no tiene comuna de origen para cotizar envío",
      );
    }

    const dbRate = await this.prisma.shippingRate.findUnique({
      where: {
        originZone_destZone_method: {
          originZone: origin.zone,
          destZone: dest.zone,
          method: input.method,
        },
      },
    });
    const priceClp = dbRate?.priceClp ?? quoteShippingClp(input.method, origin.zone, dest.zone);
    if (priceClp == null) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.SHIPPING_METHOD_UNAVAILABLE,
        "No hay tarifa para este destino",
      );
    }
    return {
      sellerId: input.sellerId,
      method: input.method,
      originComuna: origin.comuna,
      destComuna: dest.comuna,
      originZone: origin.zone,
      destZone: dest.zone,
      priceClp,
    };
  }

  async getForParticipant(actor: RequestUser, id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: { select: { buyerId: true, sellerId: true } } },
    });
    if (!shipment) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Envío no encontrado");
    }
    const isStaff = actor.roles.some((role) => STAFF_ROLES.has(role));
    if (shipment.order.buyerId !== actor.id && shipment.order.sellerId !== actor.id && !isStaff) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Envío no encontrado");
    }
    return toShipmentView(shipment);
  }
}

export function shipmentCreateData(method: ShippingMethod) {
  return {
    method,
    status: "PENDING" as const,
    carrier: carrierForMethod(method),
  };
}
