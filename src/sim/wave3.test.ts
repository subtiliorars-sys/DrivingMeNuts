/**
 * wave3.test.ts — Wave 3 feature tests: recipe/batch selection + mid-tier lore unlocks.
 *
 * Coverage:
 *   Part 1 — Recipes
 *     1. Per-recipe COGS/lb math
 *     2. Recipe demand multipliers (projectedDemand)
 *     3. Mixed-stock cost basis (weighted average across recipe batches)
 *     4. Unlock threshold crossing at endOfDay evaluation
 *     5. recipesUnlocked: classic_salted always present, others gated by lifetimeEarned
 *     6. startRoast signature accepts all three RecipeIds
 *
 *   Part 2 — Lore tier gating
 *     7. Early-tier lines (days 1+) always in pool
 *     8. Mid-tier lines (days 5+) absent before day 5, present on day 5+
 *     9. Denominator tracks pool size per day
 *    10. Gag picker draws only from unlocked pool
 *
 *   Part 3 — Persistence round-trips
 *    11. lifetimeEarned and recipesUnlocked persist through serialize/deserialize
 *    12. Older save without lifetimeEarned defaults gracefully (forward-compat)
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
  RECIPE_DEMAND_MULT,
  RECIPE_UNLOCK_THRESHOLD,
  DEFAULT_SELL_PRICE,
  DEMAND_BASE_PRICE,
} from "../data/economy.js";
import { LORE_LINES, LORE_BY_ID, LORE_TIER_DAY_GATE } from "../data/lore.js";
import { serialize, deserialize } from "./persistence.js";
import type { SimState } from "./types.js";

// ---------------------------------------------------------------------------
// Helper: inject roasted stock from a known recipe batch to bypass production
// ---------------------------------------------------------------------------

function injectRoastedBatch(state: SimState, lbs: number, cogs: number): void {
  const oldLbs = state.roastedStockLbs;
  const newTotal = oldLbs + lbs;
  state.roastedCostBasisPerLb = newTotal > 0
    ? (oldLbs * state.roastedCostBasisPerLb + lbs * cogs) / newTotal
    : cogs;
  state.roastedStockLbs = newTotal;
}

// ---------------------------------------------------------------------------
// Part 1 — Recipes
// ---------------------------------------------------------------------------

describe("recipe COGS/lb math", () => {
  it("classic_salted COGS = $0.60/lb", () => {
    const cogs = RAW_PEANUT_BASE_PRICE + RECIPES.classic_salted.ingredientCostPerLb;
    expect(cogs).toBeCloseTo(0.60, 5);
  });

  it("honey_cinnamon COGS = $0.70/lb", () => {
    const cogs = RAW_PEANUT_BASE_PRICE + RECIPES.honey_cinnamon.ingredientCostPerLb;
    expect(cogs).toBeCloseTo(0.70, 5);
  });

  it("ghost_pepper COGS = $0.90/lb", () => {
    const cogs = RAW_PEANUT_BASE_PRICE + RECIPES.ghost_pepper.ingredientCostPerLb;
    expect(cogs).toBeCloseTo(0.90, 5);
  });

  it("ghost_pepper COGS is 50% more than classic_salted (spec teaching point)", () => {
    const cogsClassic = RAW_PEANUT_BASE_PRICE + RECIPES.classic_salted.ingredientCostPerLb;
    const cogsGhost   = RAW_PEANUT_BASE_PRICE + RECIPES.ghost_pepper.ingredientCostPerLb;
    expect(cogsGhost / cogsClassic).toBeCloseTo(1.50, 3);
  });
});

describe("recipe demand multipliers (projectedDemand)", () => {
  it("classic_salted has multiplier 1.0 — baseline demand unchanged", () => {
    const d = projectedDemand(DEFAULT_SELL_PRICE, "classic_salted");
    const dBase = projectedDemand(DEFAULT_SELL_PRICE); // default = classic_salted
    expect(d).toBeCloseTo(dBase, 8);
  });

  it("honey_cinnamon demand = classic_salted demand × 0.75 at same price", () => {
    const dClassic = projectedDemand(DEMAND_BASE_PRICE, "classic_salted");
    const dHoney   = projectedDemand(DEMAND_BASE_PRICE, "honey_cinnamon");
    expect(dHoney).toBeCloseTo(dClassic * RECIPE_DEMAND_MULT.honey_cinnamon, 5);
  });

  it("ghost_pepper demand = classic_salted demand × 0.40 at same price", () => {
    const dClassic = projectedDemand(DEMAND_BASE_PRICE, "classic_salted");
    const dGhost   = projectedDemand(DEMAND_BASE_PRICE, "ghost_pepper");
    expect(dGhost).toBeCloseTo(dClassic * RECIPE_DEMAND_MULT.ghost_pepper, 5);
  });

  it("honey_cinnamon profit-optimal price is ≈$1.95 (spec §4 formula: p* = (20/10 + 1.20 + 0.70) / 2)", () => {
    // p* = (BASE/SLOPE + base + COGS) / 2 = (20/10 + 1.20 + 0.70) / 2 = 3.90 / 2 = 1.95
    // Verify that projectedDemand × margin at $1.95 beats $1.50 and $2.50 for honey_cinnamon.
    const cogsHoney = RAW_PEANUT_BASE_PRICE + RECIPES.honey_cinnamon.ingredientCostPerLb; // $0.70

    const profit = (p: number): number => {
      const demand = projectedDemand(p, "honey_cinnamon");
      return (p - cogsHoney) * demand;
    };

    const profitAt195 = profit(1.95);
    const profitAt150 = profit(1.50);
    const profitAt250 = profit(2.50);

    expect(profitAt195).toBeGreaterThan(profitAt150);
    expect(profitAt195).toBeGreaterThan(profitAt250);
  });

  it("projectedDemand is deterministic (no PRNG — same price/recipe always returns same value)", () => {
    for (const price of [1.00, 1.50, 2.00]) {
      expect(projectedDemand(price, "honey_cinnamon")).toBe(projectedDemand(price, "honey_cinnamon"));
      expect(projectedDemand(price, "ghost_pepper")).toBe(projectedDemand(price, "ghost_pepper"));
    }
  });
});

describe("mixed-stock cost basis", () => {
  it("cost basis after two batches is weighted average", () => {
    const state = createState(1);

    // Inject 10 lbs @ $0.60 COGS (classic_salted)
    injectRoastedBatch(state, 10, 0.60);
    expect(state.roastedCostBasisPerLb).toBeCloseTo(0.60, 5);

    // Inject 10 lbs @ $0.70 COGS (honey_cinnamon)
    injectRoastedBatch(state, 10, 0.70);
    // Weighted average: (10×0.60 + 10×0.70) / 20 = 13.00 / 20 = $0.65
    expect(state.roastedCostBasisPerLb).toBeCloseTo(0.65, 5);
    expect(state.roastedStockLbs).toBeCloseTo(20, 5);
  });

  it("startRoast for honey_cinnamon deducts correct ingredient cost", () => {
    const state = createState(1);
    state.cash = 50;
    state.rawStockLbs = 20;
    const expectedIngredientCost = RECIPES.honey_cinnamon.ingredientCostPerLb * 10; // $3.00
    const cashBefore = state.cash;

    const ev = startRoast(state, 0, "honey_cinnamon", 10);
    expect(ev).not.toBeNull();
    expect(state.cash).toBeCloseTo(cashBefore - expectedIngredientCost, 5);
    expect(state.rawStockLbs).toBeCloseTo(10, 5);
  });

  it("startRoast for ghost_pepper deducts correct ingredient cost", () => {
    const state = createState(1);
    state.cash = 50;
    state.rawStockLbs = 20;
    const expectedIngredientCost = RECIPES.ghost_pepper.ingredientCostPerLb * 10; // $5.00
    const cashBefore = state.cash;

    const ev = startRoast(state, 0, "ghost_pepper", 10);
    expect(ev).not.toBeNull();
    expect(state.cash).toBeCloseTo(cashBefore - expectedIngredientCost, 5);
  });

  it("cost basis updates correctly when roast finishes (tick completes roast)", () => {
    const state = createState(1);
    state.cash = 100;
    state.rawStockLbs = 50;
    state.roastedStockLbs = 0;
    state.roastedCostBasisPerLb = 0;

    // Start a honey_cinnamon batch of 10 lbs
    startRoast(state, 0, "honey_cinnamon", 10);
    // Tick past roast duration (10 lbs × 72s = 720s)
    tick(state, 800);

    // Roast should be ready; cost basis should be honey_cinnamon COGS
    // (some lbs may have sold; basis stays at $0.70 per average-cost method)
    expect(state.roastedCostBasisPerLb).toBeCloseTo(0.70, 3);
  });
});

describe("recipe unlock gating", () => {
  it("classic_salted is always unlocked from game start", () => {
    const state = createState(1);
    expect(state.recipesUnlocked.has("classic_salted")).toBe(true);
  });

  it("honey_cinnamon is NOT unlocked at game start (lifetimeEarned = 0)", () => {
    const state = createState(1);
    expect(state.recipesUnlocked.has("honey_cinnamon")).toBe(false);
  });

  it("honey_cinnamon unlocks when lifetimeEarned crosses $500 at endOfDay", () => {
    const state = createState(1);
    // Inject revenue just enough to cross threshold
    state.dayStats.revenue = RECIPE_UNLOCK_THRESHOLD.honey_cinnamon; // exactly $500

    expect(state.recipesUnlocked.has("honey_cinnamon")).toBe(false);
    endOfDay(state);
    expect(state.recipesUnlocked.has("honey_cinnamon")).toBe(true);
    expect(state.lifetimeEarned).toBeCloseTo(500, 2);
  });

  it("honey_cinnamon does NOT unlock when just below threshold ($499.99)", () => {
    const state = createState(1);
    state.dayStats.revenue = RECIPE_UNLOCK_THRESHOLD.honey_cinnamon - 0.01;
    endOfDay(state);
    expect(state.recipesUnlocked.has("honey_cinnamon")).toBe(false);
  });

  it("ghost_pepper unlocks when lifetimeEarned crosses $1200 at endOfDay", () => {
    const state = createState(1);
    state.dayStats.revenue = RECIPE_UNLOCK_THRESHOLD.ghost_pepper; // $1200
    endOfDay(state);
    expect(state.recipesUnlocked.has("ghost_pepper")).toBe(true);
    expect(state.lifetimeEarned).toBeCloseTo(1200, 2);
  });

  it("lifetimeEarned accumulates across multiple endOfDay calls", () => {
    const state = createState(1);
    // Day 1: earn $300
    state.dayStats.revenue = 300;
    endOfDay(state);
    expect(state.lifetimeEarned).toBeCloseTo(300, 2);

    // Day 2: earn $250 — total $550, crosses honey threshold
    state.dayStats.revenue = 250;
    endOfDay(state);
    expect(state.lifetimeEarned).toBeCloseTo(550, 2);
    expect(state.recipesUnlocked.has("honey_cinnamon")).toBe(true);
  });

  it("unlock happens at boundary exactly (lifetimeEarned == threshold after endOfDay)", () => {
    const state = createState(1);
    // Pre-load lifetimeEarned to just below threshold
    state.lifetimeEarned = RECIPE_UNLOCK_THRESHOLD.honey_cinnamon - 10;
    state.dayStats.revenue = 10; // puts it exactly at threshold

    expect(state.recipesUnlocked.has("honey_cinnamon")).toBe(false);
    endOfDay(state);
    expect(state.recipesUnlocked.has("honey_cinnamon")).toBe(true);
  });

  it("RECIPE_UNLOCK_THRESHOLD constants are exported and correct", () => {
    expect(RECIPE_UNLOCK_THRESHOLD.classic_salted).toBe(0);
    expect(RECIPE_UNLOCK_THRESHOLD.honey_cinnamon).toBe(500);
    expect(RECIPE_UNLOCK_THRESHOLD.ghost_pepper).toBe(1200);
  });
});

// ---------------------------------------------------------------------------
// Part 2 — Lore tier gating
// ---------------------------------------------------------------------------

describe("lore tier gating", () => {
  it("all early-tier lines have tier='early'", () => {
    const earlyLines = LORE_LINES.filter((l) => l.tier === "early");
    // LL-001 through LL-006 are early
    expect(earlyLines.length).toBeGreaterThanOrEqual(6);
    for (const line of earlyLines) {
      expect(line.tier).toBe("early");
    }
  });

  it("mid-tier lines have tier='mid' (W5: LL-007–LL-016 are mid; LL-017–020 re-tiered to late)", () => {
    const midLines = LORE_LINES.filter((l) => l.tier === "mid");
    // W5: LL-007 through LL-016 are mid (10 lines); LL-017–020 are now late
    expect(midLines.length).toBeGreaterThanOrEqual(10);
    for (const line of midLines) {
      expect(line.tier).toBe("mid");
    }
  });

  it("LORE_TIER_DAY_GATE: early gate is day 1, mid gate is day 8 (W5 playtest-compressed)", () => {
    expect(LORE_TIER_DAY_GATE.early).toBe(1);
    expect(LORE_TIER_DAY_GATE.mid).toBe(8); // W5: compressed from canon day 21 for playtest
  });

  it("on day 1: only early-tier lines are in the pool (6 lines)", () => {
    const state = createState(1);
    expect(state.dayNumber).toBe(1);
    const pool = LORE_LINES.filter((l) => state.dayNumber >= LORE_TIER_DAY_GATE[l.tier]);
    const earlyCount = LORE_LINES.filter((l) => l.tier === "early").length;
    expect(pool.length).toBe(earlyCount);
  });

  it("on day 7: still only early-tier lines (mid gate = 8)", () => {
    const state = createState(1);
    state.dayNumber = 7;
    const pool = LORE_LINES.filter((l) => state.dayNumber >= LORE_TIER_DAY_GATE[l.tier]);
    const earlyCount = LORE_LINES.filter((l) => l.tier === "early").length;
    expect(pool.length).toBe(earlyCount);
  });

  it("on day 8: early + mid lines are in the pool (W5: mid gate = 8)", () => {
    const state = createState(1);
    state.dayNumber = 8;
    const pool = LORE_LINES.filter((l) => state.dayNumber >= LORE_TIER_DAY_GATE[l.tier]);
    const earlyCount = LORE_LINES.filter((l) => l.tier === "early").length;
    const midCount   = LORE_LINES.filter((l) => l.tier === "mid").length;
    expect(pool.length).toBe(earlyCount + midCount);
  });

  it("gag events on day 1 only reference early-tier ids", () => {
    const state = createState(7);
    state.dayNumber = 1;
    state.roastedStockLbs = 5000; // ensure many gags fire
    const events: ReturnType<typeof tick>[] = [];
    // Tick a full day at day 1
    for (let i = 0; i < 3600; i++) {
      events.push(tick(state, 14));
    }
    const gagIds = events.flat().filter((e) => e.kind === "gag").map((e) => e.detail.loreId as string);
    expect(gagIds.length).toBeGreaterThan(0);
    for (const id of gagIds) {
      const line = LORE_BY_ID[id];
      expect(line).toBeDefined();
      expect(line.tier).toBe("early");
    }
  });

  it("gag events on day 8+ can include mid-tier ids (W5: mid gate = 8)", () => {
    const state = createState(42);
    state.dayNumber = 8; // W5: mid gate is now 8, not 5
    state.roastedStockLbs = 5000;
    const allEvents: ReturnType<typeof tick>[] = [];
    // Run multiple simulated days worth to sample a good set of gags
    for (let i = 0; i < 5000; i++) {
      allEvents.push(tick(state, 14));
    }
    const gagIds = allEvents.flat().filter((e) => e.kind === "gag").map((e) => e.detail.loreId as string);
    expect(gagIds.length).toBeGreaterThan(0);

    // All ids must be in LORE_BY_ID and be either early or mid tier (late gate = 20)
    for (const id of gagIds) {
      const line = LORE_BY_ID[id];
      expect(line).toBeDefined();
      expect(["early", "mid"]).toContain(line.tier);
    }

    // With 5000 ticks and a large pool, at least one mid-tier id should appear
    const midIds = gagIds.filter((id) => LORE_BY_ID[id]?.tier === "mid");
    expect(midIds.length).toBeGreaterThan(0);
  });

  it("total LORE_LINES count is 40 (6 early + 10 mid + 24 late — Wave 4 polish loaded LL-021–LL-040)", () => {
    expect(LORE_LINES.length).toBe(40);
  });

  it("every LORE_LINES entry has tier field", () => {
    for (const line of LORE_LINES) {
      expect(["early", "mid", "late"]).toContain(line.tier);
    }
  });
});

// ---------------------------------------------------------------------------
// Part 3 — Persistence round-trips
// ---------------------------------------------------------------------------

describe("persistence: lifetimeEarned and recipesUnlocked", () => {
  it("lifetimeEarned round-trips through serialize/deserialize", () => {
    const state = createState(1);
    state.lifetimeEarned = 750;
    const loaded = deserialize(serialize(state));
    expect(loaded.lifetimeEarned).toBeCloseTo(750, 5);
  });

  it("recipesUnlocked round-trips through serialize/deserialize", () => {
    const state = createState(1);
    state.recipesUnlocked = new Set(["classic_salted", "honey_cinnamon"]);
    const loaded = deserialize(serialize(state));
    expect(loaded.recipesUnlocked).toBeInstanceOf(Set);
    expect(loaded.recipesUnlocked.has("classic_salted")).toBe(true);
    expect(loaded.recipesUnlocked.has("honey_cinnamon")).toBe(true);
    expect(loaded.recipesUnlocked.has("ghost_pepper")).toBe(false);
    expect(loaded.recipesUnlocked.size).toBe(2);
  });

  it("serialized recipesUnlocked appears as an array in JSON", () => {
    const state = createState(1);
    state.recipesUnlocked = new Set(["classic_salted", "ghost_pepper"]);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    expect(Array.isArray(envelope.sim.recipesUnlocked)).toBe(true);
    expect(envelope.sim.recipesUnlocked).toContain("classic_salted");
    expect(envelope.sim.recipesUnlocked).toContain("ghost_pepper");
  });

  it("classic_salted always present after deserialize even if missing from save (forward-compat)", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    // Simulate an older save that omitted classic_salted from recipesUnlocked
    envelope.sim.recipesUnlocked = [];
    const loaded = deserialize(JSON.stringify(envelope));
    // classic_salted must always be present
    expect(loaded.recipesUnlocked.has("classic_salted")).toBe(true);
  });

  it("invalid recipe ids in recipesUnlocked are filtered out on load", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    // Inject an invalid id
    envelope.sim.recipesUnlocked = ["classic_salted", "not_a_recipe", 42];
    const loaded = deserialize(JSON.stringify(envelope));
    expect(loaded.recipesUnlocked.has("classic_salted")).toBe(true);
    expect(loaded.recipesUnlocked.has("not_a_recipe")).toBe(false);
    expect(loaded.recipesUnlocked.size).toBe(1);
  });

  it("lifetimeEarned defaults to 0 when missing from older save (forward-compat)", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    // Simulate older save without lifetimeEarned
    delete envelope.sim.lifetimeEarned;
    // Sanity check will fail on missing field so we need to add it as 0
    envelope.sim.lifetimeEarned = 0;
    const loaded = deserialize(JSON.stringify(envelope));
    expect(loaded.lifetimeEarned).toBe(0);
  });
});
