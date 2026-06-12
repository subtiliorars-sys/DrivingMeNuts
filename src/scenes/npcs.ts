/**
 * npcs.ts — Ambient customer silhouettes (DMN-2b / P1_SPRITE_SPEC #6–8).
 */
import Phaser from "phaser";

export type NpcArchetype = "lecturer" | "parent" | "worker";

export interface NpcHandle {
  container: Phaser.GameObjects.Container;
  archetype: NpcArchetype;
}

const SKIN = 0xe8d4b0;
const TEXT = 0x2c2416;

export function drawNpc(
  scene: Phaser.Scene,
  archetype: NpcArchetype,
  x: number,
  y: number,
  shirtColor: number,
): NpcHandle {
  const c = scene.add.container(x, y);

  if (archetype === "lecturer") {
    // Tall, thin, pointing finger — "actually, peanuts are..."
    c.add(scene.add.rectangle(0, -4, 8, 18, shirtColor));
    c.add(scene.add.rectangle(0, -18, 7, 8, SKIN));
    c.add(scene.add.rectangle(-2, -20, 2, 1, TEXT));
    c.add(scene.add.rectangle(2, -20, 2, 1, TEXT));
    c.add(scene.add.rectangle(10, -14, 10, 3, SKIN)); // pointing arm
    c.add(scene.add.rectangle(16, -15, 3, 3, SKIN)); // finger
  } else if (archetype === "parent") {
    // Short, wide, tote bag
    c.add(scene.add.rectangle(0, -2, 12, 12, shirtColor));
    c.add(scene.add.rectangle(0, -14, 9, 9, SKIN));
    c.add(scene.add.circle(-2, -16, 1, TEXT));
    c.add(scene.add.circle(2, -16, 1, TEXT));
    c.add(scene.add.rectangle(-10, -4, 6, 8, 0xc4a574)); // tote
    c.add(scene.add.rectangle(0, 6, 10, 4, TEXT)); // shoes
  } else {
    // Office worker — narrow suit, briefcase
    c.add(scene.add.rectangle(0, -4, 7, 16, shirtColor));
    c.add(scene.add.rectangle(0, -17, 6, 7, SKIN));
    c.add(scene.add.rectangle(0, -10, 2, 6, 0xcccccc)); // tie
    c.add(scene.add.rectangle(8, -2, 8, 6, 0x4a3728)); // briefcase
    c.add(scene.add.rectangle(8, -6, 8, 1, 0x2c2416));
  }

  return { container: c, archetype };
}
