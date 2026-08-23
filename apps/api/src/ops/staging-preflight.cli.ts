import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { collectStagingOperatorReport } from "@tcg/config";

const repoRoot = resolve(__dirname, "../../../..");

function envFileFromArgv(argv: string[]): string | null {
  const flag = argv.findIndex((arg) => arg === "--env-file");
  if (flag >= 0) {
    const path = argv[flag + 1];
    if (!path) {
      console.error("staging:preflight: --env-file necesita una ruta");
      process.exit(2);
    }
    return path;
  }
  const eq = argv.find((arg) => arg.startsWith("--env-file="));
  if (eq) return eq.slice("--env-file=".length);
  return process.env.STAGING_ENV_FILE ?? null;
}

function resolveEnvFile(path: string): string {
  const fromCwd = resolve(process.cwd(), path);
  if (existsSync(fromCwd)) return fromCwd;
  return resolve(repoRoot, path);
}

const requested = envFileFromArgv(process.argv.slice(2));
const fallback = resolve(repoRoot, ".env.staging");
const envFile = requested ? resolveEnvFile(requested) : existsSync(fallback) ? fallback : null;

if (envFile) {
  if (!existsSync(envFile)) {
    console.error(`staging:preflight: no existe ${envFile}`);
    process.exit(2);
  }
  loadEnv({ path: envFile, override: true });
  console.log(`Leyendo ${envFile}\n`);
} else {
  console.log("Sin --env-file; usando el entorno actual.\n");
  console.log("Uso: pnpm staging:preflight -- --env-file .env.staging\n");
}

const report = collectStagingOperatorReport(process.env);

for (const row of report.blockers) {
  console.log(`BLOCKER  ${row}`);
}
for (const row of report.warnings) {
  console.log(`WARN     ${row}`);
}

if (report.blockers.length === 0 && report.warnings.length === 0) {
  console.log("OK  Contrato B1 listo para pegar en el host (esto no crea el servidor).");
}

if (report.blockers.length > 0) {
  console.error(`\n${report.blockers.length} blocker(s). No invites testers todavía.`);
  process.exit(1);
}

console.log("\nSin blockers. Warnings no impiden boot; revísalos antes de una beta externa.");
