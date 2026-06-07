/**
 * __phaser-shim.ts — test-only ESM interop shim for Phaser 3.
 *
 * In production, Vite's bundler resolves `import Phaser from "phaser"` to the
 * CJS UMD entry (src/phaser.js) and synthesises a default export automatically.
 *
 * In Vitest (jsdom environment), the CJS source entry is unusable because it
 * requires `phaser3spectorjs` (a WebGL debug tool not present in node_modules).
 * Instead we alias `phaser` → `dist/phaser.esm.js` via vitest.boot.config.ts.
 * That bundle only has NAMED exports, so `import Phaser from "phaser"` (used by
 * all scene files) would get `undefined` as the default.
 *
 * This shim is the resolution target for the `phaser` alias:
 *   - imports from `__phaser-dist`  (which aliases to dist/phaser.esm.js)
 *   - re-exports everything as named  (preserves tree-shaking & type access)
 *   - adds a synthetic `default` export pointing at the namespace object
 *
 * DO NOT import this file from production code.  It lives in src/ only because
 * vitest's `include` glob requires test-support files to be inside src/.
 */

import * as PhaserAll from "__phaser-dist";

export default PhaserAll;
export * from "__phaser-dist";
