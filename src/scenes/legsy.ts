/**
 * legsy.ts — Legsy placeholder draw routine.
 *
 * Legsy is the primary mascot of Driving Me Nuts: an upbeat street-market
 * vendor whose whole deal is the "leg" in "legume."
 *
 * Programmer-art, code-drawn — NO image assets, so no provenance entries
 * needed.  When final pixel art ships, replace this file with a sprite-sheet
 * loader at the same import path; no callers need to change.
 *
 * Silhouette (per ART_BIBLE.md § Legsy):
 *   - Wide oval pod body (top 60 % of bounding box), Palette-A burlap skin tone
 *   - Two short thick legs at base (#8B6F47 brown, slightly darker than body)
 *   - Stubby round arms raised slightly outward
 *   - Oval head sitting directly on body (no neck), same skin tone
 *   - Large dot eyes (#2C2416), small open-mouth grin line
 *
 * Scale: ~32 × 48 px at scale = 1.  All coordinates are relative to (x, y)
 * which is the bottom-centre of the sprite.
 *
 * Colors: Palette A only (ART_BIBLE.md § P1 programmer-art rules, rule 1).
 *   Burlap / raw sack  #D2B48C  — body + head fill
 *   Panel border       #8B6F47  — legs, arm outlines, eye/mouth detail
 *   Panel text         #2C2416  — eyes, grin (darkest on-palette color)
 */

import Phaser from "phaser";

// Palette A constants used here (no gradients per rule 4)
const LEGSY_BODY   = 0xD2B48C; // burlap / raw sack
const LEGSY_LIMB   = 0x8B6F47; // panel border — legs + arm outlines
const LEGSY_DETAIL = 0x2C2416; // panel text — eyes, grin

/**
 * Draw a Legsy programmer-art mascot into `scene` at world position (x, y).
 *
 * @param scene  The Phaser.Scene to add graphics objects to.
 * @param x      World X of the bottom-centre of the sprite.
 * @param y      World Y of the bottom of the sprite.
 * @param scale  Uniform scale factor (1 = 32×48 px bounding box).
 * @returns      An array of Phaser GameObjects that compose the sprite.
 *               Callers may collect these to destroy Legsy later.
 */
export function drawLegsy(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale: number = 1,
): Phaser.GameObjects.GameObject[] {
  const parts: Phaser.GameObjects.GameObject[] = [];

  // Helper: add to parts array and return the object
  function add<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    parts.push(obj);
    return obj;
  }

  const s = scale; // shorthand

  // --- Legs (two short thick rects at base) ---
  // Left leg: 6 px wide × 10 px tall at scale 1
  add(scene.add.rectangle(
    x - 7 * s,
    y - 5 * s,
    6 * s, 10 * s,
    LEGSY_LIMB,
  ));
  // Right leg
  add(scene.add.rectangle(
    x + 7 * s,
    y - 5 * s,
    6 * s, 10 * s,
    LEGSY_LIMB,
  ));

  // --- Body (wide oval pod, top 60% of canvas) ---
  // Ellipse: 28 px wide × 22 px tall at scale 1; centred ~17 px above the base
  add(scene.add.ellipse(
    x,
    y - 17 * s,
    28 * s, 22 * s,
    LEGSY_BODY,
  ));

  // --- Arms (stubby rects raised slightly outward from mid-body) ---
  // Left arm: angled slightly up-left
  add(scene.add.rectangle(
    x - 18 * s,
    y - 21 * s,
    8 * s, 5 * s,
    LEGSY_LIMB,
  ));
  // Right arm
  add(scene.add.rectangle(
    x + 18 * s,
    y - 21 * s,
    8 * s, 5 * s,
    LEGSY_LIMB,
  ));

  // --- Head (oval, directly on body, no neck) ---
  // 18 px wide × 16 px tall, centred ~34 px above base
  add(scene.add.ellipse(
    x,
    y - 36 * s,
    18 * s, 16 * s,
    LEGSY_BODY,
  ));

  // --- Eyes (two dark dots, per programmer-art rule: 1-2 px overlays) ---
  add(scene.add.circle(
    x - 4 * s,
    y - 38 * s,
    2 * s,
    LEGSY_DETAIL,
  ));
  add(scene.add.circle(
    x + 4 * s,
    y - 38 * s,
    2 * s,
    LEGSY_DETAIL,
  ));

  // --- Grin (small horizontal line — 1 px tall, 6 px wide) ---
  add(scene.add.rectangle(
    x,
    y - 32 * s,
    6 * s, 1 * s,
    LEGSY_DETAIL,
  ));

  return parts;
}
