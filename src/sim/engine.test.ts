/**
 * engine.test.ts — Vitest suite for the P1 idle simulation core.
 *
 * Coverage targets (per task spec):
 *   1. Determinism           — same seed → same outcome across two runs
 *   2. Margin math           — worked example matching economy.ts numbers
 *   3. Price elasticity      — higher price → fewer units; revenue peaks in-bounds
 *   4. Offline cap           — earnings stop at cap; never negative; correct framing
 *   5. No-bankruptcy         — cash floor at 0, rescueArcPending flag (< $50 threshold), never < 0
 *   6. Spoilage              — TODO (GDD has it; deferred to P2 — see engine.ts SCOPE NOTES)
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  tick,
  buyRaw,
  startRoast,
  setPrice,
  endOfDay,
  applyOffline,
} from "./engine.js";
import {
  DEFAULT_SELL_PRICE,
  DAILY_FIXED_COSTS,
  RAW_PEANUT_BASE_PRICE,
  RECIPES,
  OFFLINE_CAP_HOURS,
  OFFLINE_CAP_DOLLARS_PER_HOUR,
  PRICE_MIN,
  PRICE_MAX,
  STARTING_CASH,
  STARTING_RAW_STOCK_LBS,
  RESCUE_ARC_CASH_THRESHOLD,
} from "../data/economy.js";

// ---------------------------------------------------------------------------
// 1. Determinism
// ---------------------------------------------------------------------------

describe("determinism", () => {
  it("same seed produces identical state after many ticks", () => {
    const stateA = createState(42);
    const stateB = createState(42);

    // Buy stock and roast a batch on both
    buyRaw(stateA, 50);
    buyRaw(stateB, 50);
    startRoast(stateA, 0, "classic_salted", 20);
    startRoast(stateB, 0, "classic_salted", 20);

    // Tick 120 times (2 minutes of game-time each = 4 hours total)
    for (let i = 0; i < 120; i++) {
      tick(stateA, 120);
      tick(stateB, 120);
    }

    expect(stateA.cash).toBeCloseTo(stateB.cash, 8);
    expect(stateA.roastedStockLbs).toBeCloseTo(stateB.roastedStockLbs, 8);
    expect(stateA.rngState).toBe(stateB.rngState);
  });

  it("different seeds produce different outcomes after enough ticks", () => {
    const stateA = createState(1);
    const stateB = createState(9999);

    // Pre-load roasted stock so demand jitter fires every tick
    stateA.roastedStockLbs = 10_000;
    stateB.roastedStockLbs = 10_000;

    for (let i = 0; i < 500; i++) {
      tick(stateA, 60);
      tick(stateB, 60);
    }

    // The demand jitter (±10%, triangular) means revenue diverges across seeds
    expect(stateA.dayStats.revenue).not.toBeCloseTo(stateB.dayStats.revenue, 2);
  });
});

// ---------------------------------------------------------------------------
// 2. Margin math — worked example
//
// Setup: 20 lbs raw stock (free at game start), roast 10 lbs Classic Salted.
// COGS per lb:  RAW_PEANUT_BASE_PRICE ($0.40) + ingredientCostPerLb ($0.20) = $0.60
// Sell price:   $1.50 (DEFAULT_SELL_PRICE)
// Gross margin: ($1.50 – $0.60) / $1.50 = 60.0%
//
// If we sell exactly 10 lbs at $1.50:
//   Revenue     = 10 × $1.50 = $15.00
//   COGS        = 10 × $0.60 = $6.00
//   Gross Profit = $15.00 – $6.00 = $9.00
//   Gross Margin = $9.00 / $15.00 = 60.0%
//   Fixed Costs  = $5.00 (DAILY_FIXED_COSTS)
//   Net          = $9.00 – $5.00 = $4.00
// ---------------------------------------------------------------------------

describe("margin math (worked example)", () => {
  const COGS_PER_LB =
    RAW_PEANUT_BASE_PRICE + RECIPES["classic_salted"].ingredientCostPerLb;
  const SELL_LBS = 10;
  const SELL_PRICE = DEFAULT_SELL_PRICE; // $1.50
  const EXPECTED_REVENUE = SELL_LBS * SELL_PRICE;       // $15.00
  const EXPECTED_COGS    = SELL_LBS * COGS_PER_LB;      // $6.00
  const EXPECTED_GROSS   = EXPECTED_REVENUE - EXPECTED_COGS; // $9.00
  const EXPECTED_MARGIN  = EXPECTED_GROSS / EXPECTED_REVENUE; // 0.60
  const EXPECTED_NET     = EXPECTED_GROSS - DAILY_FIXED_COSTS; // $4.00

  it("COGS per lb is $0.60 for Classic Salted", () => {
    expect(COGS_PER_LB).toBeCloseTo(0.60, 5);
  });

  it("gross margin at default price is 60%", () => {
    expect(EXPECTED_MARGIN).toBeCloseTo(0.60, 5);
  });

  it("net profit for 10 lbs sold at $1.50 minus $5 fixed = $4.00", () => {
    expect(EXPECTED_NET).toBeCloseTo(4.00, 5);
  });

  it("endOfDay report reflects the worked-example numbers", () => {
    // Inject a state where exactly SELL_LBS lbs were sold at SELL_PRICE.
    const state = createState(1);
    // Override day stats directly to simulate a known-exact sale.
    state.dayStats.revenue   = EXPECTED_REVENUE;
    state.dayStats.cogsTotal = EXPECTED_COGS;
    state.dayStats.unitsSold = SELL_LBS;

    const report = endOfDay(state);

    expect(report.revenue).toBeCloseTo(EXPECTED_REVENUE, 5);
    expect(report.cogs).toBeCloseTo(EXPECTED_COGS, 5);
    expect(report.grossProfit).toBeCloseTo(EXPECTED_GROSS, 5);
    expect(report.grossMarginPct).toBeCloseTo(EXPECTED_MARGIN * 100, 2);
    expect(report.fixedCosts).toBeCloseTo(DAILY_FIXED_COSTS, 5);
    expect(report.net).toBeCloseTo(EXPECTED_NET, 5);
  });

  it("mispriced day (price below COGS) produces negative net", () => {
    const state = createState(1);
    const misPrice = 0.50; // below $0.60 COGS
    const sellLbs = 10;
    state.dayStats.revenue   = sellLbs * misPrice;          // $5.00
    state.dayStats.cogsTotal = sellLbs * COGS_PER_LB;       // $6.00
    state.dayStats.unitsSold = sellLbs;

    const report = endOfDay(state);
    expect(report.grossProfit).toBeLessThan(0);
    expect(report.net).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Price elasticity
// ---------------------------------------------------------------------------

describe("price elasticity", () => {
  /**
   * Helper: sell for one in-game hour (3600 ticks of 1s each) at a given price.
   * Returns units sold. Uses seed=1 for reproducibility.
   * The roast is pre-loaded so stock is never the bottleneck.
   */
  function simulateHourSales(price: number): number {
    const state = createState(1);
    // Give plenty of roasted stock directly
    state.roastedStockLbs = 10_000;
    setPrice(state, price);
    for (let t = 0; t < 3600; t++) {
      tick(state, 1);
    }
    return state.dayStats.unitsSold;
  }

  it("raising price from base lowers units sold", () => {
    const unitsLow  = simulateHourSales(PRICE_MIN);   // $0.75 — high demand
    const unitsHigh = simulateHourSales(PRICE_MAX);   // $2.50 — low demand
    expect(unitsLow).toBeGreaterThan(unitsHigh);
  });

  it("demand is non-negative at all valid prices", () => {
    for (const price of [PRICE_MIN, 1.00, 1.20, DEFAULT_SELL_PRICE, 2.00, PRICE_MAX]) {
      const units = simulateHourSales(price);
      expect(units).toBeGreaterThanOrEqual(0);
    }
  });

  it("revenue peaks somewhere between PRICE_MIN and PRICE_MAX", () => {
    // Sweep prices and confirm the maximum revenue is inside bounds, not at either extreme.
    const prices = [0.75, 0.90, 1.05, 1.20, 1.35, 1.50, 1.65, 1.80, 2.00, 2.25, 2.50];
    const revenues = prices.map((p) => {
      const state = createState(1);
      state.roastedStockLbs = 10_000;
      setPrice(state, p);
      for (let t = 0; t < 3600; t++) tick(state, 1);
      return state.dayStats.revenue;
    });

    const maxRevIdx = revenues.indexOf(Math.max(...revenues));
    // Max revenue should not be at the extreme ends (index 0 or last)
    expect(maxRevIdx).toBeGreaterThan(0);
    expect(maxRevIdx).toBeLessThan(prices.length - 1);
  });
});

