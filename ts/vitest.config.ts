import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@vouchr/core": fileURLToPath(new URL("packages/core/src/index.ts", import.meta.url)),
      "@vouchr/export-local": fileURLToPath(
        new URL("packages/export-local/src/index.ts", import.meta.url),
      ),
    },
  },
});
