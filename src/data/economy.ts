/**
 * economy.ts — single source of truth for all P1 economy constants.
 *
 * IMPORTANT: These are stylized in-game values; real-world reference =
 * docs/BUSINESS_CURRICULUM.md. Numbers are internally consistent:
 *   - Classic Salted COGS $0.60/lb, default sell $1.50/lb → 60% gross margin.
 *     (The in-game 60% margin is the stylized teaching figure; BUSINESS_CURRICULUM §2
 *      cites 65–72% as the real-world food-truck benchmark.)
 *   - A "mispriced" day at $0.70/lb (below COGS) visibly loses money.
 *   - Daily fixed costs of $5.00 require ~13 lbs/day sold at default price to break even.
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
// Demand = BASE_DEMAND_LBS_PER_HOUR * (1 - PRICE_ELASTICITY * (price - BASE_PRICE))
// At default price: demand = 20 lbs/hr exactly.
// Demand is clamped to [0, MAX_DEMAND_LBS_PER_HOUR].
// ---------------------------------------------------------------------------

/** Base (reference) price for demand curve calibration. */
export const DEMAND_BASE_PRICE = 1.20;

/** Demand at base price, lbs per simulated hour. */
export const DEMAND_BASE_LBS_PER_HOUR = 20;

/**
 * Elasticity factor: how many lbs/hr demand changes per $1 above/below base price.
 * Calibrated so raising from $1.20 to $2.00 drops demand by ~8 lbs/hr (≈ –5/hr/$).
 * GDD example: $2.00 → ~15 units/hr (–5 from base 20). That's –5/0.80 ≈ 6.25/$/hr.
 * We use 6.0 for clean numbers.
 */
export const DEMAND_ELASTICITY = 6.0;

/** Maximum possible demand regardless of price (floor of demand curve). */
export const DEMAND_MAX_LBS_PER_HOUR = 40;

// ---------------------------------------------------------------------------
// Day clock  (GDD D2 walkthrough: 6 am open, 8 pm close)
// All times in simulated seconds. 1 simulated hour = 60 real seconds by default,
// but the engine is parameterised — tests run at 1:1 (1 sim-second = 1 real second).
// ---------------------------------------------------------------------------

/** Length of one operating day in simulated seconds (14 hrs × 3600 = 50 400). */
export const DAY_DURATION_SECONDS = 14 * 3_600;

// ---------------------------------------------------------------------------
// Daily fixed costs  (BUSINESS_CURRICULUM §8 break-even reference)
// $5.00/day covers prorated permit + fuel/propane at P1 scale.
// At default price ($1.50) and COGS ($0.60), gross profit/lb = $0.90.
// Break-even: ceil($5.00 / $0.90) = 6 lbs/day. Very achievable — good for onboarding.
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

/** Absolute ceiling on offline earnings per hour ($). */
export const OFFLINE_CAP_DOLLARS_PER_HOUR = 100;

/** Maximum hours offline that generate earnings (after this, truck rests). */
export const OFFLINE_CAP_HOURS = 24;

// ---------------------------------------------------------------------------
// Rescue arc trigger  (GDD F — no bankruptcy, no game-over)
// ---------------------------------------------------------------------------

// GDD F: rescue arc triggers BEFORE insolvency (<$50) — proactive cash-flow lesson, never a game-over
/** If cash falls to or below this value, state.rescueArcPending is set to true. */
export const RESCUE_ARC_CASH_THRESHOLD = 50;
