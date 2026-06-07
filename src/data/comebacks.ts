/**
 * comebacks.ts — Comeback Lines for the Legume Gag (GDD B4).
 *
 * The Nut Facts meter: every UNIQUE Legume Lore entry heard counts toward
 * comeback-tier unlocks at 10 / 20 / 30 / 40 entries (calibrated to the
 * 40-entry lore canon). Each tier unlocks a set of owner comeback lines that
 * replace the stock owner reply in the gag speech bubble — the owner's
 * journey from tired sighs to proud mastery of the joke (GDD B4/E).
 *
 * Content rules (CLAUDE.md canon + RISK_REGISTER A1):
 *   - The joke is earnest; late-game lines have pride, not mockery.
 *   - Zero allergy jokes, ever.
 *   - No punching down — the customer is never the butt of the joke.
 *
 * Pure data. No Phaser. Tier thresholds here are progression constants
 * (content-adjacent like LORE_TIER_DAY_GATE), not economy numbers.
 */

export interface ComebackTier {
  /** Tier index, 1-based (tier 0 = stock owner replies in lore.ts). */
  readonly tier: number;
  /** Unique lore entries heard (gagsSeen.size) required to unlock this tier. */
  readonly threshold: number;
  /** Short label for the unlock toast. */
  readonly label: string;
  /** Owner comeback lines available once this tier is unlocked. */
  readonly lines: readonly ComebackLine[];
}

export interface ComebackLine {
  readonly id: string;       // "CB-101" — tier digit + index
  readonly text: string;     // the owner's reply
}

/**
 * Tier ladder: thresholds at 10/20/30/40 unique lore entries (GDD B4).
 * Voice arc: tier 1 = tired-but-game → tier 4 = the joke IS the brand.
 */
export const COMEBACK_TIERS: readonly ComebackTier[] = [
  {
    tier: 1,
    threshold: 10,
    label: "Sigh & Smile",
    lines: [
      { id: "CB-101", text: "I know, I know — it's driving me nuts. ...Yes, I hear it too." },
      { id: "CB-102", text: "Tenth time today. Still technically correct. Still buying peanuts though, right?" },
      { id: "CB-103", text: "One day I'll put that on the menu: 'Legumes, roasted. Ask me why.'" },
    ],
  },
  {
    tier: 2,
    threshold: 20,
    label: "Dad-Joke Counterattack",
    lines: [
      { id: "CB-201", text: "True! And tomatoes are fruit, but you don't see me putting them in a fruit salad." },
      { id: "CB-202", text: "Correct — they grow underground. I sell the world's most popular root-adjacent snack." },
      { id: "CB-203", text: "Botanically a legume, economically a bestseller. I'll take it." },
      { id: "CB-204", text: "You're right. The truck's named after this exact conversation, you know." },
    ],
  },
  {
    tier: 3,
    threshold: 30,
    label: "Legume Scholar",
    lines: [
      { id: "CB-301", text: "Legumes fix nitrogen in the soil — peanuts literally feed the field they grow in. Nature's good neighbor." },
      { id: "CB-302", text: "Fun trade: peanuts rotate with cotton because they restore the soil. Farmers figured that out long before I did." },
      { id: "CB-303", text: "A peanut is a seed in a pod, same family as peas and lentils. The shell? That's the pod. Mind officially blown?" },
      { id: "CB-304", text: "George Washington Carver spent a career showing what this little legume can do. I just found one more use: your afternoon." },
    ],
  },
  {
    tier: 4,
    threshold: 40,
    label: "Philosopher of Legumes",
    lines: [
      { id: "CB-401", text: "Friend, this truck was BUILT on that fact. Every bag sold says 'legume' in spirit." },
      { id: "CB-402", text: "You know what? You're part of the story now. Everyone who tells me that keeps this truck rolling." },
      { id: "CB-403", text: "Once it drove me nuts. Now it drives the business. Funny how that works." },
      { id: "CB-404", text: "Correct, as always. And proud of it — best legume on four wheels." },
    ],
  },
] as const;

/** Thresholds in ascending order, for meter display: [10, 20, 30, 40]. */
export const COMEBACK_THRESHOLDS: readonly number[] = COMEBACK_TIERS.map(t => t.threshold);

/** Highest comeback tier unlocked for a given unique-lore count (0 = none). */
export function comebackTierFor(uniqueLoreCount: number): number {
  let tier = 0;
  for (const t of COMEBACK_TIERS) {
    if (uniqueLoreCount >= t.threshold) tier = t.tier;
  }
  return tier;
}

/** Lookup map: comeback line id → line. */
export const COMEBACK_BY_ID: Readonly<Record<string, ComebackLine>> = Object.fromEntries(
  COMEBACK_TIERS.flatMap(t => t.lines.map(l => [l.id, l]))
);

/** All lines available at or below a given tier (flat pool for the picker). */
export function comebackPoolForTier(tier: number): readonly ComebackLine[] {
  return COMEBACK_TIERS.filter(t => t.tier <= tier).flatMap(t => t.lines);
}
