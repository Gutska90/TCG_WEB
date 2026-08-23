#!/usr/bin/env node
/**
 * Fail CI on high/critical advisories unless listed in docs/security/audit-allowlist.json.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const allowDoc = JSON.parse(readFileSync(join(root, "docs/security/audit-allowlist.json"), "utf8"));
const allowed = new Set(allowDoc.allow.map((row) => row.id));

const result = spawnSync("pnpm", ["audit", "--json"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});
if (!result.stdout) {
  console.error(result.stderr || "pnpm audit produced no JSON");
  process.exit(1);
}

const report = JSON.parse(result.stdout);
const advisories = report.advisories ?? {};
const blocking = [];
for (const advisory of Object.values(advisories)) {
  const row = advisory;
  const severity = String(row.severity ?? "");
  const id = String(row.github_advisory_id ?? "");
  if (severity !== "high" && severity !== "critical") continue;
  if (allowed.has(id)) continue;
  blocking.push(`${id} ${severity} ${row.module_name ?? ""}`);
}

if (blocking.length > 0) {
  console.error("High/critical advisories without allowlist entry:");
  for (const line of blocking) console.error(`  ${line}`);
  process.exit(1);
}

console.log("pnpm audit: no new high/critical advisories.");
