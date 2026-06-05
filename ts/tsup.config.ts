import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "packages/core/src/index.ts",
    "export-local": "packages/export-local/src/index.ts",
  },
  format: "esm",
  dts: true,
  splitting: true,
  clean: true,
  outDir: "dist",
  target: "es2022",
});
