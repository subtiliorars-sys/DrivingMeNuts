import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Exclude Phaser integration probe tests (require jsdom + WebGL, not in canonical suite)
    exclude: ["src/phaser_probe*.test.ts"],
  },
});
