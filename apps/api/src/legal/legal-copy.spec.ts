import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_PAYMENT_USER_PHRASES,
  LEGAL,
  LEGAL_CONSENT_CHECKBOX,
  LEGAL_DOCUMENTS,
  MARKETING_CONSENT_CHECKBOX,
  PAYMENT_COPY,
  PAYMENT_STATUS_USER_LABELS,
  PUBLIC_LEGAL_LINKS,
  REQUIRED_TERMS_HEADINGS,
  TERMS_DOCUMENT,
  assertRealPaymentsLegalGate,
  containsForbiddenPaymentCopy,
  legalAcceptanceIsCurrent,
} from "@tcg/config";
import { registerSchema } from "@tcg/validation";

function allUserCopy(): string {
  return [
    ...Object.values(PAYMENT_STATUS_USER_LABELS),
    PAYMENT_COPY.held,
    PAYMENT_COPY.released,
    PAYMENT_COPY.payout,
    ...LEGAL_DOCUMENTS.flatMap((doc) =>
      doc.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
    ),
  ].join("\n");
}

describe("Fase 10.7 legal copy and consent", () => {
  it("exposes public terms/privacy documents with required headings", () => {
    expect(TERMS_DOCUMENT.slug).toBe("terminos");
    const headings = TERMS_DOCUMENT.sections.map((section) => section.heading);
    for (const heading of REQUIRED_TERMS_HEADINGS) {
      expect(headings).toContain(heading);
    }
    expect(PUBLIC_LEGAL_LINKS.map((link) => link.href)).toEqual([
      "/terminos",
      "/privacidad",
      "/marketplace",
      "/refunds",
      "/ayuda",
    ]);
  });

  it("requires signup legal acceptance and does not preselect checkboxes", () => {
    expect(LEGAL_CONSENT_CHECKBOX.defaultChecked).toBe(false);
    expect(MARKETING_CONSENT_CHECKBOX.defaultChecked).toBe(false);
    expect(registerSchema.safeParse({
      email: "a@b.cl",
      password: "password123",
      displayName: "Ana",
    }).success).toBe(false);
    expect(registerSchema.safeParse({
      email: "a@b.cl",
      password: "password123",
      displayName: "Ana",
      acceptTerms: false,
    }).success).toBe(false);
    const parsed = registerSchema.parse({
      email: "a@b.cl",
      password: "password123",
      displayName: "Ana",
      acceptTerms: true,
    });
    expect(parsed.marketingOptIn).toBe(false);
  });

  it("keeps marketing consent separate from legal acceptance", () => {
    const withMarketing = registerSchema.parse({
      email: "a@b.cl",
      password: "password123",
      displayName: "Ana",
      acceptTerms: true,
      marketingOptIn: true,
    });
    expect(withMarketing.acceptTerms).toBe(true);
    expect(withMarketing.marketingOptIn).toBe(true);
    expect(LEGAL_CONSENT_CHECKBOX.name).not.toBe(MARKETING_CONSENT_CHECKBOX.name);
  });

  it("detects an older legal version without forcing it current", () => {
    expect(legalAcceptanceIsCurrent({ termsVersion: null, privacyVersion: null })).toBe(false);
    expect(
      legalAcceptanceIsCurrent({
        termsVersion: "2020-01-01.legacy",
        privacyVersion: LEGAL.privacyVersion,
      }),
    ).toBe(false);
    expect(
      legalAcceptanceIsCurrent({
        termsVersion: LEGAL.termsVersion,
        privacyVersion: LEGAL.privacyVersion,
      }),
    ).toBe(true);
  });

  it("does not use forbidden payment wording in principal user copy", () => {
    const copy = allUserCopy();
    expect(containsForbiddenPaymentCopy(copy)).toBe(false);
    for (const phrase of FORBIDDEN_PAYMENT_USER_PHRASES) {
      expect(copy.toLocaleLowerCase("es-CL")).not.toContain(phrase);
    }
    expect(Object.values(PAYMENT_STATUS_USER_LABELS).join(" ")).not.toMatch(/\bHELD\b/);
    expect(Object.values(PAYMENT_STATUS_USER_LABELS).join(" ")).not.toMatch(/\bRELEASED\b/);
  });

  it("blocks ENABLE_REAL_PAYMENTS in production without legal approval", () => {
    expect(() =>
      assertRealPaymentsLegalGate({
        NODE_ENV: "production",
        ENABLE_REAL_PAYMENTS: "true",
      }),
    ).toThrow(/REAL_PAYMENTS_LEGAL_APPROVED/);
    expect(() =>
      assertRealPaymentsLegalGate({
        NODE_ENV: "production",
        ENABLE_REAL_PAYMENTS: "true",
        REAL_PAYMENTS_LEGAL_APPROVED: "true",
      }),
    ).not.toThrow();
    expect(() =>
      assertRealPaymentsLegalGate({
        NODE_ENV: "development",
        ENABLE_REAL_PAYMENTS: "true",
      }),
    ).not.toThrow();
  });
});
