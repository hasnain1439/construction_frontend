import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Endpoint paths live in src/api/endpoints.ts only (FRONTEND_SPEC rule 3).
      "no-restricted-syntax": [
        "error",
        {
          selector: ":not(TSLiteralType) > Literal[value=/^.api.v1./]",
          message: "Define API paths in src/api/endpoints.ts and use ENDPOINTS.",
        },
      ],
    },
  },
  {
    // The two places allowed to spell API paths.
    files: ["src/api/endpoints.ts", "next.config.ts", "scripts/**", "tests/**", "e2e/**"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // shadcn primitives are generated code.
    files: ["src/components/ui/**"],
    rules: { "react-hooks/purity": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/api/generated/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
