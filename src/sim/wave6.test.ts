/**
 * wave6.test.ts — Achievements, Lore/Comeback collection surfaces, and the
 * Supplier-relationship discount (GDD C4).
 *
 * Pure node tests — no Phaser.
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  endOfDay,
  buyRaw,
  checkAchievements,
  tick,
  chooseRescuePath,
} from "./engine.js";
import { serialize, deserialize } from "./persistence.js";
import {
  RAW_PEANUT_BASE_PRICE,
  bulkDiscountFor,
  supplierLevelFor,
  supplierDiscountFor,
  SUPPLIER_LEVEL_THRESHOLDS,
  SUPPLIER_LEVEL_DISCOUNT,
} from "../data/economy.js";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  ACHIEVEMENT_TOTAL,
} from "../data/achievements.js";
import type { SimState } from "./types.js";

function seedFakeLore(state: SimState, n: number): void {
  for (let i = 0; i < n; i++) state.gagsSeen.add(`FAKE-${i}`);
}

/** Build a v4-style save JSON without the wave-6 fields (older format). */
function makePreWave6Json(state: SimState): string {
  const env = JSON.parse(serialize(state));
  delete env.sim.achievementsUnlocked;
  delete env.sim.supplierLbsPurchased;
  return JSON.stringify(env);
}

// ---------------------------------------------------------------------------
// 1. Achievements
// ---------------------------------------------------------------------------

describe("achievements", () => {
  it("fresh state has none earned", () => {
    const state = createState(1);
    expect(state.achievementsUnlocked).toEqual([]);
    expect(checkAchievements(state)).toEqual([]);
  });

  it("every achievement id is unique and resolvable", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(ACHIEVEMENT_TOTAL);
    for (const id of ids) expect(ACHIEVEMENT_BY_ID[id]).toBeDefined();
  });

  it("first-sale fires once and never again", () => {
    const state = createState(1);
    state.unitsSoldLifetime = 5;
    const ev1 = checkAchievements(state);
    expect(ev1.map((e) => e.detail.id)).toContain("ACH-first-sale");
    expect(state.achievementsUnlocked).toContain("ACH-first-sale");
    // Idempotent
    const ev2 = checkAchievements(state);
    expect(ev2.map((e) => e.detail.id)).not.toContain("ACH-first-sale");
  });

  it("lifetime-earnings tiers unlock at the right thresholds via endOfDay", () => {
    const state = createState(1);
    state.roastedStockLbs = 5000;
    state.roastedCostBasisPerLb = 0.60;
    state.sellPrice = 2.0;
    // Sell a lot in one day so lifetimeEarned crosses $1000
    for (let h = 0; h < 14; h++) tick(state, 3_600);
    const report = endOfDay(state);
    const ids = report.achievementEvents.map((e) => e.detail.id);
    expect(ids).toContain("ACH-first-sale");
    if (state.lifetimeEarned >= 1000) expect(state.achievementsUnlocked).toContain("ACH-first-grand");
  });

  it("survived-debt requires a used path AND a clean sheet", () => {
    const state = createState(1);
    state.cash = 10;
    endOfDay(state); // rescue offer
    chooseRescuePath(state, "loan");
    // Debt active → not earned yet
    checkAchievements(state);
    expect(state.achievementsUnlocked).not.toContain("ACH-survived-debt");
    // Pay it off at the due day
    state.dayNumber = state.rescueDebts[0].dueDayNumber;
    state.cash = 500;
    const report = endOfDay(state); // debt cleared, rescueMode → null
    expect(state.rescueDebts).toHaveLength(0);
    expect(state.rescueMode).toBeNull();
    expect(report.achievementEvents.map((e) => e.detail.id)).toContain("ACH-survived-debt");
  });

  it("derive-on-load records earned achievements silently (no event burst)", () => {
    const state = createState(1);
    state.unitsSoldLifetime = 100;
    state.lifetimeEarned = 12_000;
    seedFakeLore(state, 26);
    // Round-trip — deserialize calls checkAchievements(silent)
    const loaded = deserialize(serialize(state));
    expect(loaded.achievementsUnlocked).toContain("ACH-first-sale");
    expect(loaded.achievementsUnlocked).toContain("ACH-first-grand");
    expect(loaded.achievementsUnlocked).toContain("ACH-ten-grand");
    expect(loaded.achievementsUnlocked).toContain("ACH-lore-half");
    // A subsequent live check produces no NEW events (all already recorded)
    expect(checkAchievements(loaded)).toEqual([]);
  });

  it("content: achievements grant no mechanical field (markers only)", () => {
    // Earning all achievements must not mutate cash/stock/price.
    const a = createState(1);
    a.cash = 100; a.rawStockLbs = 20;
    const before = { cash: a.cash, raw: a.rawStockLbs, price: a.sellPrice };
    a.unitsSoldLifetime = 1; a.lifetimeEarned = 200_000;
    checkAchievements(a);
    expect(a.cash).toBe(before.cash);
    expect(a.rawStockLbs).toBe(before.raw);
    expect(a.sellPrice).toBe(before.price);
  });
});

// ---------------------------------------------------------------------------
// 2. Supplier relationship
// ---------------------------------------------------------------------------

