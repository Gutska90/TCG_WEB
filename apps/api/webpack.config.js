const path = require("node:path");
const nodeExternals = require("webpack-node-externals");

/**
 * Nest webpack otherwise bundles pnpm-hoisted natives (@prisma/client, argon2)
 * because they live in the repo root node_modules, not apps/api/node_modules.
 * @param {import("webpack").Configuration} options
 */
module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        modulesDir: path.resolve(__dirname, "../../node_modules"),
        allowlist: [/^@tcg\//, /^webpack\/hot/],
      }),
    ],
  };
};
