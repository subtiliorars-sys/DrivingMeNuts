/**
 * npcs.ts — the six named regulars of Driving Me Nuts (GDD §B3).
 *
 * Pure content + helpers (no Phaser, no sim state) so it's unit-testable and
 * usable from both the sim and scene layers. Relationship *state* lives in
 * SimState (src/sim/relationships.ts); this file is the cast and their lines.
 *
 * Tone (CLAUDE.md canon): warm, a little self-aware, never mean. The legume gag
 * is affectionate exasperation. Peanut ALLERGY is never joke fodder — Marta's
 * allergen line models honest labeling + a warm referral, per CONCEPT.md.
 */

import type { DistrictId } from "./economy.js";

/** Stable NPC identifiers (used as keys in SimState.npcRelationships). */
export type NpcId = "old_joe" | "marta" | "derek" | "sal" | "maya" | "dr_chen";

/** Friendship tiers, low → high. Drives which greeting line shows. */
export type FriendTier = "stranger" | "acquaintance" | "regular" | "friend";

export const FRIEND_TIERS: FriendTier[] = ["stranger", "acquaintance", "regular", "friend"];

/** Inclusive lower bounds for each tier on a 0–100 friendship scale. */
export const FRIEND_TIER_MIN: Record<FriendTier, number> = {
  stranger: 0,
  acquaintance: 20,
  regular: 50,
  friend: 80,
};

export const FRIENDSHIP_MAX = 100;

export interface NpcDef {
  id: NpcId;
  name: string;
  /** One-line role for the Regulars list. */
  role: string;
  /** The district they're most associated with (for ambient placement). */
  district: DistrictId;
  /** What they do for (or to) the business — the teaching hook. */
  hook: string;
  /** Greeting line per tier — escalates from cool to warm as you bond. */
  greet: Record<FriendTier, string>;
  /** Their flavour of the legume gag (warm, in-character). */
  gag: string;
  /** A friend-tier reward beat (shown once you reach "friend"). */
  friendBeat: string;
}

