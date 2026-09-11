import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shimDir = path.join(root, "scripts", "pm-shim");
const currentPath = process.env.PATH ?? process.env.Path ?? "";
const env = {
  ...process.env,
  PATH: `${shimDir}${path.delimiter}${currentPath}`,
  Path: `${shimDir}${path.delimiter}${currentPath}`,
};

const turboName = process.platform === "win32" ? "turbo.cmd" : "turbo";
const turbo = path.join(root, "node_modules", ".bin", turboName);

const child = spawn(turbo, process.argv.slice(2), {
  stdio: "inherit",
  cwd: root,
  env,
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
