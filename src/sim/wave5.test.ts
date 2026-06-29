/**
 * wave5.test.ts — Ledger v1, weekly recap, balance sheet.
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  tick,
  endOfDay,
  chooseRescuePath,
  balanceSheet,
} from "./engine.js";
import type { SimState } from "./types.js";

function sellThroughDay(state: SimState, roastedLbs: number): void {
  state.roastedStockLbs += roastedLbs;
  state.roastedCostBasisPerLb = 0.42;
  for (let h = 0; h < 14; h++) tick(state, 3_600);
}

describe("ledger v1", () => {
  it("endOfDay appends a row with the P&L identity intact", () => {
    const state = createState(1);
    sellThroughDay(state, 30);
    const report = endOfDay(state);
    expect(state.ledger).toHaveLength(1);
    const e = state.ledger[0];
    expect(e.net).toBeCloseTo(e.revenue - e.cogs - e.fixedCosts + e.offlineEarned, 6);
    void report;
  });
});

describe("balance sheet", () => {
  it("identity holds with debts and inventory", () => {
    const state = createState(1);
    state.cash = 10;
    endOfDay(state);
    chooseRescuePath(state, "loan");
    state.roastedStockLbs = 25;
    state.roastedCostBasisPerLb = 0.42;

    const bs = balanceSheet(state);
    expect(bs.assets.roastedInventoryValue).toBeCloseTo(25 * 0.42, 6);
    expect(bs.equity).toBeCloseTo(bs.assets.total - bs.liabilities.total, 9);
  });
});
