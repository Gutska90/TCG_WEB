import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogVisibilitySql, isHiddenSyntheticCard, publicCatalogCardWhere } from "./search-filters";

describe("catalog visibility", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not filter when SHOW_SYNTHETIC_CATALOG defaults true", () => {
    vi.stubEnv("SHOW_SYNTHETIC_CATALOG", "true");
    expect(catalogVisibilitySql()).toEqual([]);
    expect(publicCatalogCardWhere()).toEqual({});
    expect(isHiddenSyntheticCard({ sourceQuality: "SYNTHETIC", source: "synthetic-showcase" })).toBe(false);
  });

  it("hides SYNTHETIC sourceQuality and showcase sources when the flag is false", () => {
    vi.stubEnv("SHOW_SYNTHETIC_CATALOG", "false");
    expect(catalogVisibilitySql()).toHaveLength(1);
    const where = publicCatalogCardWhere();
    expect(where.AND).toBeTruthy();
    expect(isHiddenSyntheticCard({ sourceQuality: "SYNTHETIC" })).toBe(true);
    expect(isHiddenSyntheticCard({ source: "synthetic-showcase" })).toBe(true);
    expect(isHiddenSyntheticCard({ source: "showcase-seed" })).toBe(true);
    expect(isHiddenSyntheticCard({ sourceQuality: "CURATED_VERIFIED", source: "tor.myl.cl" })).toBe(false);
    expect(
      isHiddenSyntheticCard({ sourceQuality: "CURATED_VERIFIED", source: "myl-demo-pack", verified: false }),
    ).toBe(false);
    expect(
      isHiddenSyntheticCard({ sourceQuality: "CURATED_VERIFIED", source: "catalog-submission", verified: false }),
    ).toBe(false);
  });
});
