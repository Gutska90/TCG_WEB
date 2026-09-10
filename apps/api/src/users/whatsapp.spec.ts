import { describe, expect, it } from "vitest";
import { listingWhatsappMessage, normalizeWhatsappE164, whatsappMeHref } from "@tcg/config";

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
        condition: "NM",
        priceLabel: "$9.000",
        listingUrl: "https://example.test/listings/abc",
      }),
    );
    expect(href.startsWith("https://wa.me/56911111111?text=")).toBe(true);
    expect(href).toContain(encodeURIComponent("Brunhild"));
    expect(href).not.toContain(" ");
  });
});
