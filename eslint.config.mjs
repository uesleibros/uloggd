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
    "square-deploy/**",
    // Written by fumadocs-mdx during the build, not by anybody here.
    ".source/**",
  ]),
  {
    // The launcher and the two modules it loads run under plain Node before
    // any bundler is involved, so they are CommonJS on purpose.
    files: ["server.js", "server-memory.js", "worker-guard.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
