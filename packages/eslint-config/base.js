import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: [
      "dist/**",
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "babel.config.js",
      "metro.config.js",
      "app.config.ts",
      "eas.json",
      "eslint.config.js",
      "eslint.config.mjs",
      "expo-env.d.ts",
      "vitest.config.ts",
      "next-env.d.ts",
    ],
  },
);
