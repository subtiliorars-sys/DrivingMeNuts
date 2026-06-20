/**
 * integration.test.ts — Full scripted day via sim calls only.
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  tick,
  buyRaw,
  startRoast,
  setPrice,
  endOfDay,
} from "./engine.js";
import {
  DEFAULT_SELL_PRICE,
  DAILY_FIXED_COSTS,
  DAY_DURATION_SECONDS,
} from "../data/economy.js";

// ---------------------------------------------------------------------------
// A. Scripted day: buy → roast → price → ticks → endOfDay
// ---------------------------------------------------------------------------

describe("scripted day integration", () => {
  it("full day: buy raw, roast, tick to completion, tick sales, end day — report is coherent", () => {
    const state = createState(1);

    // 1. Verify starting conditions
    expect(state.cash).toBeCloseTo(50.00, 5);
    expect(state.rawStockLbs).toBe(20);

    // 2. Buy 10 more units raw peanuts (no bulk discount at 10 lbs)
    const buyEv = buyRaw(state, 10);
    expect(buyEv).not.toBeNull();
    expect(buyEv!.detail.lbs).toBe(10);
    // Cost = 10 × $0.32 = $3.20
    expect(state.cash).toBeCloseTo(46.80, 5);
    expect(state.rawStockLbs).toBe(30);

    // 3. startRoast: 10 units classic_salted in slot 0
    //    ingredient cost = 10 × $0.10 = $1.00 debited immediately
    const roastEv = startRoast(state, 0, "classic_salted", 10);
    expect(roastEv).not.toBeNull();
    expect(state.rawStockLbs).toBe(20);          // 30 – 10
    expect(state.cash).toBeCloseTo(45.80, 5);    // 46.8 – 1

    // F1: cash outflow booked on production: 10 × $0.42 = $4.20 tracked in cashSpentOnProduction
    expect(state.dayStats.cashSpentOnProduction).toBeCloseTo(4.20, 5);
    expect(state.dayStats.cogsTotal).toBeCloseTo(0, 5);

    // Roast slot is active
    const slot = state.roastSlots[0];
    expect(slot.status).toBe("roasting");
    // duration = 60 s/lb × 10 units × 1.0 = 600 s
    expect(slot.totalSeconds).toBeCloseTo(600, 5);

    // 4. Explicit price set (already default, but makes intent clear)
    setPrice(state, DEFAULT_SELL_PRICE); // $1.50

    // 5. Tick 610 s to complete the roast
    tick(state, 610);
    expect(state.roastSlots[0].status).toBe("ready");
    expect(state.roastedStockLbs).toBeGreaterThan(0);

    // 6. Tick through the rest of the day
    const remaining = DAY_DURATION_SECONDS - 610;
    for (let elapsed = 0; elapsed < remaining; elapsed += 60) {
      tick(state, Math.min(60, remaining - elapsed));
    }

    expect(state.dayElapsedSeconds).toBeCloseTo(DAY_DURATION_SECONDS, 1);
    expect(state.dayStats.unitsSold).toBeGreaterThan(0);
    expect(state.dayStats.revenue).toBeGreaterThan(0);

    // 7. endOfDay
    const cashBeforeEOD = state.cash;
    const report = endOfDay(state);

    expect(report.dayNumber).toBe(1);
    expect(state.dayNumber).toBe(2);
    expect(report.revenue).toBeGreaterThan(0);
    expect(report.cogs).toBeGreaterThan(0);
    expect(report.cogs).toBeLessThanOrEqual(4.20 + 0.001); 

    expect(report.grossProfit).toBeCloseTo(report.revenue - report.cogs, 5);

    // If sold at $1.50 and COGS $0.42, gross margin ≈ 72%
    expect(report.grossMarginPct).toBeGreaterThan(60);
    expect(report.grossMarginPct).toBeLessThan(85);

    expect(report.fixedCosts).toBeCloseTo(DAILY_FIXED_COSTS, 5);
    expect(report.net).toBeCloseTo(report.grossProfit - DAILY_FIXED_COSTS, 5);

    expect(report.cashBefore).toBeCloseTo(cashBeforeEOD, 5);
    expect(report.cashAfter).toBeCloseTo(cashBeforeEOD - DAILY_FIXED_COSTS, 5);
    expect(state.cash).toBeCloseTo(report.cashAfter, 5);
  });

  it("exact worked example: 10 units @ $1.50 → $5.80 net (direct-inject, no jitter)", () => {
    const state = createState(1);
    state.cash = 50.00;
    state.dayStats.revenue   = 15.00;
    state.dayStats.cogsTotal = 4.20;
    state.dayStats.unitsSold = 10;

    const report = endOfDay(state);

    expect(report.revenue).toBeCloseTo(15.00, 5);
    expect(report.cogs).toBeCloseTo(4.20, 5);
    expect(report.grossProfit).toBeCloseTo(10.80, 5);
    expect(report.grossMarginPct).toBeCloseTo(72.00, 2);
    expect(report.fixedCosts).toBeCloseTo(5.00, 5);
    expect(report.net).toBeCloseTo(5.80, 5);
    // cashAfter = 50.00 – 5.00 = 45.00
    expect(report.cashAfter).toBeCloseTo(45.00, 5);
  });
});
