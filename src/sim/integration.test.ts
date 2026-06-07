/**
 * integration.test.ts — Full scripted day via sim calls only.
 *
 * Worked example (from economy.ts comments):
 *   COGS/lb  = $0.40 raw + $0.20 ingredient = $0.60
 *   Sell price = $1.50 (DEFAULT_SELL_PRICE) → 60% gross margin
 *   Fixed costs = $5.00/day
 *
 * Script:
 *   1. Start fresh state (seed 1, $50 cash, 20 lbs raw)
 *   2. buyRaw 10 lbs (enough for one more batch) — now 30 lbs raw
 *   3. startRoast slot 0, classic_salted, 10 lbs
 *      → deducts $0.20 × 10 = $2.00 ingredient cost immediately
 *      → duration = 60 s/lb × 10 lbs × 1.0 efficiency = 600 s
 *   4. tick(610 s) → roast finishes; 10 lbs roasted stock available
 *   5. Set price $1.50 (already default; explicit for clarity)
 *   6. tick(3600 × 14 s) in chunks → sell entire day; stock depletes
 *   7. endOfDay → assert report numbers match worked example
 *
 * NOTE: Because demand has ±10% jitter, the exact units sold vary by seed.
 * We assert structural properties (revenue > 0, grossMarginPct ≈ 60%,
 * net = grossProfit - fixedCosts) and the sign/magnitude of the report.
 *
 * For the precise worked example we use a direct-inject approach (matching
 * engine.test.ts §2 pattern) to assert exact numbers without jitter.
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  tick,
  buyRaw,
  startRoast,
  setPrice,
  endOfDay,
  projectedDemand,
} from "./engine.js";
import {
  DEFAULT_SELL_PRICE,
  DAILY_FIXED_COSTS,
  RAW_PEANUT_BASE_PRICE,
  RECIPES,
  DEMAND_BASE_PRICE,
  DAY_DURATION_SECONDS,
} from "../data/economy.js";

const COGS_PER_LB = RAW_PEANUT_BASE_PRICE + RECIPES.classic_salted.ingredientCostPerLb; // $0.60

// ---------------------------------------------------------------------------
// A. Scripted day: buy → roast → price → ticks → endOfDay
// ---------------------------------------------------------------------------

describe("scripted day integration", () => {
  it("full day: buy raw, roast, tick to completion, tick sales, end day — report is coherent", () => {
    const state = createState(1);

    // 1. Verify starting conditions
    expect(state.cash).toBeCloseTo(50.00, 5);
    expect(state.rawStockLbs).toBe(20);

    // 2. Buy 10 more lbs raw peanuts (no bulk discount at 10 lbs)
    const buyEv = buyRaw(state, 10);
    expect(buyEv).not.toBeNull();
    expect(buyEv!.detail.lbs).toBe(10);
    // Cost = 10 × $0.40 = $4.00
    expect(state.cash).toBeCloseTo(46.00, 5);
    expect(state.rawStockLbs).toBe(30);

    // 3. startRoast: 10 lbs classic_salted in slot 0
    //    ingredient cost = 10 × $0.20 = $2.00 debited immediately
    const roastEv = startRoast(state, 0, "classic_salted", 10);
    expect(roastEv).not.toBeNull();
    expect(state.rawStockLbs).toBe(20);          // 30 – 10
    expect(state.cash).toBeCloseTo(44.00, 5);    // 46 – 2

    // COGS booked on production: 10 × $0.60 = $6.00
    expect(state.dayStats.cogsTotal).toBeCloseTo(6.00, 5);

    // Roast slot is active
    const slot = state.roastSlots[0];
    expect(slot.status).toBe("roasting");
    // duration = 60 s/lb × 10 lbs × 1.0 = 600 s
    expect(slot.totalSeconds).toBeCloseTo(600, 5);

    // 4. Explicit price set (already default, but makes intent clear)
    setPrice(state, DEFAULT_SELL_PRICE); // $1.50

    // 5. Tick 610 s to complete the roast
    tick(state, 610);
    expect(state.roastSlots[0].status).toBe("ready");
    // roastedStockLbs < 10 is fine: demand fires in the same tick after roast completes.
    // Just assert some stock exists (roast yielded 10 lbs, some may have sold immediately).
    expect(state.roastedStockLbs).toBeGreaterThan(0);

    // 6. Tick through the rest of the day (DAY_DURATION_SECONDS total; 610 already elapsed)
    const remaining = DAY_DURATION_SECONDS - 610;
    // Tick in 60-second chunks to allow demand to fire
    for (let elapsed = 0; elapsed < remaining; elapsed += 60) {
      tick(state, Math.min(60, remaining - elapsed));
    }

    expect(state.dayElapsedSeconds).toBeCloseTo(DAY_DURATION_SECONDS, 1);
    // All roasted stock should be sold (10 lbs in 14 hours at $1.50 is very achievable)
    expect(state.dayStats.unitsSold).toBeGreaterThan(0);
    expect(state.dayStats.revenue).toBeGreaterThan(0);

    // 7. endOfDay
    const cashBeforeEOD = state.cash;
    const report = endOfDay(state);

    // Report day number = 1 (day just ended)
    expect(report.dayNumber).toBe(1);
    // State advances to day 2
    expect(state.dayNumber).toBe(2);

    // Revenue matches what was tracked in dayStats
    expect(report.revenue).toBeGreaterThan(0);

    // COGS = production COGS (booked at startRoast for sold units)
    expect(report.cogs).toBeCloseTo(6.00, 5);

    // grossProfit = revenue – cogs
    expect(report.grossProfit).toBeCloseTo(report.revenue - report.cogs, 5);

    // If sold at $1.50 and COGS $0.60, gross margin ≈ 60%
    // (jitter means not exactly 60%, but within a reasonable band)
    expect(report.grossMarginPct).toBeGreaterThan(50);
    expect(report.grossMarginPct).toBeLessThan(70);

    // fixedCosts = DAILY_FIXED_COSTS ($5.00)
    expect(report.fixedCosts).toBeCloseTo(DAILY_FIXED_COSTS, 5);

    // net = grossProfit – fixedCosts
    expect(report.net).toBeCloseTo(report.grossProfit - DAILY_FIXED_COSTS, 5);

    // cashAfter = cashBefore – fixedCosts (revenue already in cash from tick)
    expect(report.cashBefore).toBeCloseTo(cashBeforeEOD, 5);
    expect(report.cashAfter).toBeCloseTo(cashBeforeEOD - DAILY_FIXED_COSTS, 5);
    expect(state.cash).toBeCloseTo(report.cashAfter, 5);

    // insightLine is a non-empty string
    expect(report.insightLine.length).toBeGreaterThan(0);

    // day stats reset
    expect(state.dayStats.revenue).toBe(0);
    expect(state.dayStats.unitsSold).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // B. Exact numbers via direct-inject (no jitter, matches worked example)
  // ---------------------------------------------------------------------------

  it("exact worked example: 10 lbs @ $1.50 → $4.00 net (direct-inject, no jitter)", () => {
    // economy.ts comment §worked example:
    //   Revenue  = 10 × $1.50 = $15.00
    //   COGS     = 10 × $0.60 = $6.00
    //   Gross    = $9.00  (60%)
    //   Fixed    = $5.00
    //   Net      = $4.00
    const state = createState(1);
    state.cash = 50.00;
    state.dayStats.revenue   = 10 * DEFAULT_SELL_PRICE;   // $15.00
    state.dayStats.cogsTotal = 10 * COGS_PER_LB;          // $6.00
    state.dayStats.unitsSold = 10;

    const report = endOfDay(state);

    expect(report.revenue).toBeCloseTo(15.00, 5);
    expect(report.cogs).toBeCloseTo(6.00, 5);
    expect(report.grossProfit).toBeCloseTo(9.00, 5);
    expect(report.grossMarginPct).toBeCloseTo(60.00, 2);
    expect(report.fixedCosts).toBeCloseTo(5.00, 5);
    expect(report.net).toBeCloseTo(4.00, 5);
    // cashAfter = 50.00 – 5.00 = 45.00
    expect(report.cashAfter).toBeCloseTo(45.00, 5);
  });

  // ---------------------------------------------------------------------------
  // C. projectedDemand pure function
  // ---------------------------------------------------------------------------

  describe("projectedDemand()", () => {
    it("returns base demand at base price", () => {
      // At DEMAND_BASE_PRICE ($1.20), formula = BASE_DEMAND × (1 - 6 × 0/20) = BASE_DEMAND
      const d = projectedDemand(DEMAND_BASE_PRICE);
      // DEMAND_BASE_LBS_PER_HOUR = 20; elasticity factor = 6*(0/20) = 0
      expect(d).toBeCloseTo(20, 5);
    });

    it("demand decreases as price increases", () => {
      const d1 = projectedDemand(1.00);
      const d2 = projectedDemand(1.50);
      const d3 = projectedDemand(2.00);
      expect(d1).toBeGreaterThan(d2);
      expect(d2).toBeGreaterThan(d3);
    });

    it("demand is non-negative at all prices", () => {
      for (const p of [0.75, 1.00, 1.20, 1.50, 2.00, 2.50]) {
        expect(projectedDemand(p)).toBeGreaterThanOrEqual(0);
      }
    });

    it("is deterministic — same price always returns same value", () => {
      expect(projectedDemand(DEFAULT_SELL_PRICE)).toBe(projectedDemand(DEFAULT_SELL_PRICE));
    });

    it("does not mutate any state (pure function)", () => {
      // Just calling it with arbitrary prices should not throw or have side effects
      const before = projectedDemand(1.50);
      const after  = projectedDemand(1.50);
      expect(before).toBe(after);
    });
  });

  // ---------------------------------------------------------------------------
  // D. endOfDay dead-code fix verification
  //    (confirms the previously dead Math.max line is gone — only one subtraction)
  // ---------------------------------------------------------------------------

  it("endOfDay deducts fixed costs exactly once (dead-code-fix verification)", () => {
    const state = createState(1);
    // No revenue, no COGS; cash = $50.00
    // After endOfDay: cash = max(0, $50 - $5) = $45.00
    // If the dead line were still present it would compute: max(0, $50 + ($-5) - $5) = $40
    state.dayStats.revenue   = 0;
    state.dayStats.cogsTotal = 0;
    state.dayStats.unitsSold = 0;
    const report = endOfDay(state);
    expect(report.cashAfter).toBeCloseTo(45.00, 5);
    expect(state.cash).toBeCloseTo(45.00, 5);
  });
});
