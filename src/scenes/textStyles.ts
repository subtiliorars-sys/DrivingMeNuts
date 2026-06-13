/**
 * textStyles.ts — scaled Phaser text presets (DM-W2 large-text accessibility).
 *
 * All font sizes flow through scaledFont() in prefs.ts so large-text mode
 * applies from one place. GameScene and modals import these getters.
 */

import type Phaser from "phaser";
import { scaledFont } from "./prefs.js";

export function textStyleBody(): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: scaledFont(9), color: "#2C2416", fontFamily: "monospace" };
}

export function textStyleLabel(): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: scaledFont(8), color: "#2C2416", fontFamily: "monospace" };
}

export function textStyleHeader(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontSize: scaledFont(10),
    color: "#2C2416",
    fontFamily: "monospace",
    fontStyle: "bold",
  };
}

export function textStyleGreen(): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: scaledFont(9), color: "#4A7C4E", fontFamily: "monospace" };
}

export function textStyleRed(): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: scaledFont(9), color: "#C0392B", fontFamily: "monospace" };
}

/** Inline monospace label at a base pixel size (default body scale). */
export function monoTextStyle(
  basePx: number,
  color = "#2C2416"
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: scaledFont(basePx), color, fontFamily: "monospace" };
}
