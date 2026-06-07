/**
 * lore.ts — Legume Lore collectible dialogue set (early-tier variants).
 *
 * strings are canon from docs/LEGUME_LORE.md — edit there first, then sync here
 *
 * Only Early-tier entries (LL-001 – LL-006) are included here; mid/late tiers
 * unlock in future phases when dayNumber gates are implemented.
 *
 * ZERO allergy references. ZERO mental-health punchlines (idiomatic title only).
 * Family-friendly throughout — see docs/LEGUME_LORE.md hard rules.
 */

export interface LoreLine {
  /** Canonical id, e.g. "LL-001". */
  readonly id: string;
  /** Customer's opening line. */
  readonly customer: string;
  /** Owner's reply. */
  readonly owner: string;
  /** Delivery tone tag (from LEGUME_LORE.md). */
  readonly tone: string;
}

/** All lore entries loaded for the current tier. Index by id for lookup. */
export const LORE_LINES: readonly LoreLine[] = [
  // ---- Early Game (Days 1–20): Annoyance & Learning ----

  {
    id: "LL-001",
    customer: "Wait, aren't peanuts actually legumes? Not real nuts?",
    owner: "Yeah, yeah, I know. It's driving me nuts.",
    tone: "Deadpan",
  },
  {
    id: "LL-002",
    customer: "Did you know peanuts are botanically legumes?",
    owner: "*sigh* I did know. Trust me, I know.",
    tone: "Weary",
  },
  {
    id: "LL-003",
    customer: "So, uh, legumes, not nuts, right?",
    owner: "Correct. And yes, before you ask—it drives me nuts.",
    tone: "Deadpan",
  },
  {
    id: "LL-004",
    customer: "My daughter just learned in school—peanuts are legumes!",
    owner: "Kid, that's cute. Welcome to my daily life.",
    tone: "Dry/Affectionate",
  },
  {
    id: "LL-005",
    customer: "Technically, these aren't nuts at all.",
    owner: "Technically correct. Also technically driving me nuts.",
    tone: "Deadpan",
  },
  {
    id: "LL-006",
    customer: "They're legumes, you know. Not actual nuts.",
    owner: "*nods, doesn't look up from roaster* Yeah.",
    tone: "Worn Down",
  },
] as const;

/** Total canon variant count (all tiers). Shown in the HUD lore counter. */
export const LORE_TOTAL_COUNT = 40;

/** Lookup map: id → LoreLine. */
export const LORE_BY_ID: Readonly<Record<string, LoreLine>> = Object.fromEntries(
  LORE_LINES.map((l) => [l.id, l]),
);
