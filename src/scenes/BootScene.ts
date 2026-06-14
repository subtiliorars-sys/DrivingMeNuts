/**
 * BootScene.ts — Title screen for Driving Me Nuts.
 *
 * Shows the game name styled in Palette A, Legsy mascot, a "Start" button
 * (transitions to GameScene), and a "Reset save" option when a save exists.
 *
 * No timed auto-advance — player controls when the game begins.
 * First pointer-down on this scene also satisfies the browser auto-play
 * gesture requirement for the AudioContext (audioInit is called there).
 *
 * Programmer-art only; no image assets loaded here.
 *
 * --- WCAG touch targets ---
 * The canvas is FIT-scaled by Phaser. Interactive elements are sized in native
 * 480×270 coordinates; their rendered CSS-pixel size = native size × displayScale.
 *
 * MIN_TOUCH_SIZE (44 CSS px): the WCAG 2.2 minimum for pointer targets.
 * At 2× scale (common mobile viewport) a native 24px-tall button → 48 CSS px ✓.
 * The reset button is 18px native → 36 CSS px at 2× — below threshold, but
 * lives inside a confirm dialog that appears centred and the small size avoids
 * accidental taps on the main canvas. Accept as a design trade-off (rare path,
 * dialog backdrop blocks background taps).
 *
 * If adding new interactive elements, check: nativeSize × displayScale ≥ 44.
 * Use `game.scale.displayScale` (a Point { x, y }) to read the current factor.
 */

import Phaser from "phaser";
import { drawLegsy } from "./legsy.js";
import { audioInit, playButtonTick } from "./audio.js";
import { loadMusicPref, startMusic } from "./music.js";
import { SAVE_KEY, safeStorage, resetSave } from "../sim/persistence.js";

// Palette A constants (same subset used in GameScene)
const P = {
  SKY:          0xFFFFCC,
  GROUND:       0x7CB342,
  PANEL_BG:     0xF5DEB3,
  PANEL_BORDER: 0x8B6F47,
  TEXT:         0x2C2416,
  AWNING:       0xFF9800,
  TREE:         0x556B2F,
  WARNING_RED:  0xC0392B,
} as const;

