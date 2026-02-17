import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@causaloop/core": path.resolve(__dirname, "../core/src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
  },
});
