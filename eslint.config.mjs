import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Django backend. Nothing in it is ours to lint with ESLint, and its
    // virtualenv ships Django admin's vendored jQuery/select2, which is what
    // made a root `eslint .` report 152 errors that were never this project's.
    "cms/**",
  ]),
]);

export default eslintConfig;
