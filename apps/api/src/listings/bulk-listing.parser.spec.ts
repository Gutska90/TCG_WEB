import { describe, expect, it } from "vitest";
import { parseBulkListingCsv } from "./bulk-listing.parser";

describe("parseBulkListingCsv", () => {
  it("parses recognized rows and reports invalid condition", () => {
    const csv = [
      "game,set,card_number,name,condition,quantity,price_clp,language,finish",
      "mitos-y-leyendas,primera-era,123,Brunhild,NM,2,9000,ES,NORMAL",
      "mitos-y-leyendas,primera-era,123,Brunhild,XX,2,9000,ES,NORMAL",
    ].join("\n");
    const rows = parseBulkListingCsv(csv);
    expect(rows.filter((row) => row.ok)).toHaveLength(1);
    expect(rows.some((row) => !row.ok && row.line === 3)).toBe(true);
  });
});
