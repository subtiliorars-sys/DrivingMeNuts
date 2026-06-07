/**
 * lore.ts — Legume Lore collectible dialogue set.
 *
 * strings are canon from docs/LEGUME_LORE.md — edit there first, then sync here
 *
 * Tier gating (Wave 3, W5 playtest-compressed gates):
 *   early: unlocked from day 1+   (LL-001 – LL-006)
 *   mid:   unlocked from day 8+   (LL-007 – LL-016)
 *   late:  unlocked from day 20+  (LL-017 – LL-040; canon LATE per LEGUME_LORE.md)
 *
 * Gate note: day numbers are compressed vs the doc's narrative ranges (Mid=day 21+,
 * Late=day 51+) for P1 playtest realism — at 14-minute days, nobody reaches day 21
 * soon. Ratio is preserved (early→mid→late arc order is canon; absolute numbers tunable).
 * See docs/LEGUME_LORE.md for the authorial intent note.
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
 * mid:   day 8+ — playtest-compressed (canon narrative is day 21+; see module note)
 * late:  day 20+ — playtest-compressed (canon narrative is day 51+; LL-017–LL-020)
 */
export const LORE_TIER_DAY_GATE: Readonly<Record<LoreTier, number>> = {
  early: 1,
  mid:   8,
  late:  20,
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
    tier: "late", // W5: canon LATE tier per LEGUME_LORE.md; gate day 20+
  },
  {
    id: "LL-018",
    customer: "Legumes, technically speaking.",
    owner: "You're the 847th person to say that. I'm naming my roaster after you.",
    tone: "Smug",
    tier: "late", // W5: canon LATE tier per LEGUME_LORE.md; gate day 20+
  },
  {
    id: "LL-019",
    customer: "Did you know—",
    owner: "—that peanuts are legumes? Yeah. I named my business after that specific annoyance.",
    tone: "Deadpan/Proud",
    tier: "late", // W5: canon LATE tier per LEGUME_LORE.md; gate day 20+
  },
  {
    id: "LL-020",
    customer: "Legumes, not nuts.",
    owner: "Legumes, not nuts. But have you tasted them? Best legumes in three counties.",
    tone: "Smug",
    tier: "late", // W5: canon LATE tier per LEGUME_LORE.md; gate day 20+
  },

  // ---- Late Game (LL-021–LL-040): verbatim from docs/LEGUME_LORE.md ----
  // Loaded in Wave 4 polish batch; gate day 20+ (LORE_TIER_DAY_GATE.late = 20).

  {
    id: "LL-021",
    customer: "I saw somewhere that legumes are healthier than tree nuts.",
    owner: "So they're superior legumes AND they're still driving me nuts. Double win.",
    tone: "Smug/Playful",
    tier: "late",
  },
  {
    id: "LL-022",
    customer: "Legumes have more protein than people think.",
    owner: "People think legumes are nuts. That's the baseline. We're beating expectations.",
    tone: "Professorial",
    tier: "late",
  },
  {
    id: "LL-023",
    customer: "Your truck name finally makes sense.",
    owner: "*grins* \"Three months of you people saying that, and NOW you get it.\"",
    tone: "Smug/Warm",
    tier: "late",
  },
  {
    id: "LL-024",
    customer: "I teach biology. Legumes.",
    owner: "I teach economics. This legume costs you $1.50. Legume economics driving me nuts.",
    tone: "Smug/Professorial",
    tier: "late",
  },
  {
    id: "LL-025",
    customer: "They're in the fabaceae family, scientifically.",
    owner: "I'm in the 'sell peanuts and smile' family, scientifically. You winning the trivia; I'm winning the day.",
    tone: "Smug/Warm",
    tier: "late",
  },
  {
    id: "LL-026",
    customer: "So if they're legumes, why do you call them—",
    owner: "Peanuts. Because it's fun to confuse people. And because 'Driving Me Nuts' is a better truck name than 'Legume Logistics.'",
    tone: "Smug",
    tier: "late",
  },
  {
    id: "LL-027",
    customer: "I should probably tell you—legumes.",
    owner: "But you're going to anyway. Make it a large, and I'll smile about it.",
    tone: "Warm/Deadpan",
    tier: "late",
  },
  {
    id: "LL-028",
    customer: "Aren't these technically—",
    owner: "—legumes? Yeah. You want the honey cinnamon or the classic salted?",
    tone: "Warm/Efficient",
    tier: "late",
  },
  {
    id: "LL-029",
    customer: "I'm about to blow your mind. Legumes.",
    owner: "*laughs* \"You're 6 months too late. But I appreciate the energy.\"",
    tone: "Warm/Amused",
    tier: "late",
  },
  {
    id: "LL-030",
    customer: "Wait, are these—peanuts are legumes, aren't they?",
    owner: "Yes. And I'm still here. Still roasting them. Still driving me nuts—but also, still making money. So it works out.",
    tone: "Philosophical/Smug",
    tier: "late",
  },
  {
    id: "LL-031",
    customer: "I just realized. Legumes!",
    owner: "Welcome. You're in good company. Also, that'll be $1.50.",
    tone: "Warm/Knowing",
    tier: "late",
  },
  {
    id: "LL-032",
    customer: "These are legumes, right? That's the whole thing?",
    owner: "That's the whole thing. That's been the whole thing since day one. I've made peace with it.",
    tone: "Zen/Proud",
    tier: "late",
  },
  {
    id: "LL-033",
    customer: "I brought my cousin to tell you. She's a botanist. Legumes.",
    owner: "Tell your cousin the botanist I've received her message loud and clear. Via dozens of botanists. Can I sell you both something?",
    tone: "Smug/Warm",
    tier: "late",
  },
  {
    id: "LL-034",
    customer: "My kid is going to come tell you too. She learned it today.",
    owner: "*smiles* \"Kids get it first. She'll be the 50th person to tell me before she's in high school. I'm building a legacy.\"",
    tone: "Warm/Proud",
    tier: "late",
  },
  {
    id: "LL-035",
    customer: "Okay, so here's what I learned...",
    owner: "Legumes. I know. You're about to order, you're going to enjoy them, and you're going to come back next week and tell me again.",
    tone: "Smug/Affectionate",
    tier: "late",
  },
  {
    id: "LL-036",
    customer: "Cashews are berries, technically.",
    owner: "*too tired to argue* \"Sure. They're all something other than what the name says. I'm not surprised anymore. Want some legume?\"",
    tone: "Resigned",
    tier: "late",
  },
  {
    id: "LL-037",
    customer: "But you roast them, so does that make them... cooked legumes?",
    owner: "Congratulations, you've invented a subcategory. Very late-game of you.",
    tone: "Smug",
    tier: "late",
  },
  {
    id: "LL-038",
    customer: "Do legumes taste better than regular nuts?",
    owner: "There are no regular nuts here, friend. Only legumes. Very good legumes. Taste and decide.",
    tone: "Zen",
    tier: "late",
  },
  {
    id: "LL-039",
    customer: "I feel like I'm doing you a service by pointing this out.",
    owner: "You're not. But I appreciate the sentiment. Five dollars for a bag of legumes?",
    tone: "Warm/Blunt",
    tier: "late",
  },
  {
    id: "LL-040",
    customer: "You know, 'Driving Me Nuts' is actually the perfect name if they're legumes.",
    owner: "*lights up* \"Thank you. First person to get that intentionally. You win—free sample of the experimental flavor.\"",
    tone: "Warm/Celebratory",
    tier: "late",
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
