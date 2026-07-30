/**
 * wave6.test.ts — Achievements and Supplier relationship.
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  buyRaw,
  tick,
  startRoast,
} from "./engine.js";

describe("RT6-1 cost basis (no phantom equity)", () => {
  it("raw cost basis is the weighted-average price actually paid", () => {
    const state = createState(1);
    state.cash = 100_000;
    state.supplierLbsPurchased = 1e9;
    buyRaw(state, 1000); 
    const paid = 0.32 * 0.88 * 0.85;
    const expectedBasis = (20 * 0.32 + 1000 * paid) / 1020;
    expect(state.rawCostBasisPerLb).toBeCloseTo(expectedBasis, 6);
  });

  it("discount flows to COGS at sale", () => {
    const s = createState(1);
    s.cash = 100_000;
    s.rawStockLbs = 0; s.rawCostBasisPerLb = 0.32;
    s.supplierLbsPurchased = 1e9;
    buyRaw(s, 200); 
    startRoast(s, 0, "classic_salted", 100); 
    tick(s, 7000); 
    expect(s.roastedCostBasisPerLb).toBeCloseTo(0.32 * 0.95 * 0.85 + 0.10, 6);

  });

  it("default (no discount) basis is unchanged", () => {
    const s = createState(1); 
    startRoast(s, 0, "classic_salted", 10);
    tick(s, 1000); // 10 * 60 = 600s
    expect(s.roastedCostBasisPerLb).toBeCloseTo(0.42, 6);
  });
});
