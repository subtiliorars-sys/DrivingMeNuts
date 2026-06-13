/**
 * prefs.ts — accessibility / display preferences (Polish & Pedagogy wave).
 *
 * These are PREFERENCES, not game state: stored in localStorage under their own
 * keys (mirrors audio.ts MUTE_KEY), NOT in the save schema. So they need no
 * schema bump and are outside CRIT-1 (no game data, no PII, local-only).
 *
 * Phaser-free, pure module. GameScene reads these to gate animations and add
 * redundant (non-color) status cues.
 *
 * Accessibility rationale (a 13+ game headed for classrooms):
 *  - reducedMotion: respect motion sensitivity / vestibular concerns — gate the
 *    ambient smoke, coin-pop float, NPC walk, and celebratory bursts.
 *  - colorblindCues: never rely on color alone (WCAG 1.4.1). When on, the
 *    color-coded margin/net signals also carry a word/arrow.
 */

export const REDUCED_MOTION_KEY = "dmn_reduced_motion";
export const COLORBLIND_KEY = "dmn_colorblind_cues";
export const LARGE_TEXT_KEY = "dmn_large_text";

/** Multiplier applied to all UI font sizes when large-text mode is on. */
export const LARGE_TEXT_SCALE = 1.28;

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "getItem" | "setItem">;

let _reducedMotion = false;
let _colorblindCues = false;
let _largeText = false;

/** Load persisted prefs (call once on scene create, before first render). */
export function prefsInit(storage?: ReadStorage): void {
  if (!storage) return;
  _reducedMotion = storage.getItem(REDUCED_MOTION_KEY) === "1";
  _colorblindCues = storage.getItem(COLORBLIND_KEY) === "1";
  _largeText = storage.getItem(LARGE_TEXT_KEY) === "1";
}

export function isReducedMotion(): boolean {
  return _reducedMotion;
}

export function isColorblindCues(): boolean {
  return _colorblindCues;
}

export function isLargeText(): boolean {
  return _largeText;
}

/** Scale factor for font sizes (1 or LARGE_TEXT_SCALE). */
export function fontScale(): number {
  return _largeText ? LARGE_TEXT_SCALE : 1;
}

/** Return a Phaser fontSize string for a base pixel size. */
export function scaledFont(basePx: number): string {
  return `${Math.round(basePx * fontScale())}px`;
}

/** Toggle reduced-motion; persists; returns the new value. */
export function toggleReducedMotion(storage?: WriteStorage): boolean {
  _reducedMotion = !_reducedMotion;
  if (storage) storage.setItem(REDUCED_MOTION_KEY, _reducedMotion ? "1" : "0");
  return _reducedMotion;
}

/** Toggle colorblind cues; persists; returns the new value. */
export function toggleColorblindCues(storage?: WriteStorage): boolean {
  _colorblindCues = !_colorblindCues;
  if (storage) storage.setItem(COLORBLIND_KEY, _colorblindCues ? "1" : "0");
  return _colorblindCues;
}

/** Toggle large-text mode; persists; returns the new value. */
export function toggleLargeText(storage?: WriteStorage): boolean {
  _largeText = !_largeText;
  if (storage) storage.setItem(LARGE_TEXT_KEY, _largeText ? "1" : "0");
  return _largeText;
}

/**
 * A short, non-color label for a margin %, so colorblind players get the same
 * signal the green/amber/red color gives. Thresholds match the HUD coloring
 * (≥60% healthy, ≥45% tight, else low) — single source for both.
 */
export function marginCue(marginPct: number): string {
  if (marginPct >= 60) return "healthy";
  if (marginPct >= 45) return "tight";
  return "low";
}