// ---------------------------------------------------------------------------
// 4. Offline soft-cap
// ---------------------------------------------------------------------------

describe("offline soft-cap", () => {
  it("earnings stop after OFFLINE_CAP_HOURS", () => {
    const stateA = createState(1);
    stateA.roastedStockLbs = 100_000;

    const stateB = createState(1);
    stateB.roastedStockLbs = 100_000;

    const evA = applyOffline(stateA, OFFLINE_CAP_HOURS);
    const evB = applyOffline(stateB, OFFLINE_CAP_HOURS + 100); // extra hours — capped

    // Both should earn the same amount (cap kicks in)
    expect((evA.detail.earned as number)).toBeCloseTo(evB.detail.earned as number, 4);
  });

  it("offline earnings are never negative", () => {
    const state = createState(1);
    state.roastedStockLbs = 0; // no stock → nothing to sell
    const ev = applyOffline(state, 5);
    expect(ev.detail.earned as number).toBeGreaterThanOrEqual(0);
    expect(state.cash).toBeGreaterThanOrEqual(0);
  });

  it("per-hour earnings never exceed OFFLINE_CAP_DOLLARS_PER_HOUR", () => {
    const state = createState(1);
    state.roastedStockLbs = 1_000_000; // unlimited stock
    state.sellPrice = PRICE_MAX;        // max price → max theoretical earn rate

    const ev = applyOffline(state, 1);
    const earnedPerHour = ev.detail.earned as number;
    expect(earnedPerHour).toBeLessThanOrEqual(OFFLINE_CAP_DOLLARS_PER_HOUR + 0.001);
  });

  it("return message says 'Truck rested', not loss-framing", () => {
    const state = createState(1);
    state.roastedStockLbs = 500;
    const ev = applyOffline(state, 3);
    const msg = ev.detail.message as string;
    expect(msg).toMatch(/Truck rested/i);
    expect(msg).not.toMatch(/lost/i);
    expect(msg).not.toMatch(/missed/i);
  });
});