export const NPCS: Record<NpcId, NpcDef> = {
  old_joe: {
    id: "old_joe",
    name: "Old Joe",
    role: "Retired vendor · your mentor",
    district: "farmers_market",
    hook: "Hands you starter wisdom early, and steps in when the truck's in trouble.",
    greet: {
      stranger: "So you're the one who took the old girl on. Let's see if you've got the hunger.",
      acquaintance: "Roaster's humming today. You're learning the rhythm.",
      regular: "I drove that truck twenty years. You're treating her right — I can tell.",
      friend: "You know what? She's yours now. Not the truck. The whole thing. Proud of you, kid.",
    },
    gag: "Folks'll tell you peanuts are legumes. Let 'em. The name's a feature, not a bug.",
    friendBeat: "Old Joe leaves you his hand-written honey-salt ratio. 'Don't tell Marta.'",
  },
  marta: {
    id: "marta",
    name: "Marta",
    role: "Loyal customer · Farmers' Market",
    district: "farmers_market",
    hook: "Word-of-mouth: keep her happy and her whole book club shows up.",
    greet: {
      stranger: "I've been coming to this corner since your uncle ran it. Buy local, always.",
      acquaintance: "Same as yesterday, dear. Consistency is a kindness.",
      regular: "I told the book club about you. Don't make me look bad now.",
      friend: "You're family now. I bragged about your roast at bridge night — you're welcome.",
    },
    // Allergy handled with care: honest labeling + warm referral, never a joke.
    gag: "My grandson says they're legumes, not nuts. (He's also allergic — I send him to the safe cart on 4th. You should keep pointing folks there too.)",
    friendBeat: "Marta brings you a jar of her preserves. 'For the long days.'",
  },
  derek: {
    id: "derek",
    name: "Derek",
    role: "Office commuter · Tuesdays",
    district: "office_quarter",
    hook: "Demands a CONSISTENT price. Drift too much and he walks. Batch control = trust.",
    greet: {
      stranger: "Same order every Tuesday. If the price keeps jumping, I'm out.",
      acquaintance: "Steady price this week. Good. I notice these things.",
      regular: "You're the most reliable thing in my whole commute. That's not nothing.",
      friend: "Brought the whole floor down with me today. Told 'em: this one's consistent.",
    },
    gag: "I read that peanuts are legumes. I don't care. I care that Tuesday tastes like Tuesday.",
    friendBeat: "Derek sets up a standing weekly order for the office. Predictable revenue.",
  },
  sal: {
    id: "sal",
    name: "Sal",
    role: "Rival vendor · Salted Snacks",
    district: "office_quarter",
    hook: "Undercuts you and talks trash. Beat him on flavour & reputation, not just price.",
    greet: {
      stranger: "Peanuts? That's yesterday's food, pal. I'll be parked right here tomorrow.",
      acquaintance: "Huh. Line's longer than I figured. Beginner's luck.",
      regular: "Alright, alright. You can roast. Doesn't mean I'm leaving.",
      friend: "Tell you what — buy you a coffee. Rivals can be neighbours. Don't get soft on me.",
    },
    gag: "Least my chips don't need a botany lecture. Legumes! Who names a truck after a correction?",
    friendBeat: "Sal swaps supplier tips. Your bulk discount tier nudges up.",
  },
  maya: {
    id: "maya",
    name: "Maya",
    role: "Permit clerk · City Hall",
    district: "office_quarter",
    hook: "Gatekeeps district permits. Earn her respect and the paperwork gets cheaper.",
    greet: {
      stranger: "Permit's a hundred fifty and six weeks. Or three hundred, expedited. Next.",
      acquaintance: "Your forms are actually filled out right. Refreshing.",
      regular: "I flagged your expedite to the top of my pile. Don't tell anyone.",
      friend: "Between us? I'll waive the rush fee. You make this district better.",
    },
    gag: "Box 7 asks 'product category.' You wrote 'legume.' Technically correct. My favourite kind.",
    friendBeat: "Maya quietly drops your permit costs. Compliance just got cheaper.",
  },
  dr_chen: {
    id: "dr_chen",
    name: "Dr. Chen",
    role: "Food critic · Hidden Gems column",
    district: "farmers_market",
    hook: "A 5-star review unlocks Premium Roast and a foot-traffic boost downtown.",
    greet: {
      stranger: "Roasting is a craft. Impress me and I'll write you up. Disappoint me and I won't.",
      acquaintance: "There's intention in this batch. I'm... cautiously curious.",
      regular: "I've eaten everywhere. This makes me want to sit down. That's rare.",
      friend: "Five stars. 'Hidden Gem no longer.' The column runs Sunday. Don't let it change you.",
    },
    gag: "A legume, prepared with this much love, out-classes most nuts. Print that.",
    friendBeat: "Dr. Chen's review goes live: Premium Roast unlocked, downtown takes notice.",
  },
};

/** Ordered cast for stable UI listing. */
export const NPC_ORDER: NpcId[] = ["old_joe", "marta", "derek", "sal", "maya", "dr_chen"];

/** Map 0–100 friendship to its tier. */
export function tierForFriendship(points: number): FriendTier {
  const p = Number.isFinite(points) ? points : 0;
  if (p >= FRIEND_TIER_MIN.friend) return "friend";
  if (p >= FRIEND_TIER_MIN.regular) return "regular";
  if (p >= FRIEND_TIER_MIN.acquaintance) return "acquaintance";
  return "stranger";
}

/** The greeting line an NPC gives at a given friendship level. */
export function greetingFor(id: NpcId, points: number): string {
  return NPCS[id].greet[tierForFriendship(points)];
}

/** True if `id` is one of the six known NPCs (validation for save loads). */
export function isNpcId(id: unknown): id is NpcId {
  return typeof id === "string" && id in NPCS;
}
