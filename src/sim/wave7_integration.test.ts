/**
 * wave7_integration.test.ts — consolidation wave: exercise the waves 5–6
 * systems TOGETHER through a realistic multi-day play loop, and assert the
 * cross-cutting invariants hold end-to-end.
 *
 * Not a unit test of any one feature (those live in wave5/wave6 suites) — this
 * is the "do they compose?" check: buy (discounted) → roast → sell → endOfDay
 * → ledger + weekly recap + achievements + supplier level, then a full
 * save/load round-trip in the middle to prove persistence carries it all.
 *
 * Pure node — no Phaser.
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  buyRaw,
  startRoast,
  tick,
  endOfDay,
  setPrice,
  balanceSheet,
} from "./engine.js";
import { serialize, deserialize } from "./persistence.js";
import {
  DAY_DURATION_SECONDS,
  supplierLevelFor,
  RAW_PEANUT_BASE_PRICE,
} from "../data/economy.js";
import type { SimState } from "./types.js";

/** Advance the in-game clock to end-of-day in coarse steps (sells roasted stock). */
function runDayToClose(state: SimState): void {
  // ~14 ticks of one in-game hour each.
  for (let h = 0; h < 14; h++) tick(state, 3_600);
  // ensure the clock is at/over the close threshold
  if (state.dayElapsedSeconds < DAY_DURATION_SECONDS) {
    tick(state, DAY_DURATION_SECONDS - state.dayElapsedSeconds + 1);
  }
}

describe("waves 5–6 integration: a week of trading", () => {
  it("buy→roast→sell→close composes; ledger, recap, achievements, supplier all advance", () => {
    let state = createState(12345);
    state.cash = 5_000;       // enough working capital to trade freely
    setPrice(state, 1.90);    // near the profit optimum

    const reports = [];
    let roundTripped = false;

    for (let day = 1; day <= 7; day++) {
      // Buy a big raw order each morning — drives the supplier relationship.
      buyRaw(state, 800);
      // Roast what we can in the single starting slot, in chunks.
      startRoast(state, 0, "classic_salted", 100);
      // Let the day run (roast finishes, customers buy).
      runDayToClose(state);
      const report = endOfDay(state);
      reports.push(report);

      // Mid-week, prove a full save/load round-trip preserves everything.
      if (day === 4) {
        const loaded = deserialize(serialize(state));
        // Deep-ish equality on the fields these systems touch.
        expect(loaded.ledger).toEqual(state.ledger);
        expect(loaded.supplierLbsPurchased).toBe(state.supplierLbsPurchased);
        expect(loaded.achievementsUnlocked.sort()).toEqual([...state.achievementsUnlocked].sort());
        expect(loaded.rawCostBasisPerLb).toBeCloseTo(state.rawCostBasisPerLb, 9);
        state = loaded;
        roundTripped = true;
      }
    }

    expect(roundTripped).toBe(true);

    // --- Ledger: one row per closed day, capped, P&L identity holds ---
    expect(state.ledger.length).toBe(7);
    for (const e of state.ledger) {
      expect(e.net).toBeCloseTo(e.revenue - e.cogs - e.fixedCosts + e.offlineEarned, 6);
    }

    // --- Weekly recap fired exactly on day 7 ---
    expect(reports[6].weekRecap).not.toBeNull();
    expect(reports[6].weekRecap!.weekNumber).toBe(1);
    expect(reports[6].weekRecap!.daysIncluded).toBe(7);
    for (let d = 0; d < 6; d++) expect(reports[d].weekRecap).toBeNull();

    // --- Supplier: 7×800 = 5600 lbs ordered → level 2 (≥2000, <6000) ---
    expect(state.supplierLbsPurchased).toBe(5_600);
    expect(supplierLevelFor(state.supplierLbsPurchased)).toBe(2);

    // --- Achievements: at least "first sale" by now; all earned ids are real ---
    expect(state.achievementsUnlocked).toContain("ACH-first-sale");
    expect(state.achievementsUnlocked.length).toBe(new Set(state.achievementsUnlocked).size); // no dupes

    // --- RT6-1: raw basis is below base price (discounts carried), and the
    //     balance sheet identity holds with no phantom equity blowup ---
    expect(state.rawCostBasisPerLb).toBeLessThan(RAW_PEANUT_BASE_PRICE);
    const bs = balanceSheet(state);
    expect(bs.equity).toBeCloseTo(bs.assets.total - bs.liabilities.total, 6);
    // Inventory valued at actual cost, never above base price.
    if (state.rawStockLbs > 0) {
      expect(bs.assets.rawInventoryValue).toBeCloseTo(state.rawStockLbs * state.rawCostBasisPerLb, 6);
    }
  });

  it("a low-cash week triggers the rescue arc without breaking the ledger", () => {
    const state = createState(7);
    state.cash = 10; // start below the rescue threshold
    // Close a day with no sales → rescue offer; ledger still records the day.
    const r = endOfDay(state);
    expect(state.ledger).toHaveLength(1);
    expect(r.net).toBeCloseTo(-r.fixedCosts, 6); // pure fixed-cost loss
    expect(state.rescueMode).toBe("offer");
    // Ledger row's net excludes any debt service (there is none yet).
    expect(state.ledger[0].debtService).toBe(0);
  });
});
