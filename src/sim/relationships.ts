/**
 * relationships.ts — NPC friendship logic (pure, Phaser-free, testable).
 *
 * Friendship is a 0–100 score per NPC, stored in SimState.npcRelationships.
 * It only ever goes up through play (talking, repeat business, quest beats) —
 * there is no decay and no "streak you must maintain" pressure
 * (DARK_PATTERN_GATE: relationships are warm, not a retention treadmill).
 *
 * The data (names, lines, tier thresholds) lives in src/data/npcs.ts; this file
 * is the math + the small set of mutations the game performs.
 */

import type { SimState } from "./types.js";
import {
  FRIENDSHIP_MAX,
  type NpcId,
  type FriendTier,
  tierForFriendship,
  greetingFor,
  isNpcId,
} from "../data/npcs.js";

/** Friendship points for an NPC (0 if never met / unknown id). */
export function friendshipFor(state: SimState, id: NpcId): number {
  const v = state.npcRelationships?.[id];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Current friendship tier for an NPC. */
export function tierFor(state: SimState, id: NpcId): FriendTier {
  return tierForFriendship(friendshipFor(state, id));
}

/** The greeting line this NPC gives right now (tier-appropriate). */
export function greet(state: SimState, id: NpcId): string {
  return greetingFor(id, friendshipFor(state, id));
}

/** Have we ever interacted with this NPC? (Drives the Regulars list reveal.) */
export function hasMet(state: SimState, id: NpcId): boolean {
  return state.npcRelationships?.[id] !== undefined;
}

/**
 * Add friendship points (clamped to [0, FRIENDSHIP_MAX]). Returns whether the
 * tier changed, plus the before/after tiers — so the UI can fire a one-time
 * "you're now a Regular" beat without storing extra flags.
 */
export interface FriendshipChange {
  points: number;
  tierBefore: FriendTier;
  tierAfter: FriendTier;
  tierUp: boolean;
}

export function addFriendship(state: SimState, id: NpcId, delta: number): FriendshipChange {
  if (!state.npcRelationships) state.npcRelationships = {};
  const before = friendshipFor(state, id);
  const tierBefore = tierForFriendship(before);
  const safeDelta = Number.isFinite(delta) ? delta : 0;
  const after = Math.max(0, Math.min(FRIENDSHIP_MAX, before + safeDelta));
  state.npcRelationships[id] = after;
  const tierAfter = tierForFriendship(after);
  return { points: after, tierBefore, tierAfter, tierUp: tierAfter !== tierBefore };
}

/** Register a first meeting (idempotent — never lowers an existing score). */
export function meet(state: SimState, id: NpcId): void {
  if (!state.npcRelationships) state.npcRelationships = {};
  if (state.npcRelationships[id] === undefined) state.npcRelationships[id] = 0;
}

/**
 * Sanitize a raw (possibly hand-edited) relationships map on load: drop unknown
 * ids and coerce each score to a finite value in [0, FRIENDSHIP_MAX].
 */
export function reviveRelationships(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!isNpcId(k)) continue;
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      out[k] = Math.max(0, Math.min(FRIENDSHIP_MAX, v));
    }
  }
  return out;
}