describe("supplier relationship", () => {
  it("level + discount ladders are consistent", () => {
    expect(supplierLevelFor(0)).toBe(0);
    expect(supplierLevelFor(SUPPLIER_LEVEL_THRESHOLDS[0] - 1)).toBe(0);
    expect(supplierLevelFor(SUPPLIER_LEVEL_THRESHOLDS[0])).toBe(1);
    expect(supplierLevelFor(SUPPLIER_LEVEL_THRESHOLDS[1])).toBe(2);
    expect(supplierLevelFor(SUPPLIER_LEVEL_THRESHOLDS[2])).toBe(3);
    expect(supplierLevelFor(1e9)).toBe(3);
    expect(supplierDiscountFor(0)).toBe(SUPPLIER_LEVEL_DISCOUNT[0]);
    expect(supplierDiscountFor(SUPPLIER_LEVEL_THRESHOLDS[2])).toBe(SUPPLIER_LEVEL_DISCOUNT[3]);
  });

  it("buyRaw tracks cumulative lbs and reports a level-up", () => {
    const state = createState(1);
    state.cash = 100_000;
    // One big order to cross level 1 (500 lbs)
    const ev = buyRaw(state, 500);
    expect(ev).not.toBeNull();
    expect(state.supplierLbsPurchased).toBe(500);
    expect(ev!.detail.supplierLevelUp).toBe(1);
    // Next order: no further level-up until threshold 2
    const ev2 = buyRaw(state, 100);
    expect(ev2!.detail.supplierLevelUp).toBeNull();
  });

  it("discount uses the relationship as it stood BEFORE the order (no self-discount)", () => {
    const state = createState(1);
    state.cash = 100_000;
    // First 500-lb order: supplier level is still 0 during pricing.
    const ev = buyRaw(state, 500);
    const expectedNoSupplier = 500 * RAW_PEANUT_BASE_PRICE * (1 - bulkDiscountFor(500));
    expect(ev!.detail.totalCost as number).toBeCloseTo(expectedNoSupplier, 6);
    expect(ev!.detail.supplierDiscount).toBe(0);
  });

  it("discount applies on the NEXT order after leveling up; stacks with bulk", () => {
    const state = createState(1);
    state.cash = 100_000;
    buyRaw(state, 500); // now level 1
    const ev = buyRaw(state, 200);
    const expected = 200 * RAW_PEANUT_BASE_PRICE
      * (1 - bulkDiscountFor(200))
      * (1 - SUPPLIER_LEVEL_DISCOUNT[1]);
    expect(ev!.detail.totalCost as number).toBeCloseTo(expected, 6);
    expect(ev!.detail.supplierDiscount).toBe(SUPPLIER_LEVEL_DISCOUNT[1]);
  });

  it("combined discount never drives raw cost to zero or negative", () => {
    const state = createState(1);
    state.cash = 1e9;
    state.supplierLbsPurchased = 1e9; // max level
    const ev = buyRaw(state, 1000); // max bulk tier too
    const cost = ev!.detail.totalCost as number;
    expect(cost).toBeGreaterThan(0);
    // Sanity: combined factor is (1−0.12)(1−0.15) = 0.748 of base
    expect(cost).toBeCloseTo(1000 * RAW_PEANUT_BASE_PRICE * 0.88 * 0.85, 6);
  });

  it("never grants free stock: cash out > 0 for any order", () => {
    const state = createState(1);
    state.cash = 1e9;
    state.supplierLbsPurchased = 1e9;
    const cashBefore = state.cash;
    buyRaw(state, 1000);
    expect(state.cash).toBeLessThan(cashBefore);
  });
});

// ---------------------------------------------------------------------------
// 3. Persistence (additive-optional, no schema bump)
// ---------------------------------------------------------------------------

describe("wave 6 persistence", () => {
  it("round-trips achievementsUnlocked and supplierLbsPurchased", () => {
    const state = createState(1);
    state.supplierLbsPurchased = 1234;
    state.achievementsUnlocked = ["ACH-first-sale"];
    const loaded = deserialize(serialize(state));
    expect(loaded.supplierLbsPurchased).toBe(1234);
    expect(loaded.achievementsUnlocked).toContain("ACH-first-sale");
  });

  it("pre-wave-6 save loads: supplier 0, achievements derived from state", () => {
    const state = createState(1);
    state.unitsSoldLifetime = 10; // earns first-sale on derive
    state.supplierLbsPurchased = 999; // present in live state...
    const json = makePreWave6Json(state); // ...but stripped from the save
    const loaded = deserialize(json);
    expect(loaded.supplierLbsPurchased).toBe(0); // absent → default
    expect(loaded.achievementsUnlocked).toContain("ACH-first-sale"); // derived
  });

  it("drops unknown achievement ids and rejects bad types on load", () => {
    const state = createState(1);
    const env = JSON.parse(serialize(state));
    env.sim.achievementsUnlocked = ["ACH-first-sale", "ACH-bogus"];
    // ACH-first-sale not actually earned (unitsSoldLifetime 0) → filtered out too,
    // but the bogus id must never survive regardless.
    const loaded = deserialize(JSON.stringify(env));
    expect(loaded.achievementsUnlocked).not.toContain("ACH-bogus");

    const badType = JSON.parse(serialize(state));
    badType.sim.achievementsUnlocked = [42];
    expect(() => deserialize(JSON.stringify(badType))).toThrow(/achievementsUnlocked/);

    const badSupplier = JSON.parse(serialize(state));
    badSupplier.sim.supplierLbsPurchased = -5;
    expect(() => deserialize(JSON.stringify(badSupplier))).toThrow(/supplierLbsPurchased/);

    const inf = JSON.parse(serialize(state));
    inf.sim.supplierLbsPurchased = 1e308 * 10; // Infinity after parse
    expect(() => deserialize(JSON.stringify(inf))).toThrow(/supplierLbsPurchased/);
  });
});
