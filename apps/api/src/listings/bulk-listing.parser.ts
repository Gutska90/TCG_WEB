import { bulkListingRowSchema, type BulkListingRowInput } from "@tcg/validation";

export type ParsedBulkRow =
  | { line: number; ok: true; row: BulkListingRowInput }
  | { line: number; ok: false; message: string };

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

export function parseBulkListingCsv(csv: string): ParsedBulkRow[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  const parsed: ParsedBulkRow[] = [];
  let header: string[] | null = null;
  for (const [index, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cells = splitCsvLine(line);
    if (!header) {
      header = cells.map((cell) => cell.toLowerCase());
      const columns = header;
      const required = ["game", "set", "card_number", "name", "condition", "quantity", "price_clp"];
      const missing = required.filter((key) => !columns.includes(key));
      if (missing.length > 0) {
        parsed.push({ line: index + 1, ok: false, message: `Faltan columnas: ${missing.join(", ")}` });
        return parsed;
      }
      continue;
    }
    const record: Record<string, string> = {};
    for (const [i, key] of header.entries()) {
      record[key] = cells[i] ?? "";
    }
    const result = bulkListingRowSchema.safeParse(record);
    if (!result.success) {
      parsed.push({
        line: index + 1,
        ok: false,
        message: result.error.issues[0]?.message ?? "Fila inválida",
      });
      continue;
    }
    parsed.push({ line: index + 1, ok: true, row: result.data });
  }
  return parsed;
}
