/**
 * wave3.test.ts — Wave 3 feature tests: recipe/batch selection + mid-tier lore unlocks.
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  tick,
  startRoast,
  endOfDay,
  projectedDemand,
} from "./engine.js";
import {
  RAW_PEANUT_BASE_PRICE,
  RECIPES,
} from "../data/economy.js";
import { LORE_LINES, LORE_TIER_DAY_GATE } from "../data/lore.js";
import { serialize, deserialize } from "./persistence.js";
import type { SimState } from "./types.js";

function injectRoastedBatch(state: SimState, lbs: number, cogs: number): void {
  const oldLbs = state.roastedStockLbs;
  const newTotal = oldLbs + lbs;
  state.roastedCostBasisPerLb = newTotal > 0
    ? (oldLbs * state.roastedCostBasisPerLb + lbs * cogs) / newTotal
    : cogs;
  state.roastedStockLbs = newTotal;
}

describe("recipe COGS/unit math", () => {
  it("classic_salted COGS = $0.42/unit", () => {
    const cogs = RAW_PEANUT_BASE_PRICE + RECIPES.classic_salted.ingredientCostPerLb;
    expect(cogs).toBeCloseTo(0.42, 5);
  });

  it("honey_cinnamon COGS = $0.52/unit", () => {
    const cogs = RAW_PEANUT_BASE_PRICE + RECIPES.honey_cinnamon.ingredientCostPerLb;
    expect(cogs).toBeCloseTo(0.52, 5);
  });

  it("ghost_pepper COGS = $0.72/unit", () => {
    const cogs = RAW_PEANUT_BASE_PRICE + RECIPES.ghost_pepper.ingredientCostPerLb;
    expect(cogs).toBeCloseTo(0.72, 5);
  });

  it("ghost_pepper COGS is 1.7x more than classic_salted (spec teaching point)", () => {
    const cogsClassic = RAW_PEANUT_BASE_PRICE + RECIPES.classic_salted.ingredientCostPerLb;
    const cogsGhost   = RAW_PEANUT_BASE_PRICE + RECIPES.ghost_pepper.ingredientCostPerLb;
    expect(cogsGhost / cogsClassic).toBeCloseTo(1.714, 2);
  });
});

describe("recipe demand multipliers (projectedDemand)", () => {
  it("honey_cinnamon profit-optimal price is ≈$1.86", () => {
    const cogsHoney = RAW_PEANUT_BASE_PRICE + RECIPES.honey_cinnamon.ingredientCostPerLb; // $0.52
    const profit = (p: number): number => {
      const demand = projectedDemand(p, "honey_cinnamon");
      return (p - cogsHoney) * demand;
    };
    expect(profit(1.86)).toBeGreaterThan(profit(1.50));
    expect(profit(1.86)).toBeGreaterThan(profit(2.50));
  });
});

describe("mixed-stock cost basis", () => {
  it("cost basis after two batches is weighted average", () => {
    const state = createState(1);
    injectRoastedBatch(state, 10, 0.42);
    expect(state.roastedCostBasisPerLb).toBeCloseTo(0.42, 5);
    injectRoastedBatch(state, 10, 0.52);
    expect(state.roastedCostBasisPerLb).toBeCloseTo(0.47, 5);
  });

  it("cost basis updates correctly when roast finishes", () => {
    const state = createState(1);
    startRoast(state, 0, "honey_cinnamon", 10);
    tick(state, 800);
    expect(state.roastedCostBasisPerLb).toBeCloseTo(0.52, 3);
  });
});

describe("recipe unlock gating", () => {
  it("honey_cinnamon unlocks when lifetimeEarned crosses $500", () => {
    const state = createState(1);
    state.dayStats.revenue = 500;
    endOfDay(state);
    expect(state.recipesUnlocked.has("honey_cinnamon")).toBe(true);
  });
});

describe("lore tier gating", () => {
  it("on day 1: only early-tier lines in pool", () => {
    const state = createState(1);
    const pool = LORE_LINES.filter((l) => state.dayNumber >= LORE_TIER_DAY_GATE[l.tier]);
    expect(pool.every(l => l.tier === "early")).toBe(true);
  });
});

describe("persistence: lifetimeEarned and recipesUnlocked", () => {
  it("round-trips through serialize/deserialize", () => {
    const state = createState(1);
    state.lifetimeEarned = 750;
    const loaded = deserialize(serialize(state));
    expect(loaded.lifetimeEarned).toBeCloseTo(750, 5);
  });
});
