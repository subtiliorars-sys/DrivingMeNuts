/**
 * lore.ts — Legume Lore collectible dialogue set.
 *
 * strings are canon from docs/LEGUME_LORE.md — edit there first, then sync here
 *
 * Tier gating (Wave 3):
 *   early: unlocked from day 1+   (LL-001 – LL-006)
 *   mid:   unlocked from day 5+   (LL-007 – LL-020)
 *   late:  reserved for future phases
 *
 * The gag picker in engine.ts draws only from tiers whose day gate is met.
 * HUD counter denominator = unlocked pool size (honest, grows with day).
 *
 * ZERO allergy references. ZERO mental-health punchlines (idiomatic title only).
 * Family-friendly throughout — see docs/LEGUME_LORE.md hard rules.
 */

export type LoreTier = "early" | "mid" | "late";

export interface LoreLine {
  /** Canonical id, e.g. "LL-001". */
  readonly id: string;
  /** Customer's opening line. */
  readonly customer: string;
  /** Owner's reply. */
  readonly owner: string;
  /** Delivery tone tag (from LEGUME_LORE.md). */
  readonly tone: string;
  /** Tier gate — controls which day the line enters the pool. */
  readonly tier: LoreTier;
}

/**
 * Day thresholds for each lore tier.
 * early: day 1+ (always in pool)
 * mid:   day 5+ — enough days for the pattern of repeat customers to feel real
 */
export const LORE_TIER_DAY_GATE: Readonly<Record<LoreTier, number>> = {
  early: 1,
  mid:   5,
  late:  999, // reserved — not yet in pool
} as const;

/** All lore entries in the canon. Index by id for lookup. */
export const LORE_LINES: readonly LoreLine[] = [
  // ---- Early Game (Days 1–20): Annoyance & Learning ----

  {
    id: "LL-001",
    customer: "Wait, aren't peanuts actually legumes? Not real nuts?",
    owner: "Yeah, yeah, I know. It's driving me nuts.",
    tone: "Deadpan",
    tier: "early",
  },
  {
    id: "LL-002",
    customer: "Did you know peanuts are botanically legumes?",
    owner: "*sigh* I did know. Trust me, I know.",
    tone: "Weary",
    tier: "early",
  },
  {
    id: "LL-003",
    customer: "So, uh, legumes, not nuts, right?",
    owner: "Correct. And yes, before you ask—it drives me nuts.",
    tone: "Deadpan",
    tier: "early",
  },
  {
    id: "LL-004",
    customer: "My daughter just learned in school—peanuts are legumes!",
    owner: "Kid, that's cute. Welcome to my daily life.",
    tone: "Dry/Affectionate",
    tier: "early",
  },
  {
    id: "LL-005",
    customer: "Technically, these aren't nuts at all.",
    owner: "Technically correct. Also technically driving me nuts.",
    tone: "Deadpan",
    tier: "early",
  },
  {
    id: "LL-006",
    customer: "They're legumes, you know. Not actual nuts.",
    owner: "*nods, doesn't look up from roaster* Yeah.",
    tone: "Worn Down",
    tier: "early",
  },

  // ---- Mid Game (Days 5+): Variations & Personality ----

  {
    id: "LL-007",
    customer: "Legumes. That's what the science teacher said.",
    owner: "Science teacher, huh? Tell her the peanut farmer already knew.",
    tone: "Smug",
    tier: "mid",
  },
  {
    id: "LL-008",
    customer: "Peanut plant is actually a legume—grows underground.",
    owner: "It is. And it's driving me to a state of constant minor irritation.",
    tone: "Professorial",
    tier: "mid",
  },
  {
    id: "LL-009",
    customer: "Same family as beans and peas, right?",
    owner: "Close enough. Same family as my headaches too.",
    tone: "Kid-like Exasperation",
    tier: "mid",
  },
  {
    id: "LL-010",
    customer: "Wikipedia says legumes.",
    owner: "Wikipedia and I agree. Now can I sell you some?",
    tone: "Smug",
    tier: "mid",
  },
  {
    id: "LL-011",
    customer: "My botanist friend told me—legumes.",
    owner: "Your botanist friend and 47 other people have told me this week.",
    tone: "Exasperated",
    tier: "mid",
  },
  {
    id: "LL-012",
    customer: "It's wild that they're legumes, not nuts.",
    owner: "It's wild that I'm still standing here.",
    tone: "Deadpan",
    tier: "mid",
  },
  {
    id: "LL-013",
    customer: "So the name is kind of misleading, huh?",
    owner: "Misleading. Like calling a food truck a 'Driving Me Nuts' when the product isn't nuts. Funny how that works.",
    tone: "Smug",
    tier: "mid",
  },
  {
    id: "LL-014",
    customer: "Legumes grow in pods, not on trees.",
    owner: "And I grow more patient each time someone tells me that.",
    tone: "Sarcastic",
    tier: "mid",
  },
  {
    id: "LL-015",
    customer: "They're in the pea and bean family.",
    owner: "Welcome to a club with thousands of members. You all say the same thing.",
    tone: "Smug/Affectionate",
    tier: "mid",
  },
  {
    id: "LL-016",
    customer: "My kid asked me at dinner—are these nuts or legumes?",
    owner: "And you said legumes, and you felt smart, and then you came to tell me, and I felt tired.",
    tone: "Weary/Knowing",
    tier: "mid",
  },
  {
    id: "LL-017",
    customer: "I probably shouldn't call them peanuts, right? They're legumes.",
    owner: "Peanuts is fine. 'Driving Me Nuts' is the brand. We own it now.",
    tone: "Smug/Proud",
    tier: "mid",
  },
  {
    id: "LL-018",
    customer: "Legumes, technically speaking.",
    owner: "You're the 847th person to say that. I'm naming my roaster after you.",
    tone: "Smug",
    tier: "mid",
  },
  {
    id: "LL-019",
    customer: "Did you know—",
    owner: "—that peanuts are legumes? Yeah. I named my business after that specific annoyance.",
    tone: "Deadpan/Proud",
    tier: "mid",
  },
  {
    id: "LL-020",
    customer: "Legumes, not nuts.",
    owner: "Legumes, not nuts. But have you tasted them? Best legumes in three counties.",
    tone: "Smug",
    tier: "mid",
  },
] as const;

/**
 * Total canon variant count (all tiers, including future late entries).
 * Kept for future use; current LORE_LINES only includes early + mid tiers.
 */
export const LORE_TOTAL_COUNT = 40;

/** Lookup map: id → LoreLine. */
export const LORE_BY_ID: Readonly<Record<string, LoreLine>> = Object.fromEntries(
  LORE_LINES.map((l) => [l.id, l]),
);
