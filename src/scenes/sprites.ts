/**
 * sprites.ts — registry + loader for the code-generated pixel-art sprites.
 *
 * The PNGs live in public/generated/ (committed; produced by
 * tools/art/build-assets.cjs) and are served at ./generated/*.png in every
 * build path — Vite dev, production bundle, and the Electron file:// shell
 * (vite base is "./", so the relative URL resolves everywhere).
 *
 * LOADING CONTRACT (why only BootScene preloads):
 * The headless boot smoke test boots BOTH scenes and steps the loop a few
 * times. If GameScene queued image loads in its own preload, its create() would
 * block on the loader (which can't resolve files under jsdom) and the smoke
 * assertions would fail. So images are loaded ONCE in BootScene.preload; the
 * TextureManager is global, so GameScene just reads them. Every draw site uses
 * `hasSprite()` and falls back to programmer-art when a texture is absent —
 * which is exactly what keeps the headless test (no real files) green.
 */
import type Phaser from "phaser";

export interface SpriteDef {
  key: string;
  url: string;
}

/** Texture keys (use these constants so call sites can't typo a key). */
export const SPR = {
  peanut: "spr-peanut",
  mascot: "spr-mascot",
  coin: "spr-coin",
  star: "spr-star",
  bag: "spr-bag",
  sign: "spr-sign",
} as const;

/** The six NPC ids that have a portrait (mirrors src/data/npcs.ts NpcId). */
const NPC_PORTRAIT_IDS = ["old_joe", "marta", "derek", "sal", "maya", "dr_chen"] as const;

/** Texture key for an NPC portrait, e.g. npcPortraitKey("marta") → "npc-marta". */
export function npcPortraitKey(id: string): string {
  return `npc-${id}`;
}

export const SPRITE_MANIFEST: SpriteDef[] = [
  { key: SPR.peanut, url: "generated/roasted-peanut.png" },
  { key: SPR.mascot, url: "generated/peanut-mascot.png" },
  { key: SPR.coin, url: "generated/coin.png" },
  { key: SPR.star, url: "generated/star.png" },
  { key: SPR.bag, url: "generated/peanut-bag.png" },
  { key: SPR.sign, url: "generated/shop-sign.png" },
  ...NPC_PORTRAIT_IDS.map((id) => ({ key: npcPortraitKey(id), url: `generated/npc-${id}.png` })),
];

/** Queue every sprite for loading. Call from BootScene.preload(). */
export function preloadSprites(scene: Phaser.Scene): void {
  for (const s of SPRITE_MANIFEST) {
    // Guard against double-registration if BootScene re-runs.
    if (!scene.textures.exists(s.key)) scene.load.image(s.key, s.url);
  }
}

/** True if a texture is loaded and ready to draw. */
export function hasSprite(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key);
}

/**
 * Add a sprite image scaled so its on-screen height is `displayHeight` native
 * px (the source PNGs are 8× the native sprite size). Returns the Image, or
 * null when the texture isn't loaded so callers can fall back to shapes.
 */
export function addSprite(
  scene: Phaser.Scene,
  key: string,
  x: number,
  y: number,
  displayHeight: number,
): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(key)) return null;
  const img = scene.add.image(x, y, key);
  const scale = displayHeight / img.height;
  img.setScale(scale);
  return img;
}
