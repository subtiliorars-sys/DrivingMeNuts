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

// ---------------------------------------------------------------------------
// Roast queue
// ---------------------------------------------------------------------------

/** Number of simultaneous roast slots available at game start. */
export const STARTING_QUEUE_SLOTS = 1;

/** Hard minimum batch size (lbs). */
export const BATCH_MIN_LBS = 1;

/** Hard maximum batch size (lbs). */
export const BATCH_MAX_LBS = 100;

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
 * NOTE: canon docs (GDD C5) cite "$100/min" as the ceiling; this constant is
 * deliberately 60× stricter ($100/hr) to limit offline catch-up at P1 scale.
 * Reconcile with canon before P2 wires the full offline system.
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
