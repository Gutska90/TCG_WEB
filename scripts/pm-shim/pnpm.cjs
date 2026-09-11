const { spawn } = require("node:child_process");

const child = spawn("corepack", ["pnpm", ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
