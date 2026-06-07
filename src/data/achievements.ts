/**
 * achievements.ts — milestone definitions (GDD F win-states, P1-reachable subset).
 *
 * Achievements are GOAL markers, not rewards: they grant no mechanical bonus
 * (that keeps them outside the dark-pattern surface — no "complete to unlock
 * power" pressure, DARK_PATTERN_GATE A.4). They surface the player's own
 * progress toward the GDD's plural win-states and teach goal-setting.
 *
 * Each achievement is a pure predicate over SimState. The engine evaluates them
 * in checkAchievements(); newly-true ones are recorded in
 * SimState.achievementsUnlocked and (in live play) toasted once. On LOAD,
 * already-true achievements are recorded silently (no toast burst) — same
 * derive-on-load pattern as comebackTier.
 *
 * Pure data + pure predicates. No Phaser. No economy constants are duplicated
 * here — thresholds that mirror economy values import them.
 */

import { BRAND_CAMPAIGN_LORE_THRESHOLD } from "./economy.js";
import { LORE_TOTAL_COUNT } from "./lore.js";
import { COMEBACK_TIERS } from "./comebacks.js";
import type { SimState } from "../sim/types.js";

export interface Achievement {
  /** Stable id, persisted in achievementsUnlocked. Never renumber. */
  readonly id: string;
  readonly name: string;
  /** One-line description of what earns it (shown in the panel + toast). */
  readonly desc: string;
  /** The real-world concept it nudges toward (curriculum tie-in). */
  readonly lesson: string;
  /** Pure predicate: true once the player has earned it. */
  readonly earned: (s: SimState) => boolean;
}

/**
 * P1 achievement set. Ordered roughly by reach (early → late). All are
 * reachable in the single-district P1 slice; district/franchise win-states
 * (GDD F 1/2/4) are P2+ and intentionally absent.
 */
export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: "ACH-first-sale",
    name: "Open for Business",
    desc: "Make your first sale.",
    lesson: "Revenue starts the moment you serve one customer.",
    earned: (s) => s.unitsSoldLifetime > 0,
  },
  {
    id: "ACH-first-grand",
    name: "First Grand",
    desc: "Reach $1,000 in lifetime earnings.",
    lesson: "Lifetime revenue compounds — small daily margins add up.",
    earned: (s) => s.lifetimeEarned >= 1_000,
  },
  {
    id: "ACH-ten-grand",
    name: "Five Figures",
    desc: "Reach $10,000 in lifetime earnings.",
    lesson: "Sustained operation, not one big day, builds a business.",
    earned: (s) => s.lifetimeEarned >= 10_000,
  },
  {
    id: "ACH-hundred-grand",
    name: "Six-Figure Roaster",
    desc: "Reach $100,000 in lifetime earnings (GDD F revenue win-state).",
    lesson: "Compound growth: the revenue-target win-state from the GDD.",
    earned: (s) => s.lifetimeEarned >= 100_000,
  },
  {
    id: "ACH-all-recipes",
    name: "Full Menu",
    desc: "Unlock every recipe.",
    lesson: "Reinvesting revenue widens what you can sell.",
    earned: (s) => s.recipesUnlocked.has("classic_salted")
      && s.recipesUnlocked.has("honey_cinnamon")
      && s.recipesUnlocked.has("ghost_pepper"),
  },
  {
    id: "ACH-brand",
    name: "It's a Feature",
    desc: "Launch the \"Legumes. Not Nuts.\" brand campaign.",
    lesson: "Brand equity raises what customers will pay.",
    earned: (s) => s.brandCampaignActive,
  },
  {
    id: "ACH-lore-half",
    name: "Halfway to Legend",
    desc: `Collect ${BRAND_CAMPAIGN_LORE_THRESHOLD} Legume Lore entries.`,
    lesson: "Turning a running joke into an asset takes repetition.",
    earned: (s) => s.gagsSeen.size >= BRAND_CAMPAIGN_LORE_THRESHOLD,
  },
  {
    id: "ACH-lore-master",
    name: "Philosopher of Legumes",
    desc: `Collect all ${LORE_TOTAL_COUNT} Legume Lore entries (GDD F mastery win-state).`,
    lesson: "Mastery of the bit — the GDD's silly-ending win-state.",
    earned: (s) => s.gagsSeen.size >= LORE_TOTAL_COUNT,
  },
  {
    id: "ACH-comeback-master",
    name: "Last Word",
    desc: "Unlock every Comeback tier.",
    lesson: "From annoyance to pride: the owner's character arc.",
    earned: (s) => s.comebackTier >= COMEBACK_TIERS.length,
  },
  {
    id: "ACH-survived-debt",
    name: "Back in the Black",
    desc: "Take a rescue path, then clear every debt and obligation.",
    lesson: "Cash-flow crises are solvable — debt repaid is debt mastered.",
    // Earned the moment a player who has used a rescue path returns to a clean
    // sheet (no active debts, no preorder, not mid-offer/active).
    earned: (s) => s.aftermathSeen.length > 0
      && s.rescueDebts.length === 0
      && s.preorderObligation === null
      && s.rescueMode === null,
  },
];

/** Lookup map: achievement id → definition. */
export const ACHIEVEMENT_BY_ID: Readonly<Record<string, Achievement>> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);

/** Total number of achievements (panel denominator). */
export const ACHIEVEMENT_TOTAL = ACHIEVEMENTS.length;
