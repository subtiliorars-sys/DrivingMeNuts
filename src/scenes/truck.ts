/**
 * truck.ts — Food truck programmer-art (DMN-2b / ART_BIBLE § The truck).
 * Palette A only. Replace with sprite sheet later; callers use Container anchor.
 */
import Phaser from "phaser";
import { SPR } from "./sprites.js";

const TRUCK_BODY = 0x8b6f47;
const TRUCK_TRIM = 0xf5deb3;
const TRUCK_CABIN = 0xa0844e;
const TRUCK_WINDOW = 0x2c2416;
const WHEELS = 0x333333;
const PEANUT = 0xd2b48c;
const PEANUT_SHELL = 0x8b6f47;
const SMOKE = 0xcccccc;
const STICKER = 0xf5deb3;

export interface FoodTruckHandle {
  container: Phaser.GameObjects.Container;
  smokeAnchors: Array<{ x: number; y: number }>;
}

/** Draw food truck centred at (x, y) — y is ground line under wheels. */
export function drawFoodTruck(scene: Phaser.Scene, x: number, y: number): FoodTruckHandle {
  const c = scene.add.container(x, y);

  // Wheels
  c.add(scene.add.circle(-32, 8, 10, WHEELS));
  c.add(scene.add.circle(32, 8, 10, WHEELS));

  // Body + trim
  c.add(scene.add.rectangle(0, -16, 96, 48, TRUCK_BODY));
  c.add(scene.add.rectangle(0, -40, 96, 6, TRUCK_TRIM));
  c.add(scene.add.rectangle(26, -20, 44, 36, TRUCK_CABIN));

  // Serving window + hood vent
  c.add(scene.add.rectangle(-18, -20, 24, 18, TRUCK_WINDOW));
  c.add(scene.add.rectangle(-18, -30, 28, 4, 0x666666));

  // Stylized peanut on side panel — code-generated sprite when loaded, else
  // the original two-ellipse programmer-art (keeps the headless test green).
  if (scene.textures.exists(SPR.peanut)) {
    const peanut = scene.add.image(12, -18, SPR.peanut);
    peanut.setScale(22 / peanut.height); // ~22px tall on the panel
    c.add(peanut);
  } else {
    c.add(scene.add.ellipse(12, -18, 14, 18, PEANUT).setStrokeStyle(1, PEANUT_SHELL));
    c.add(scene.add.ellipse(12, -22, 8, 6, PEANUT_SHELL));
  }

  // Roof supplies — burlap sacks
  c.add(scene.add.rectangle(-20, -44, 14, 10, PEANUT));
  c.add(scene.add.rectangle(-8, -46, 12, 12, 0xc4a574));
  c.add(scene.add.rectangle(8, -45, 10, 9, PEANUT));

  // Bumper sticker
  c.add(scene.add.rectangle(-38, 2, 36, 6, STICKER).setStrokeStyle(1, TRUCK_BODY));
  const sticker = scene.add.text(-38, 2, "Legumes ≠ Nuts", {
    fontSize: "4px",
    color: "#2C2416",
    fontFamily: "VT323",
  }).setOrigin(0.5);
  c.add(sticker);

  const smokeAnchors = [
    { x: x - 10, y: y - 50 },
    { x: x - 4, y: y - 58 },
    { x: x + 2, y: y - 66 },
  ];

  return { container: c, smokeAnchors };
}

export { SMOKE };
