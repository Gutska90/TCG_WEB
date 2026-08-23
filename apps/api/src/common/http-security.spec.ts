import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  clientIpFromForwarded,
  ipAllowlistAllows,
  parseIpAllowlist,
  safeInternalPath,
} from "@tcg/config";

describe("safeInternalPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeInternalPath("/me/compras")).toBe("/me/compras");
    expect(safeInternalPath("/ingresar?x=1")).toBe("/ingresar?x=1");
  });

  it("rejects protocol-relative and external URLs", () => {
    expect(safeInternalPath("//evil.example")).toBeNull();
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath("/%2f%2fevil.example")).toBeNull();
    expect(safeInternalPath("/\\evil")).toBeNull();
    expect(safeInternalPath("/me\u0000/x")).toBeNull();
  });
});

describe("admin IP allowlist", () => {
  it("allows everyone when empty", () => {
    expect(parseIpAllowlist("")).toEqual([]);
    expect(ipAllowlistAllows("1.2.3.4", [])).toBe(true);
  });

  it("uses the first X-Forwarded-For hop", () => {
    expect(clientIpFromForwarded("10.0.0.8, 10.1.1.1", "127.0.0.1")).toBe("10.0.0.8");
    expect(ipAllowlistAllows("10.0.0.8", parseIpAllowlist("10.0.0.8, 10.0.0.9"))).toBe(true);
    expect(ipAllowlistAllows("9.9.9.9", parseIpAllowlist("10.0.0.8"))).toBe(false);
  });
});

describe("CSP", () => {
  it("does not allow framing and includes Google GIS only when requested", () => {
    const base = buildContentSecurityPolicy({ isDev: false, upgradeInsecureRequests: true });
    expect(base).toContain("frame-ancestors 'none'");
    expect(base).toContain("upgrade-insecure-requests");
    expect(base).toContain("blob:");
    expect(base).not.toContain("accounts.google.com");
    const withGoogle = buildContentSecurityPolicy({
      isDev: false,
      upgradeInsecureRequests: false,
      scriptSrc: ["https://accounts.google.com"],
      frameSrc: ["https://accounts.google.com"],
    });
    expect(withGoogle).toContain("https://accounts.google.com");
  });
});
