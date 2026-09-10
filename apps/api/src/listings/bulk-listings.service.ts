import { Injectable } from "@nestjs/common";
import type { BulkListingPreviewView } from "@tcg/types";
import type { BulkListingPreviewInput } from "@tcg/validation";
import { PrismaService } from "../prisma/prisma.service";
import { parseBulkListingCsv } from "./bulk-listing.parser";

@Injectable()
export class BulkListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(input: BulkListingPreviewInput): Promise<BulkListingPreviewView> {
    const parsed = parseBulkListingCsv(input.csv);
    const rows = [];
    let matched = 0;
    let missing = 0;
    let errors = 0;
    for (const item of parsed) {
      if (!item.ok) {
        errors += 1;
        rows.push({
          line: item.line,
          status: "error" as const,
          game: "",
          set: "",
          cardNumber: "",
          name: "",
          variantId: null,
          message: item.message,
        });
        continue;
      }
      const variant = await this.prisma.cardVariant.findFirst({
        where: {
          language: item.row.language,
          finish: item.row.finish,
          card: {
            name: { equals: item.row.name, mode: "insensitive" },
            number: item.row.card_number,
            set: {
              slug: item.row.set,
              game: { slug: item.row.game },
            },
          },
        },
        select: { id: true },
      });
      if (!variant) {
        missing += 1;
        rows.push({
          line: item.line,
          status: "missing" as const,
          game: item.row.game,
          set: item.row.set,
          cardNumber: item.row.card_number,
          name: item.row.name,
          variantId: null,
          message: "Carta o variante no está en el catálogo. Propón la carta; no se crea automáticamente.",
        });
        continue;
      }
      matched += 1;
      rows.push({
        line: item.line,
        status: "matched" as const,
        game: item.row.game,
        set: item.row.set,
        cardNumber: item.row.card_number,
        name: item.row.name,
        variantId: variant.id,
        message: null,
      });
    }
    return {
      total: parsed.filter((row) => row.ok || row.message !== undefined).length,
      matched,
      missing,
      errors,
      rows,
      notice: "Esto es una vista previa. Confirmar la creación de listings queda para un incremento posterior.",
    };
  }
}
