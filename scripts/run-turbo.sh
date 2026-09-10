#!/usr/bin/env bash
# Turbo resolves the packageManager binary from PATH. Locally we often only have
# `corepack pnpm` (no `pnpm` shim). GitHub Actions installs pnpm onto PATH via
# pnpm/action-setup, so this branch is a no-op there.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if ! command -v pnpm >/dev/null 2>&1; then
  export PATH="$ROOT/scripts/bin:$PATH"
fi
exec "$ROOT/node_modules/.bin/turbo" "$@"
