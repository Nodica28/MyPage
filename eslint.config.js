import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "client/src/components/__tests__/**",
      "server/services/__tests__/**"
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      // Standard ESLint rules
      "no-console": ["off"],
      eqeqeq: ["error", "always"],
      "no-unused-expressions": ["error"],
      "no-duplicate-imports": ["error"],
      "no-unreachable": ["error"],
      "no-var": ["error"],
      "prefer-const": ["error"],
      "prefer-arrow-callback": ["warn"],
      "no-eval": ["error"],
      semi: ["error", "always"],
      quotes: ["error", "double"]
    }
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error"],
      "@typescript-eslint/no-non-null-assertion": ["warn"]
    }
  }
];
