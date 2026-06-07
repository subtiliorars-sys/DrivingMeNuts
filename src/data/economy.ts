/**
 * economy.ts — single source of truth for all P1 economy constants.
 *
 * IMPORTANT: These are stylized in-game values; real-world reference =
 * docs/BUSINESS_CURRICULUM.md. Numbers are internally consistent:
 *   - Classic Salted COGS $0.60/lb, default sell $1.50/lb → 60% gross margin.
 *     (The in-game 60% margin is the stylized teaching figure; BUSINESS_CURRICULUM §2
 *      cites 65–72% as the real-world food-truck benchmark.)
 *   - A "mispriced" day at $0.70/lb (below COGS) visibly loses money.
 *   - Daily fixed costs of $5.00 require ceil($5.00 / $0.90) = 6 lbs/day sold at
 *     default price to break even.  (gross profit/lb at $1.50 = $1.50 – $0.60 = $0.90)
 *
 * Do NOT hardcode prices, rates, or multipliers elsewhere; import from here.
 */

// ---------------------------------------------------------------------------
// Raw peanut supply
// ---------------------------------------------------------------------------

/** Base market price per lb (no discount, no season modifier). */
export const RAW_PEANUT_BASE_PRICE = 0.40;

/** Minimum purchase qty in a single order (lbs). */
export const RAW_ORDER_MIN_LBS = 10;

/** Maximum purchase qty in a single order (lbs). */
export const RAW_ORDER_MAX_LBS = 1_000;

// ---------------------------------------------------------------------------
// Bulk discount tiers  (GDD C2; BUSINESS_CURRICULUM integrity rule 1)
// Each tier: minimum quantity → fractional discount applied to unit price.
// ---------------------------------------------------------------------------

export interface BulkTier {
  readonly minLbs: number;
  readonly discount: number; // e.g. 0.05 = 5%
}

export const BULK_DISCOUNT_TIERS: readonly BulkTier[] = [
  { minLbs: 500, discount: 0.12 },
  { minLbs: 100, discount: 0.05 },
  { minLbs: 0,   discount: 0.00 },
] as const;

/**
 * Return the bulk discount fraction (e.g. 0.05) for a purchase of `lbs` lbs.
 * Exported so GameScene can derive prices from one place (no reimplementation).
 */
