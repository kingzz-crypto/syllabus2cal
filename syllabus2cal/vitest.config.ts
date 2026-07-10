import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    // Mirror the "@/*" alias from tsconfig.json so tests import like app code.
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node", // pure-logic tests only; no DOM needed yet
    include: ["tests/**/*.test.ts"],
  },
});
