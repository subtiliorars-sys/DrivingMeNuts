/**
 * boot.smoke.test.ts — Phaser 3 headless-boot smoke test.
 *
 * WHAT THIS CATCHES
 * -----------------
 * - Scene constructor errors (bad `super()` key, bad import at module level)
 * - Errors thrown inside `GameScene.create()` (missing imports, bad API calls,
 *   wrong Phaser object types)
 * - `SimState` not initialized (would mean `createState()` or its imports are
 *   broken)
 * - HUD `Text` objects not created (would surface `this.add.text` signature
 *   mismatches or missing scene-plugin access)
 * - Lore/economy constants not importable (import-time failures in data/)
 *
 * WHAT THIS DOES NOT CATCH
 * ------------------------
 * - Rendering correctness (HEADLESS renderer does zero draw calls)
 * - Input handling (no real DOM events dispatched)
 * - Animation / tween visual output
 * - BootScene timing (1.5 s delay; we skip BootScene to avoid waiting)
 * - Full game-loop behaviour beyond a few manual steps
 *
 * ENVIRONMENT NOTES
 * -----------------
 * Run via `npm run test:boot` (uses vitest.boot.config.ts, not the default
 * vitest.config.ts).  The default `npm test` / `npm run verify` use the node
 * environment and do NOT include this file, so a flaky jsdom result can never
 * break the main gate.
 *
 * See vitest.boot.config.ts for the full explanation of the three-part wiring
 * (jsdom env + phaser dist alias + canvas stub) needed to load Phaser 3 without
 * a real browser.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import * as PhaserAll from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { GameScene } from "./scenes/GameScene.js";

// phaser.esm.js has named exports only; the __phaser-shim adds `default = namespace`.
// Phaser's .d.ts uses `export = Phaser` (CJS style), so `typeof import("phaser").default`
// is not valid — cast via `any` instead.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Phaser = ((PhaserAll as any).default ?? PhaserAll) as any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build and immediately step a HEADLESS Phaser.Game, then call cb() inside
 *  the postBoot hook so assertions run synchronously before the game is
 *  destroyed.  Uses the "done" callback style because Vitest's promise return
 *  path has an ordering issue with Phaser's synchronous postBoot + game.step()
 *  in jsdom (postBoot itself resolves synchronously but the promise microtask
 *  queue fires after the setTimeout cleanup window). */
function withHeadlessGame(
  cb: (game: Phaser.Game) => void,
  done: () => void,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const game = new (Phaser as any).Game({
    type: Phaser.HEADLESS,
    width: 480,
    height: 270,
    // Mirror the scene list from src/main.ts so we exercise the same
    // constructor path as the real game.
    scene: [BootScene, GameScene],
    audio: { noAudio: true },
    callbacks: {
      postBoot: () => {
        // Advance the game loop a few ticks so scene `create()` executes.
        // In HEADLESS mode `game.step()` runs synchronously (no rAF needed).
        const t = performance.now();
        game.step(t, 16);
        game.step(t + 16, 16);
        game.step(t + 32, 16);

        cb(game);

        game.destroy(true);
        (done as unknown as () => void)();
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Phaser 3 headless boot smoke", () => {
  it("Phaser.Game constructs with HEADLESS renderer", (done) => {
    withHeadlessGame((game) => {
      // If we reach here, Phaser loaded, all scene imports resolved, and
      // the Game constructor didn't throw.
      expect(game).toBeDefined();
    }, done as unknown as () => void);
  });

  it("GameScene is registered in the scene manager after boot", (done) => {
    withHeadlessGame((game) => {
      const scene = game.scene.getScene("GameScene");
      expect(scene).not.toBeNull();
    }, done as unknown as () => void);
  });

  it("GameScene.create() initializes SimState (cash > 0, dayNumber = 1)", (done) => {
    withHeadlessGame((game) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scene = game.scene.getScene("GameScene") as any;
      expect(scene.state).toBeDefined();
      // createState(1) sets cash = STARTING_CASH (50.00) and dayNumber = 1.
      expect(scene.state.cash).toBeGreaterThan(0);
      expect(scene.state.dayNumber).toBe(1);
      // roastSlots array exists (STARTING_QUEUE_SLOTS = 1)
      expect(Array.isArray(scene.state.roastSlots)).toBe(true);
      expect(scene.state.roastSlots.length).toBeGreaterThan(0);
    }, done as unknown as () => void);
  });

  it("HUD Text objects are created and have initial content", (done) => {
    withHeadlessGame((game) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scene = game.scene.getScene("GameScene") as any;
      // These are set in GameScene.create() → updateHUD().
      // A missing or wrong Phaser.GameObjects.Text call would leave them undefined.
      expect(scene.txtCash).toBeDefined();
      expect(scene.txtDay).toBeDefined();
      expect(scene.txtRawStock).toBeDefined();
      expect(scene.txtRoastedStock).toBeDefined();
      expect(scene.txtPrice).toBeDefined();
      expect(scene.txtLoreCounter).toBeDefined();
      // Spot-check text content matches expected format from updateHUD()
      expect(scene.txtDay.text).toBe("Day 1");
      expect(scene.txtCash.text).toMatch(/^Cash: \$\d+\.\d{2}$/);
    }, done as unknown as () => void);
  });

  it("Roast slot UI arrays have correct length", (done) => {
    withHeadlessGame((game) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scene = game.scene.getScene("GameScene") as any;
      const slotCount: number = scene.state.roastSlots.length;
      expect(scene.slotRects).toHaveLength(slotCount);
      expect(scene.slotLabels).toHaveLength(slotCount);
      expect(scene.slotBars).toHaveLength(slotCount);
      expect(scene.slotBarBgs).toHaveLength(slotCount);
    }, done as unknown as () => void);
  });
});
