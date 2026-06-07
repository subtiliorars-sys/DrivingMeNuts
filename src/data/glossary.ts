/**
 * glossary.ts — plain-language definitions of the business terms the game uses.
 *
 * The whole point of Driving Me Nuts is teaching real small-business concepts,
 * but P1 surfaces them only implicitly (insight lines, the BOOKS panel). This
 * is the opt-in "what does this mean?" layer — never mandatory (DARK_PATTERN /
 * C1 "broccoli" rule: learning is a by-product, not homework).
 *
 * Voice: 13+, concrete, no jargon-to-explain-jargon. Where a term touches real
 * law/fees, it carries the RISK_REGISTER A2 qualifier ("simplified — varies by
 * where you live"). Numbers cite the in-game stylized values, not real-world
 * claims.
 *
 * Pure data. No Phaser. The allergy entry is serious and respectful per
 * RISK_REGISTER A1 (honest-labeling + warm-referral canon; zero jokes).
 */

export interface GlossaryEntry {
  /** Stable key. */
  readonly id: string;
  /** Display term. */
  readonly term: string;
  /** Plain-language definition (1–3 short sentences). */
  readonly definition: string;
  /** Optional: how it shows up in THIS game, to connect concept → mechanic. */
  readonly inGame?: string;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    id: "cogs",
    term: "COGS (Cost of Goods Sold)",
    definition: "What it actually costs you to make the thing you sold — here, the raw peanuts plus the flavor ingredients in a bag. It does NOT include rent or fuel; those are fixed costs.",
    inGame: "Classic Salted costs $0.60/lb to make ($0.40 peanuts + $0.20 salt). You only 'spend' COGS when a bag sells.",
  },
  {
    id: "gross-margin",
    term: "Gross Margin",
    definition: "The share of each sale left after COGS, as a percentage. Higher is healthier. It's the room you have to cover fixed costs and still profit.",
    inGame: "At $1.50/lb with $0.60 COGS, gross margin is 60%. The day report flags anything under ~60% as tight.",
  },
  {
    id: "net-vs-cash",
    term: "Profit vs. Cash (they're not the same!)",
    definition: "Profit is what you earned after all expenses. Cash is how much money is actually in your till right now. You can be profitable but cash-poor (e.g. you paid for stock you haven't sold yet), or have cash that isn't really profit (e.g. a loan).",
    inGame: "The BOOKS panel shows both. Paying back a loan lowers your cash but isn't an expense — that's why it never changes your net profit.",
  },
  {
    id: "fixed-costs",
    term: "Fixed Costs",
    definition: "Costs you pay no matter how much you sell — permit, fuel, propane. They don't shrink on a slow day, which is why a quiet day can still lose money.",
    inGame: "$5.00/day here. You need to sell ~6 lbs at the default price just to cover them — that's your break-even.",
  },
  {
    id: "break-even",
    term: "Break-Even",
    definition: "The amount you must sell to exactly cover your costs — no profit, no loss. Everything above it is profit.",
    inGame: "Cover the $5 daily fixed cost at ~$0.90 gross profit per lb → ~6 lbs/day to break even.",
  },
  {
    id: "demand-curve",
    term: "Price & Demand",
    definition: "Usually, the higher you price, the fewer people buy. The best price isn't the highest one — it's the price where (profit per bag) × (bags sold) is biggest.",
    inGame: "The sweet spot here is around $1.90/lb — higher prices earn more per bag but sell fewer, and the total profit drops off either side.",
  },
  {
    id: "bulk-discount",
    term: "Bulk Discount",
    definition: "Suppliers often charge less per unit when you buy more at once. It lowers your cost — but buying too much ties up cash and risks waste.",
    inGame: "Orders of 100+ lbs get 5% off, 500+ get 12% off. The savings show up as a lower cost on the bags you roast and sell.",
  },
  {
    id: "supplier-relationship",
    term: "Supplier Relationship",
    definition: "Reliable, repeat buyers earn better terms over time. It's a real lever: loyalty and a track record can be worth as much as order size.",
    inGame: "Keep ordering and your supplier level rises (−3%/−8%/−15% off raw peanuts). It stacks with the bulk discount.",
  },
  {
    id: "apr",
    term: "APR (Annual Percentage Rate)",
    definition: "The cost of borrowing, expressed as a yearly rate, so you can compare loans fairly. A small-sounding flat fee on a short loan can be a HUGE APR. Always compare the APR, not the flat fee. (Simplified — real loans vary; check the actual terms.)",
    inGame: "Old Joe's friendly loan is ~130%/yr APR. The QuickNut payday option is ~391%/yr — same $-ish fee, far worse when annualized. That gap is the lesson.",
  },
  {
    id: "deferred-revenue",
    term: "Deferred Revenue",
    definition: "Money you've been paid for goods you haven't delivered yet. It's not profit — it's a promise you owe. Until you deliver, it's a liability on your books.",
    inGame: "When Derek pre-pays for a peanut order, that cash is deferred revenue until you actually deliver the roasted lbs.",
  },
  {
    id: "debt",
    term: "Debt & Credit",
    definition: "Borrowing lets you act now and pay later — useful for bridging a cash crunch, costly if it piles up. Transparent terms repaid on time build trust you can borrow against again.",
    inGame: "The 'Save the Truck' arc offers a fair loan, supplier credit, or a pre-order. Repeated borrowing gets costlier on purpose — that's realistic.",
  },
  {
    id: "permit",
    term: "Permit",
    definition: "Official permission to operate a food business, usually with a fee and a wait. Real permit rules and prices vary a lot by city and state — this game simplifies them. Check your local rules before starting a real business.",
    inGame: "Modeled here as part of your daily fixed costs. (Simplified — varies by jurisdiction.)",
  },
  {
    id: "allergy",
    term: "Peanut Allergy",
    definition: "Peanut allergies can be life-threatening, and even tiny amounts or cross-contact can cause a severe reaction. A truck that roasts peanuts cannot make anything truly peanut-free — everything shares the same equipment and air. The honest, respectful thing is to say so plainly and point allergic customers to a safe option nearby. Being upfront builds trust; it is never something to joke about.",
    inGame: "The truck's model is honest labeling + a warm referral to a nearby allergen-free cart — never pretending a peanut truck is safe for someone with a peanut allergy.",
  },
];

/** The standing accuracy disclaimer (RISK_REGISTER A2) shown atop the glossary. */
export const GLOSSARY_DISCLAIMER =
  "This game is simplified for learning. Real prices, fees, permits, and laws vary by where you live and change over time — for a real business, check your local rules (e.g. your area's SBA office). The numbers here teach the idea, not the exact figures.";

export const GLOSSARY_BY_ID: Readonly<Record<string, GlossaryEntry>> =
  Object.fromEntries(GLOSSARY.map((e) => [e.id, e]));
