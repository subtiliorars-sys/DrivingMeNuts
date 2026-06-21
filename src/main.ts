import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { WorldScene } from "./scenes/WorldScene.js";

/**
 * Canvas resolution: 480×270 (16:9).
 *
 * Responsive behaviour:
 * - Phaser's FIT mode auto-scales the canvas to fit the browser window while
 *   preserving aspect ratio — it's perfect for mobile in landscape orientation.
 * - Portrait orientation is accepted but not optimised (the game is designed for
 *   landscape). The canvas simply letterboxes.
 * - A window resize listener handles orientation changes and re-centres the canvas.
 *
 * WCAG touch targets:
 * Interactive elements are drawn at native 480×270 coordinates. FIT scaling
 * multiplies them by game.scale.displayScale to yield rendered CSS pixels. At
 * typical mobile zoom (2×–3×) a native 24px-tall button becomes 48–72 CSS px,
 * comfortably meeting the WCAG minimum of 44 CSS px.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 270,
  backgroundColor: "#1a1008",
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene, WorldScene],
};

const game = new Phaser.Game(config);

declare global {
  interface Window {
    __DMN_GAME__?: Phaser.Game;
    __DMN_QA__?: {
      flags(): ReturnType<GameScene["qaFlags"]> | null;
      click(target: string): string;
    };
  }
}

window.__DMN_GAME__ = game;

if (import.meta.env.DEV) {
  const qaHandlers: Record<string, (scene: GameScene) => void> = {
    "buy-raw": (s) => s.qaClickBuyRaw(),
    "close-supply": (s) => s.qaCloseSupplyModal(),
    "roast-slot-0": (s) => s.qaClickRoastSlot(0),
    "close-roast": (s) => s.qaCloseRoastModal(),
    "end-day": (s) => s.qaClickEndDay(),
    "dismiss-report": (s) => s.qaCloseDayReport(),
  };

  window.__DMN_QA__ = {
    flags() {
      const scene = game.scene.getScene("GameScene") as GameScene | undefined;
      return scene?.qaFlags?.() ?? null;
    },
    click(target: string) {
      const scene = game.scene.getScene("GameScene") as GameScene | undefined;
      if (!scene?.qaClickBuyRaw) return "no-scene";
      const fn = qaHandlers[target];
      if (!fn) return "unknown-target";
      fn(scene);
      return "ok";
    },
  };
}

// Recalculate canvas on resize/orientation change — Phaser's scale manager
// handles the FIT maths; refresh() re-centres and re-applies the transform.
window.addEventListener("resize", () => {
  game.scale.refresh();
});
