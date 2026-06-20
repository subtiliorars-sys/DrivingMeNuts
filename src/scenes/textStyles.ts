/**
 * textStyles.ts — scaled Phaser text presets (DM-W2 large-text accessibility).
 *
 * All font sizes flow through scaledFont() in prefs.ts so large-text mode
 * applies from one place. GameScene and modals import these getters.
 */

import type Phaser from "phaser";
import { scaledFont } from "./prefs.js";

export function textStyleBody(): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: scaledFont(12), color: "#2C2416", fontFamily: "VT323" };
}

export function textStyleLabel(): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: scaledFont(10), color: "#2C2416", fontFamily: "VT323" };
}

export function textStyleHeader(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontSize: scaledFont(14),
    color: "#2C2416",
    fontFamily: "VT323",
    fontStyle: "bold",
  };
}

export function textStyleGreen(): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: scaledFont(12), color: "#4A7C4E", fontFamily: "VT323" };
}

export function textStyleRed(): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: scaledFont(12), color: "#C0392B", fontFamily: "VT323" };
}

/** Inline monospace label at a base pixel size (default body scale). */
export function monoTextStyle(
  basePx: number,
  color = "#2C2416"
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: scaledFont(basePx + 2), color, fontFamily: "VT323" };
}