// ---------------------------------------------------------------------------
// 5. No-bankruptcy invariant
// ---------------------------------------------------------------------------

describe("no-bankruptcy invariant", () => {
  it("cash never goes below 0 after a costly buy order", () => {
    const state = createState(1);
    state.cash = 1.00; // nearly broke
    // Try to buy 1000 lbs at $0.40/lb = $400 — far more than $1
    const result = buyRaw(state, 1000);
    expect(result).toBeNull(); // purchase rejected — insufficient funds
    expect(state.cash).toBeGreaterThanOrEqual(0);
  });

  it("rescueArcPending is set when cash falls below RESCUE_ARC_CASH_THRESHOLD", () => {
    const state = createState(1);
    state.cash = RESCUE_ARC_CASH_THRESHOLD - 0.01; // just below threshold
    // endOfDay deducts DAILY_FIXED_COSTS — cash stays below threshold, flag triggers
    endOfDay(state);
    expect(state.rescueArcPending).toBe(true);
    expect(state.cash).toBeGreaterThanOrEqual(0); // cash is floored at 0, not at threshold
  });

  it("rescueArcPending is set proactively before cash hits zero", () => {
    // Rescue arc triggers at < $50, not just at $0 (proactive cash-flow lesson)
    const state = createState(1);
    state.cash = 30.00; // below $50 threshold, above $0
    state.dayStats.revenue   = 0;
    state.dayStats.cogsTotal = 0;
    state.dayStats.unitsSold = 0;
    endOfDay(state);
    expect(state.rescueArcPending).toBe(true);
    expect(state.cash).toBeGreaterThanOrEqual(0);
  });

  it("cash stays at 0 after end-of-day on an empty day with insufficient cash", () => {
    const state = createState(1);
    state.cash = 3.00;  // less than DAILY_FIXED_COSTS ($5)
    state.dayStats.revenue   = 0;
    state.dayStats.cogsTotal = 0;
    state.dayStats.unitsSold = 0;
    endOfDay(state);
    expect(state.cash).toBe(0);
    expect(state.rescueArcPending).toBe(true);
  });

  it("tick() never produces negative cash", () => {
    const state = createState(1);
    state.cash = 0;
    state.roastedStockLbs = 0;
    for (let i = 0; i < 100; i++) tick(state, 60);
    expect(state.cash).toBeGreaterThanOrEqual(0);
  });

  it("startRoast rejects when cash < ingredient cost", () => {
    const state = createState(1);
    state.rawStockLbs = 100;
    state.cash = 0.01; // far below ingredient cost
    const ev = startRoast(state, 0, "classic_salted", 10);
    expect(ev).toBeNull();
    expect(state.cash).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Integration smoke test — a full day cycle
// ---------------------------------------------------------------------------

describe("full day cycle integration", () => {
  it("a profitable day advances day number and updates cash correctly", () => {
    const state = createState(7);

    // Pre-load roasted stock (bypass roast for speed)
    state.roastedStockLbs = 50;
    const cashStart = state.cash;
    const dayStart  = state.dayNumber;

    // Tick a few hundred seconds — generate some sales
    for (let i = 0; i < 600; i++) tick(state, 10);

    // Some stock should have sold
    expect(state.dayStats.unitsSold).toBeGreaterThan(0);
    expect(state.dayStats.revenue).toBeGreaterThan(0);
    // Cash goes up (revenue credited in tick)
    expect(state.cash).toBeGreaterThan(cashStart);

    const report = endOfDay(state);
    expect(report.dayNumber).toBe(dayStart);
    expect(state.dayNumber).toBe(dayStart + 1);
    // After endOfDay, day stats are reset
    expect(state.dayStats.unitsSold).toBe(0);
    expect(state.dayStats.revenue).toBe(0);
  });

  it("setPrice clamps to valid range", () => {
    const state = createState(1);
    setPrice(state, -99);
    expect(state.sellPrice).toBe(PRICE_MIN);
    setPrice(state, 999);
    expect(state.sellPrice).toBe(PRICE_MAX);
  });

  it("buyRaw applies correct bulk discount at 100+ lbs", () => {
    const state = createState(1);
    state.cash = 1_000;
    const before = state.cash;
    const ev = buyRaw(state, 100);
    expect(ev).not.toBeNull();
    // 100 lbs at $0.40 × (1–0.05) = $0.38/lb → $38.00
    expect(before - state.cash).toBeCloseTo(38.00, 5);
  });

  it("startRoast deducts raw stock and ingredient cost immediately", () => {
    const state = createState(1);
    state.cash = STARTING_CASH;
    state.rawStockLbs = STARTING_RAW_STOCK_LBS; // 20 lbs

    const ingredientCostFor10 = RECIPES["classic_salted"].ingredientCostPerLb * 10; // $2.00
    const ev = startRoast(state, 0, "classic_salted", 10);

    expect(ev).not.toBeNull();
    expect(state.rawStockLbs).toBeCloseTo(STARTING_RAW_STOCK_LBS - 10, 5);
    expect(state.cash).toBeCloseTo(STARTING_CASH - ingredientCostFor10, 5);
  });
});

// ---------------------------------------------------------------------------
// 7. Spoilage — DEFERRED
// ---------------------------------------------------------------------------

// TODO (P2): Implement and test roasted-stock spoilage per GDD C2/Appendix.
//   - Raw peanuts stored >60 days degrade; >90 days = 100% loss.
//   - Roasted stock spoilage is a separate simpler model (shorter shelf-life).
//   - Deferred because P1 operates within a single day slice; cross-day inventory
//     persistence and the day-counter-based spoilage check are P2 scope.
//   See also: UI_WIREFRAMES §3 spoilage warning tooltip.
