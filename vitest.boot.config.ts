/**
 * vitest.boot.config.ts — Vitest configuration for the headless-boot smoke test.
 *
 * This is a SEPARATE config from vitest.config.ts (which runs the pure-node sim
 * tests in `npm run test` / `npm run verify`).  The boot smoke test is wired as
 * `npm run test:boot` and runs as a non-blocking CI job.
 *
 * WHY A SEPARATE CONFIG
 * ---------------------
 * The boot smoke needs three things the default config cannot provide:
 *
 * 1. jsdom environment — Phaser 3 reads `navigator`, `window`, `document`,
 *    `HTMLCanvasElement` at module-load time.  The node environment has none
 *    of these.
 *
 * 2. phaser → dist alias — `vitest` without Vite's bundler resolves `phaser`
 *    to `src/phaser.js` (the `main` field), which requires `phaser3spectorjs`
 *    (a WebGL debug tool absent from node_modules).  We redirect to the
 *    pre-bundled `dist/phaser.esm.js` instead.  The ESM bundle has all deps
 *    inlined and exports everything as named exports (no CJS require calls).
 *
 * 3. __phaser-shim — `dist/phaser.esm.js` has no default export, but every
 *    scene file does `import Phaser from "phaser"` (default import).  The shim
 *    (`src/__phaser-shim.ts`) re-exports the namespace as the default.  We
 *    alias `phaser` → shim, and `__phaser-dist` → dist bundle to avoid
 *    circular resolution.
 *
 * 4. setupFiles canvas stub — Phaser's `CanvasFeatures` IIFE calls
 *    `canvas.getContext('2d')` at eval time.  `boot-smoke-setup.ts` patches
 *    `HTMLCanvasElement.prototype.getContext` before test collection, so the
 *    call returns a fake 2-D context instead of jsdom's null/throw.
 */

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      // Redirect `import "phaser"` to the ESM-default shim.
      {
        find: "phaser",
        replacement: path.resolve(__dirname, "src/__phaser-shim.ts"),
      },
      // The shim imports from __phaser-dist to avoid circular resolution.
      {
        find: "__phaser-dist",
        replacement: path.resolve(
          __dirname,
          "node_modules/phaser/dist/phaser.esm.js",
        ),
      },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["src/boot.smoke.test.ts"],
    setupFiles: ["./src/boot-smoke-setup.ts"],
    // Phaser ESM bundle (~1.5 MB) takes ~6–10 s to transform on first run;
    // subsequent runs in watch mode are instant.
    testTimeout: 15_000,
  },
});
