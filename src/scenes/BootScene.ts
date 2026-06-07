/**
 * BootScene.ts — Minimal splash boot scene.
 * Shows the game title briefly, then starts GameScene.
 * All game logic lives in GameScene → sim engine.
 */

import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create(): void {
    const { width, height } = this.scale;

    // Sky backdrop (Palette A: #FFFFCC)
    this.add.rectangle(width / 2, height / 2, width, height, 0xFFFFCC);

    // Truck body (Palette A: #8B6F47) — P1_SPRITE_SPEC #1 programmer art
    this.add.rectangle(width / 2, height / 2 + 20, 96, 48, 0x8B6F47);
    // Trim bar
    this.add.rectangle(width / 2, height / 2 - 4, 96, 6, 0xF5DEB3);
    // Cabin
    this.add.rectangle(width / 2 + 26, height / 2 + 16, 44, 36, 0xA0844E);
    // Serving window
    this.add.rectangle(width / 2 - 18, height / 2 + 16, 24, 18, 0x2C2416);
    // Wheels
    this.add.circle(width / 2 - 32, height / 2 + 44, 10, 0x333333);
    this.add.circle(width / 2 + 32, height / 2 + 44, 10, 0x333333);

    // Title
    this.add.text(width / 2, height / 2 - 36, "DRIVING ME NUTS", {
      fontSize: "16px", color: "#8B6F47", fontFamily: "monospace", fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 20, "roasted peanuts — fresh daily", {
      fontSize: "7px", color: "#8B6F47", fontFamily: "monospace",
    }).setOrigin(0.5);

    this.add.text(width / 2, height - 16, "Loading…", {
      fontSize: "7px", color: "#8B6F47", fontFamily: "monospace",
    }).setOrigin(0.5);

    // Transition to GameScene after 1.5 s
    this.time.delayedCall(1500, () => {
      this.scene.start("GameScene");
    });
  }
}