export function bulkDiscountFor(lbs: number): number {
  for (const tier of BULK_DISCOUNT_TIERS) {
    if (lbs >= tier.minLbs) return tier.discount;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Recipes — P1 ships with Classic Salted only (one district, one recipe).
// Honey Cinnamon and Ghost Pepper constants are scaffolded for future phases.
// ---------------------------------------------------------------------------

export type RecipeId = "classic_salted" | "honey_cinnamon" | "ghost_pepper";

export interface Recipe {
  readonly id: RecipeId;
  /** Ingredient + additive cost per lb (on top of raw peanut cost). */
  readonly ingredientCostPerLb: number;
  /** Base roast duration per lb for the Tin Pan roaster (seconds in game-time). */
  readonly roastSecondsPerLbTinPan: number;
}

export const RECIPES: Readonly<Record<RecipeId, Recipe>> = {
  classic_salted: {
    id: "classic_salted",
    ingredientCostPerLb: 0.20,  // salt additive; raw $0.40 + $0.20 = $0.60 COGS/lb
    roastSecondsPerLbTinPan: 60, // 10 min for 10 lbs on Tin Pan
  },
  honey_cinnamon: {
    id: "honey_cinnamon",
    ingredientCostPerLb: 0.30,  // honey drizzle + cinnamon; $0.40 + $0.30 = $0.70 COGS/lb
    roastSecondsPerLbTinPan: 72, // 12 min for 10 lbs
  },
  ghost_pepper: {
    id: "ghost_pepper",
    ingredientCostPerLb: 0.50,  // pepper powder + oil; $0.40 + $0.50 = $0.90 COGS/lb
    roastSecondsPerLbTinPan: 90, // 15 min for 10 lbs
  },
} as const;

// ---------------------------------------------------------------------------
// Recipe demand multipliers  (RECIPE_BATCH_UI.md §4)
// Applied on top of base demand curve.  Different recipes serve different
// willingness-to-pay segments; velocity × margin tradeoff is the teaching hook.
//
// TUNABLE: honey_cinnamon 0.75, ghost_pepper 0.40
// ---------------------------------------------------------------------------

export const RECIPE_DEMAND_MULT: Readonly<Record<RecipeId, number>> = {
  classic_salted: 1.00,  // baseline — broadest appeal
  honey_cinnamon: 0.75,  // 25% fewer buyers; sweet-niche segment
  ghost_pepper:   0.40,  // 60% fewer buyers; heat-seeking niche only
} as const;

// ---------------------------------------------------------------------------
// Recipe unlock cash thresholds  (RECIPE_BATCH_UI.md §3)
// Based on cumulative lifetime revenue (lifetimeEarned in SimState).
// classic_salted is available from game start (threshold = 0).
// TUNABLE: honey_cinnamon $500, ghost_pepper $1200
// ---------------------------------------------------------------------------

export const RECIPE_UNLOCK_THRESHOLD: Readonly<Record<RecipeId, number>> = {
  classic_salted: 0,
  honey_cinnamon: 500,
  ghost_pepper:   1200,
} as const;

// ---------------------------------------------------------------------------
// Roaster tiers  (GDD C4)
// Efficiency multiplier applied to roastSecondsPerLbTinPan:
//   Tin Pan = 1.0x (baseline), Copper = 0.6x, Industrial = 0.2x.
// ---------------------------------------------------------------------------

export type RoasterTier = "tin_pan" | "copper" | "industrial";

export const ROASTER_EFFICIENCY: Readonly<Record<RoasterTier, number>> = {
  tin_pan:    1.0,
  copper:     0.6,
  industrial: 0.2,
} as const;

/** Ordered upgrade path: tin_pan → copper → industrial. */
export const ROASTER_TIER_ORDER: readonly RoasterTier[] = [
  "tin_pan",
  "copper",
  "industrial",
] as const;

/**
 * One-time purchase cost to upgrade to each roaster tier (you can never buy the
 * starting tier "tin_pan"). Price 0 is a sentinel — never reachable.
 *
 * Payback calibration (at $1.50 sell price, default demand ~17 lbs/hr):
 *   Daily net ≈ $60–65 on a solid play session with 1 queue slot.
 *   copper ($500): payback ≈ 500 / 62 ≈ ~8 good-session days      → teaches capex ROI
 *   industrial ($2500): payback ≈ 2500 / ~120 ≈ ~21 good-session days (after copper)
 *     (industrial halves roast time again, enabling much higher throughput when
 *      combined with extra queue slots — compounding capital-investment lesson).
 */
export const ROASTER_UPGRADE_COST: Readonly<Record<RoasterTier, number>> = {
  tin_pan:    0,    // starting tier — cannot be purchased
  copper:     500,
  industrial: 2_500,
} as const;

// ---------------------------------------------------------------------------
// Roast queue
// ---------------------------------------------------------------------------

/** Number of simultaneous roast slots available at game start. */
export const STARTING_QUEUE_SLOTS = 1;

/** Maximum purchasable queue slots (total including the starting slot). */
export const MAX_QUEUE_SLOTS = 3;

/**
 * Cost to purchase each additional queue slot beyond the first.
 * Escalating to teach: each unit of parallelism costs more than the last.
 *
 * Payback calibration (at $1.50 price, copper roaster):
 *   Slot 2 ($300): a second parallel batch roughly doubles output capacity
 *     when demand keeps up. Payback ≈ 5–7 good days at +$50–60 extra net/day.
 *   Slot 3 ($600): third slot adds less marginal value at P1 single-district
 *     demand (diminishing returns lesson). Payback ≈ 10–14 days.
 * Index = slot index being purchased (1 = buying the 2nd slot, 2 = 3rd slot).
 */
export const QUEUE_SLOT_COST: readonly number[] = [
  300, // buying slot index 1 (the 2nd slot)
  600, // buying slot index 2 (the 3rd slot)
] as const;

/** Hard minimum batch size (lbs). */
export const BATCH_MIN_LBS = 1;

/** Hard maximum batch size (lbs). */
export const BATCH_MAX_LBS = 100;

// ---------------------------------------------------------------------------
// Weekday demand factors  (GDD C3 — "day of week, season")
// Applied as a multiplier to the base demand curve.
// Factor is VISIBLE and PREDICTABLE (shown in HUD legend — DARK_PATTERN_GATE §A.1
// compliant: no FOMO framing, no "you missed Saturday" messaging).
//
// dayNumber % 7 maps to: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun.
// (Day 1 of the game is a Monday by convention.)
//
// Mild variance (0.85–1.25) teaches weekly rhythm without punishing any given day.
// ---------------------------------------------------------------------------

export const DAY_FACTOR: readonly number[] = [
  0.85, // Monday   — slow start of week
  0.90, // Tuesday  — picking up
  0.95, // Wednesday — mid-week
  1.00, // Thursday — baseline
  1.10, // Friday   — end-of-week boost
  1.25, // Saturday — peak market day
  1.10, // Sunday   — weekend tail
] as const;

/** Human-readable label for each day-of-week index (0=Mon … 6=Sun). */
export const DAY_NAMES: readonly string[] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

// ---------------------------------------------------------------------------
// Pricing bounds  (UI_WIREFRAMES §2 slider spec)
// ---------------------------------------------------------------------------

export const PRICE_MIN = 0.75;  // $ per lb — floor enforced by UI slider
export const PRICE_MAX = 2.50;  // $ per lb — ceiling enforced by UI slider

/** Default sell price at game start — targets ~60 % gross margin on classic_salted. */
export const DEFAULT_SELL_PRICE = 1.50;

// ---------------------------------------------------------------------------
// Demand curve — Farmers' Market, Classic Salted  (GDD C3, Appendix)
// Demand (lbs/hr) = BASE_LBS_PER_HOUR − DEMAND_SLOPE × (price − BASE_PRICE)
// At base price ($1.20):  demand = 20 lbs/hr exactly.
// Demand is clamped to [0, MAX_DEMAND_LBS_PER_HOUR].
//
// Profit maximisation (gross profit, ignoring fixed costs):
//   π(p) = (p − COGS) × demand(p) = (p − 0.60) × (20 − 10 × (p − 1.20))
//   dπ/dp = 0  →  p* = (20/10 + 1.20 + 0.60) / 2 = 1.90
//   p* = $1.90 is strictly interior: PRICE_MIN ($0.75) < $1.90 < PRICE_MAX ($2.50).
// ---------------------------------------------------------------------------

/** Base (reference) price for demand curve calibration. */
export const DEMAND_BASE_PRICE = 1.20;

/** Demand at base price, lbs per simulated hour. */
export const DEMAND_BASE_LBS_PER_HOUR = 20;

/**
 * Slope: how many lbs/hr demand falls per $1 increase in price above base price.
 * SLOPE = 10 gives interior profit peak at p* = $1.90 (see derivation above).
 */
export const DEMAND_SLOPE = 10;

/** Maximum possible demand regardless of price (floor of demand curve). */
export const DEMAND_MAX_LBS_PER_HOUR = 40;

// ---------------------------------------------------------------------------
// Day clock  (GDD D2 walkthrough: 6 am open, 8 pm close)
// All times in simulated seconds. 1 simulated hour = 60 real seconds by default,
// but the engine is parameterised — tests run at 1:1 (1 sim-second = 1 real second).
// ---------------------------------------------------------------------------

/** Length of one operating day in simulated seconds (14 hrs × 3600 = 50 400). */
export const DAY_DURATION_SECONDS = 14 * 3_600;

/**
 * How many simulated seconds pass per real second in GameScene.
 * 1 real second = 60 sim seconds → 1 sim hour = 60 real seconds.
 * Tests run at scale 1 (1:1) for determinism; GameScene multiplies delta by this.
 */
export const SIM_TIME_SCALE = 60;

// ---------------------------------------------------------------------------
// Daily fixed costs  (BUSINESS_CURRICULUM §8 break-even reference)
// $5.00/day covers prorated permit + fuel/propane at P1 scale.
// At default price ($1.50) and COGS ($0.60), gross profit/lb = $0.90.
// Break-even: ceil($5.00 / $0.90) = 6 lbs/day sold. Very achievable — good for onboarding.
// ---------------------------------------------------------------------------

export const DAILY_FIXED_COSTS = 5.00;

// ---------------------------------------------------------------------------
// Starting state
// ---------------------------------------------------------------------------

/** Cash the player begins with. */
export const STARTING_CASH = 50.00;

/** Raw peanuts (lbs) the player begins with. */
export const STARTING_RAW_STOCK_LBS = 20;

// ---------------------------------------------------------------------------
// Offline soft-cap  (GDD C5; DARK_PATTERN_GATE B.2)
// Offline earn rate = 20% of peak on-game rate.
// Hard cap: earnings accrue for at most OFFLINE_CAP_HOURS before the truck "rests."
// NEVER frame this as a loss — the truck rested; it earned what it earned.
// ---------------------------------------------------------------------------

/** Fraction of peak hourly earnings credited during offline time. */
export const OFFLINE_EARN_RATE_FRACTION = 0.20;

/**
 * Absolute ceiling on offline earnings per hour ($).
 * RATIFIED 2026-06-07 by owner (GDD C5 + DARK_PATTERN_GATE B.2): $100/hr is canon.
 * docs/PERSISTENCE.md Q9 and docs/GDD.md C5 both reference this value.
 */
export const OFFLINE_CAP_DOLLARS_PER_HOUR = 100;

/** Maximum hours offline that generate earnings (after this, truck rests). */
export const OFFLINE_CAP_HOURS = 24;

// ---------------------------------------------------------------------------
// Rescue arc trigger  (GDD F — no bankruptcy, no game-over)
// ---------------------------------------------------------------------------

/**
 * End-of-day cash threshold for the rescue arc.
 * If cash at the END OF DAY is below this value, rescueArcPending is set true;
 * if end-of-day cash is >= this value, the flag clears (proactive but not hair-trigger).
 * Evaluated only once per day at endOfDay — NOT on every purchase or tick.
 */
export const RESCUE_ARC_CASH_THRESHOLD = 25;

// ---------------------------------------------------------------------------
// Legume Lore gag mechanic  (Wave 2)
// One gag fires roughly every GAG_EVERY_N_LBS_SOLD lbs of cumulative sales.
//
// Calibration (14-hr day at default price $1.50, demand = 20 − 10×(1.50−1.20) = ~17 lbs/hr):
//   Expected daily sales ≈ 238 lbs  →  238 / 80 ≈ 3 gags per day.
//   Bounds guaranteed by tests: ≥1 and ≤6 on a full default-price day.
// ---------------------------------------------------------------------------

/** Emit one 'gag' SimEvent per this many cumulative lbs sold (whole-game counter). */
export const GAG_EVERY_N_LBS_SOLD = 80;

// ---------------------------------------------------------------------------
// Rescue arc constants  (RESCUE_ARC_SCRIPT.md — Wave 5)
// All numbers derive from the script; do not hardcode elsewhere.
// ---------------------------------------------------------------------------

/** Path 1 — Old Joe Fair Loan: cash advanced. */
export const RESCUE_LOAN_PRINCIPAL = 75;
/** Path 1 — Old Joe Fair Loan: flat interest rate per season (5%). */
export const RESCUE_LOAN_FEE_RATE = 0.05;
/** Path 1 — Old Joe Fair Loan: repayment window in game-days. */
export const RESCUE_LOAN_DUE_DAYS = 14;

/** Path 2 — Marta's Supplier Credit: raw peanuts credited (lbs at $0.40 base). */
export const RESCUE_CREDIT_RAW_LBS = 125;
/** Path 2 — Marta's Supplier Credit: dollar amount due (= 125 lbs × $0.40). */
export const RESCUE_CREDIT_AMOUNT_DUE = 50;
/** Path 2 — Marta's Supplier Credit: repayment window in game-days. */
export const RESCUE_CREDIT_DUE_DAYS = 14;

/** Path 3 — Derek's Pre-Order: lbs of roasted peanuts to deliver. */
export const RESCUE_PREORDER_LBS = 100;
/** Path 3 — Derek's Pre-Order: cash received upfront. */
export const RESCUE_PREORDER_CASH = 110;
/** Path 3 — Derek's Pre-Order: delivery window in game-days. */
export const RESCUE_PREORDER_DUE_DAYS = 7;

/** Path 4 — QuickNut Payday: cash advanced. */
export const RESCUE_PAYDAY_PRINCIPAL = 50;
/** Path 4 — QuickNut Payday: flat fee per 14-day period. */
export const RESCUE_PAYDAY_FEE = 7.50;
/** Path 4 — QuickNut Payday: repayment window in game-days per period. */
export const RESCUE_PAYDAY_DUE_DAYS = 14;

// ---------------------------------------------------------------------------
// Ledger v1 — daily P&L bookkeeping  (GDD D2 end-of-day report; seed for the
// P2 dual-ledger system referenced in GDD F)
// ---------------------------------------------------------------------------

/** Maximum LedgerEntry rows retained in SimState.ledger (ring buffer). */
export const LEDGER_MAX_DAYS = 30;

/** Weekly recap cadence: a recap is attached to every Nth day's DayReport. */
export const WEEK_RECAP_EVERY_DAYS = 7;

// ---------------------------------------------------------------------------
// "Legumes. Not Nuts." brand campaign  (GDD B4 — the gag flipped into brand)
//
// Unlocks when the player has collected BRAND_CAMPAIGN_LORE_THRESHOLD unique
// Legume Lore entries (mid-game per GDD B4: "25+ collected"). One-time
// purchase; permanent. NOT a FOMO mechanic: no timer, no expiry, no streak —
// the unlock waits forever once earned (DARK_PATTERN_GATE A.1/A.4 compliant).
//
// Effect: +5% price tolerance — customers accept a base price 5% higher, i.e.
// the demand curve's reference price shifts from $1.20 to $1.26. This teaches
// brand equity: identity investment raises willingness-to-pay.
//
// Payback honesty (stylized numbers): at the post-campaign optimum (~$1.93)
// gross profit rises ~5% (~$11/day at full uptime) → ~3-week payback on $250.
// (GDD B4's "+15% in Boardwalk/Downtown" is the P2 district half — deferred.)
// ---------------------------------------------------------------------------

/** Unique lore entries required before the campaign can be purchased. */
export const BRAND_CAMPAIGN_LORE_THRESHOLD = 25;

/** One-time cost of the brand campaign ($). */
export const BRAND_CAMPAIGN_COST = 250;

/** Fractional shift in the demand curve's base (reference) price. */
export const BRAND_CAMPAIGN_PRICE_TOLERANCE = 0.05;
