import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    name: "platform-browser",
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
