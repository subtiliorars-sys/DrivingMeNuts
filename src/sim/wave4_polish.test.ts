/**
 * wave4_polish.test.ts — Vitest suite for Wave 4 polish batch.
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  endOfDay,
  optimumPrice,
} from "./engine.js";

describe("optimumPrice", () => {
  it("classic_salted optimum is $1.81 (COGS $0.42, base $1.20, base_lbs 20, slope 10)", () => {
    const p = optimumPrice("classic_salted");
    expect(p).toBeCloseTo(1.81, 2);
  });

  it("honey_cinnamon optimum is $1.86 (COGS $0.52)", () => {
    const p = optimumPrice("honey_cinnamon");
    expect(p).toBeCloseTo(1.86, 2);
  });

  it("ghost_pepper optimum is $1.96 (COGS $0.72)", () => {
    const p = optimumPrice("ghost_pepper");
    expect(p).toBeCloseTo(1.96, 2);
  });
});

describe("netHistory", () => {
  it("endOfDay appends one entry per day", () => {
    const state = createState(1);
    state.roastedStockLbs = 10;
    state.roastedCostBasisPerLb = 0.42;
    endOfDay(state);
    expect(state.netHistory.length).toBe(1);
  });
});
