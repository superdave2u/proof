import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative base so the built app works at any GitHub Pages subpath (/<repo>/)
  base: "./",
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});