import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Exclude tests that require the jsdom + phaser-dist wiring from vitest.boot.config.ts.
    // boot.smoke.test.ts runs via `npm run test:boot`.
    exclude: [
      "src/boot.smoke.test.ts",
    ],
  },
});
