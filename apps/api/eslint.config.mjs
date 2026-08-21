import base from "@tcg/eslint-config/base";

export default [
  ...base,
  {
    ignores: ["dist/**", "vitest.config.ts", "webpack.config.js"],
  },
];