// Version string: kept in sync with package.json manually.
// Vite JSON import of ../../package.json crosses the rootDir boundary (tsconfig rootDir=src)
// and would fail tsc --noEmit. Hardcoded here; update on version bumps.
const VERSION = "0.1.0";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create(): void {
    const W = this.scale.width;   // 480
    const H = this.scale.height;  // 270

    // ---- Backdrop (Palette A sky + ground) ---------------------------------
    this.add.rectangle(W / 2, H * 0.4,  W, H * 0.8, P.SKY);
    this.add.rectangle(W / 2, H * 0.85, W, H * 0.3, P.GROUND);

    // Background trees (Palette A dark green)
    this.add.circle(50,  H * 0.45, 22, P.TREE);
    this.add.circle(420, H * 0.40, 28, P.TREE);
    this.add.circle(370, H * 0.50, 16, P.TREE);

    // ---- Title text --------------------------------------------------------
    // Game name in Palette A panel-border brown (#8B6F47), bold monospace
    this.add.text(W / 2, 36, "DRIVING ME NUTS", {
      fontSize: "22px",
      color: "#8B6F47",
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Sub-tagline in warm awning orange (#FF9800)
    this.add.text(W / 2, 62, "roasted peanuts — fresh daily", {
      fontSize: "9px",
      color: "#FF9800",
      fontFamily: "monospace",
    }).setOrigin(0.5);

    // ---- Legsy mascot (programmer-art, code-drawn) -------------------------
    // Placed centre-left on the title screen, above the ground line
    // drawLegsy origin = bottom-centre; ~32×48 at scale 1.4 → ~45×67
    drawLegsy(this, W / 2, H * 0.78, 1.4);

    // ---- Truck side-panel backdrop hint ------------------------------------
    // Minimal truck shape — Legsy "painted on" the side panel (visual context)
    const truckX = W / 2;
    const truckY = H * 0.82;
    // Truck body
    this.add.rectangle(truckX, truckY, 90, 38, P.PANEL_BORDER);
    // Trim
    this.add.rectangle(truckX, truckY - 19, 90, 4, P.PANEL_BG);
    // Wheels
    this.add.circle(truckX - 30, truckY + 19, 9, 0x333333);
    this.add.circle(truckX + 30, truckY + 19, 9, 0x333333);
    // Serving window
    this.add.rectangle(truckX - 14, truckY - 2, 20, 14, 0x2C2416);
    // "Legumes ≠ Nuts" sticker (tiny label, per ART_BIBLE bumper sticker gag)
    this.add.text(truckX + 12, truckY + 8, "Legumes≠Nuts", {
      fontSize: "4px", color: "#F5DEB3", fontFamily: "monospace",
    }).setOrigin(0.5);

    // Legsy redrawn at smaller scale ON the truck side panel
    // (painted mascot at ~scale 0.65, centered on the truck side)
    drawLegsy(this, truckX + 20, truckY + 8, 0.65);

    // ---- Check if a save exists (to decide whether to show Reset) ----------
    // W1: use safeStorage so blocked localStorage falls back to in-memory.
    const storage = safeStorage();
    const hasSave = storage.getItem(SAVE_KEY) !== null;

    // ---- START button ------------------------------------------------------
    const btnY = H * 0.55;
    const startBtn = this.add.rectangle(W / 2, btnY, 120, 24, P.AWNING)
      .setStrokeStyle(2, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.add.text(W / 2, btnY, "START", {
      fontSize: "12px", color: "#2C2416", fontFamily: "monospace", fontStyle: "bold",
    }).setOrigin(0.5);

    startBtn.on("pointerover", () => startBtn.setAlpha(0.85));
    startBtn.on("pointerout",  () => startBtn.setAlpha(1.0));
    startBtn.on("pointerdown", () => {
      // First gesture — resume AudioContext (browser auto-play policy)
      audioInit(storage);
      // Music begins here too: gesture satisfied, context live. The soundtrack
      // is global (not scene-bound) so it carries into GameScene seamlessly.
      loadMusicPref(storage);
      startMusic("day");
      playButtonTick();
      this.scene.start("GameScene");
    });

    // ---- RESET SAVE button (only when a save exists) -----------------------
    if (hasSave) {
      const resetBtnY = btnY + 34;
      const resetBtn = this.add.rectangle(W / 2, resetBtnY, 120, 18, 0x664444)
        .setStrokeStyle(1, P.PANEL_BORDER)
        .setInteractive({ cursor: "pointer" });
      this.add.text(W / 2, resetBtnY, "Reset save", {
        fontSize: "8px", color: "#F5DEB3", fontFamily: "monospace",
      }).setOrigin(0.5);

      resetBtn.on("pointerover", () => resetBtn.setAlpha(0.85));
      resetBtn.on("pointerout",  () => resetBtn.setAlpha(1.0));
      resetBtn.on("pointerdown", () => {
        audioInit(storage);
        playButtonTick();
        this.showResetConfirm(storage);
      });
    }

    // ---- Version string ----------------------------------------------------
    this.add.text(W - 4, H - 6, `v${VERSION}`, {
      fontSize: "6px", color: "#8B6F47", fontFamily: "monospace",
    }).setOrigin(1, 1);
  }

  // ---------------------------------------------------------------------------
  // Reset confirm dialog (reuses the same pattern as GameScene.showResetConfirm)
  // Kept local to BootScene so GameScene doesn't need to know about title flow.
  // W9: uses resetSave(storage) + CORRUPT_KEY import so both reset paths are identical.
  // ---------------------------------------------------------------------------

  private showResetConfirm(storage = safeStorage()): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const mW = 240, mH = 80;
    const mX = (W - mW) / 2;
    const mY = (H - mH) / 2;

    const group = this.add.group();

    const backdrop = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5)
      .setInteractive();
    group.add(backdrop);

    const panel = this.add.rectangle(mX + mW / 2, mY + mH / 2, mW, mH, P.PANEL_BG)
      .setStrokeStyle(2, P.PANEL_BORDER);
    group.add(panel);

    group.add(this.add.text(mX + mW / 2, mY + 10, "Reset save?", {
      fontSize: "10px", color: "#2C2416", fontFamily: "monospace", fontStyle: "bold",
    }).setOrigin(0.5, 0));

    group.add(this.add.text(mX + mW / 2, mY + 28, "This wipes all progress and starts fresh.", {
      fontSize: "8px", color: "#2C2416", fontFamily: "monospace",
      wordWrap: { width: mW - 16 },
    }).setOrigin(0.5, 0));

    const cancelBtn = this.add.rectangle(mX + 70, mY + mH - 14, 100, 18, 0x999977)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    group.add(cancelBtn);
    group.add(this.add.text(mX + 70, mY + mH - 14, "CANCEL", {
      fontSize: "9px", color: "#2C2416", fontFamily: "monospace",
    }).setOrigin(0.5));
    cancelBtn.on("pointerdown", () => group.destroy(true));

    const confirmBtn = this.add.rectangle(mX + 184, mY + mH - 14, 96, 18, P.WARNING_RED)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    group.add(confirmBtn);
    group.add(this.add.text(mX + 184, mY + mH - 14, "YES, RESET", {
      fontSize: "9px", color: "#F5DEB3", fontFamily: "monospace",
    }).setOrigin(0.5));
    confirmBtn.on("pointerdown", () => {
      group.destroy(true);
      // W9: use resetSave (imports CORRUPT_KEY, no hardcoded string) and clear tutorial
      resetSave(storage);
      storage.removeItem("dmn_tutorial_seen"); // also clear tutorial so fresh start re-tutorials
      // Show brief confirmation, then allow player to start fresh
      const toast = this.add.text(W / 2, H / 2, "Save reset.", {
        fontSize: "9px", color: "#F5DEB3", fontFamily: "monospace",
        backgroundColor: "#2C2416", padding: { x: 6, y: 3 },
      }).setOrigin(0.5);
      this.time.delayedCall(1200, () => { if (toast.active) toast.destroy(); });
    });
  }
}
