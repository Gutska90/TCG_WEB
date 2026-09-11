import { describe, expect, it } from "vitest";
import {
  WHATSAPP_MESSAGE_MAX_CHARS,
  cartSellerWhatsappMessage,
  listingWhatsappMessage,
  normalizeWhatsappE164,
  storeWhatsappMessage,
  whatsappMeHref,
} from "@tcg/config";

describe("whatsapp public contact", () => {
  it("normalizes Chilean mobiles to E.164", () => {
    expect(normalizeWhatsappE164("9 1234 5678")).toBe("+56912345678");
    expect(normalizeWhatsappE164("+56 9 1234 5678")).toBe("+56912345678");
    expect(normalizeWhatsappE164("not-a-phone")).toBeNull();
  });

  it("builds an escaped wa.me URL", () => {
    const href = whatsappMeHref(
      "+56911111111",
      listingWhatsappMessage({
        cardName: "Brunhild",
        setName: "Primera Era",
        condition: "Casi nueva (NM)",
        priceLabel: "$9.000",
        listingUrl: "https://example.test/listings/abc",
      }),
    );
    expect(href.startsWith("https://wa.me/56911111111?text=")).toBe(true);
    expect(href).toContain(encodeURIComponent("Brunhild"));
    expect(href).not.toContain(" ");
  });

  it("listing message includes qty, buyer name, and no-reserve copy", () => {
    const text = listingWhatsappMessage({
      cardName: "Hrist",
      setName: "El Reto",
      condition: "Casi nueva (NM)",
      priceLabel: "$13.000",
      listingUrl: "https://example.test/listings/hrist",
      quantity: 3,
      buyerName: "Gutska",
      sellerName: "Mitos Store",
    });
    expect(text).toContain("Hola Mitos Store,");
    expect(text).toContain("Soy Gutska");
    expect(text).toContain("x3");
    expect(text).toContain("Esta consulta no reserva stock");
    expect(text).toContain("¿Están disponibles?");
  });

  it("cart seller message lists lines, subtotal, and cart link", () => {
    const text = cartSellerWhatsappMessage({
      sellerName: "Mitos Store",
      buyerName: "Gutska",
      lines: [
        {
          cardName: "Hrist",
          setName: "El Reto",
          conditionLabel: "Casi nueva (NM)",
          quantity: 3,
          lineTotalLabel: "$13.000",
        },
        {
          cardName: "Génesis Troll",
          setName: "Espada Sagrada",
          conditionLabel: "Casi nueva (NM)",
          quantity: 2,
          lineTotalLabel: "$6.000",
        },
      ],
      subtotalLabel: "$19.000",
      cartUrl: "https://example.test/carrito",
    });
    expect(text).toContain("Hola Mitos Store,");
    expect(text).toContain("Hrist");
    expect(text).toContain("Génesis Troll");
    expect(text).toContain("Subtotal publicado: $19.000");
    expect(text).toContain("https://example.test/carrito");
    expect(text).not.toContain("Cotización N");
  });

  it("cart seller message includes Consulta N° when an inquiry number is provided", () => {
    const text = cartSellerWhatsappMessage({
      sellerName: "Mitos Store",
      buyerName: "Gutska",
      lines: [
        {
          cardName: "Hestia",
          setName: "Helénica",
          conditionLabel: "Casi nueva (NM)",
          quantity: 2,
          lineTotalLabel: "$3.000",
        },
      ],
      subtotalLabel: "$3.000",
      cartUrl: "https://example.test/carrito",
      inquiryNumber: "C-12",
    });
    expect(text).toContain("Consulta N° 12");
    expect(text).not.toContain("C-12");
    expect(text).not.toContain("Cotización");
  });

  it("truncates a huge cart message under the wa.me limit", () => {
    const lines = Array.from({ length: 80 }, (_, index) => ({
      cardName: `Carta ${index + 1} con un nombre bastante largo para inflar el texto`,
      setName: "Edición de prueba muy extensa",
      conditionLabel: "Casi nueva (NM)",
      quantity: 4,
      lineTotalLabel: "$12.000",
    }));
    const text = cartSellerWhatsappMessage({
      sellerName: "Mitos Store",
      buyerName: "Gutska",
      lines,
      subtotalLabel: "$960.000",
      cartUrl: "https://example.test/carrito",
    });
    expect(text.length).toBeLessThanOrEqual(WHATSAPP_MESSAGE_MAX_CHARS);
    expect(text).toContain("más en el carrito");
    expect(text).toContain("https://example.test/carrito");
  });

  it("store message points buyers to the cart lote, not a quote number", () => {
    const text = storeWhatsappMessage({
      storeName: "Mitos Store",
      storeUrl: "https://example.test/vendedores/mitos-store",
      buyerName: "Gutska",
    });
    expect(text).toContain("armo el carrito");
    expect(text).toContain("https://example.test/vendedores/mitos-store");
  });
});
