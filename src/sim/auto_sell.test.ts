/**
 * auto_sell.test.ts — auto-sell off-peak upgrade (GDD C4).
 *
 * The upgrade is additive + default-OFF: a save without it behaves exactly as
 * before (leftover roasted stock carries over). When on, endOfDay liquidates
 * leftover roasted stock at a discount AFTER the day's sales and AFTER any
 * Derek pre-order is fulfilled.
 *
 * Pure node — no Phaser.
 */

import { describe, it, expect } from "vitest";
import { createState, endOfDay, buyAutoSell, chooseRescuePath } from "./engine.js";
import { serialize, deserialize } from "./persistence.js";
import {
  AUTO_SELL_DISCOUNT,
  AUTO_SELL_COST,
  DAILY_FIXED_COSTS,
  RESCUE_PREORDER_LBS,
} from "../data/economy.js";
import type { SimState } from "./types.js";

function withStock(seed: number, lbs: number, basis = 0.60, price = 1.50): SimState {
  const s = createState(seed);
  s.roastedStockLbs = lbs;
  s.roastedCostBasisPerLb = basis;
  s.sellPrice = price;
  return s;
}

describe("buyAutoSell", () => {
  it("requires cash; succeeds once; never twice", () => {
    const s = createState(1);
    s.cash = AUTO_SELL_COST - 1;
    expect(buyAutoSell(s)).toBeNull();
    expect(s.autoSellEnabled).toBe(false);

    s.cash = AUTO_SELL_COST + 100;
    const ev = buyAutoSell(s);
    expect(ev).not.toBeNull();
    expect(ev!.detail.upgradeType).toBe("auto_sell");
    expect(s.autoSellEnabled).toBe(true);
    expect(s.cash).toBeCloseTo(100, 6);

    expect(buyAutoSell(s)).toBeNull(); // one-time
    expect(s.cash).toBeCloseTo(100, 6);
  });
});

describe("auto-sell at endOfDay", () => {
  it("default OFF: leftover roasted stock carries over, unchanged", () => {
    const s = withStock(2, 40);
    const before = s.roastedStockLbs;
    const r = endOfDay(s);
    expect(s.roastedStockLbs).toBe(before); // carried over
    expect(r.autoSellLbs).toBe(0);
    expect(r.autoSellRevenue).toBe(0);
  });

  it("ON: liquidates leftover at the discount; revenue + COGS recognized", () => {
    const s = withStock(3, 50, 0.60, 1.50);
    s.autoSellEnabled = true;
    const r = endOfDay(s);

    const expectedRev = 50 * 1.50 * (1 - AUTO_SELL_DISCOUNT); // 50 × 1.35 = 67.50
    expect(r.autoSellLbs).toBe(50);
    expect(r.autoSellRevenue).toBeCloseTo(expectedRev, 6);
    expect(s.roastedStockLbs).toBe(0);
    // Folded into the day's P&L:
    expect(r.revenue).toBeCloseTo(expectedRev, 6);
    expect(r.cogs).toBeCloseTo(50 * 0.60, 6);          // 30
    expect(r.grossProfit).toBeCloseTo(expectedRev - 30, 6);
    expect(r.net).toBeCloseTo(expectedRev - 30 - DAILY_FIXED_COSTS, 6);
    // Cash credited (then fixed costs deducted at close):
    expect(r.cashAfter).toBeCloseTo(createState(3).cash + expectedRev - DAILY_FIXED_COSTS, 4);
  });

  it("ON but nothing left: no-op", () => {
    const s = withStock(4, 0);
    s.autoSellEnabled = true;
    const r = endOfDay(s);
    expect(r.autoSellLbs).toBe(0);
    expect(r.autoSellRevenue).toBe(0);
  });

  it("runs AFTER preorder fulfillment — never pre-empts Derek's order", () => {
    const s = createState(5);
    s.cash = 10;
    endOfDay(s);                       // → rescue offer
    chooseRescuePath(s, "preorder");   // owe RESCUE_PREORDER_LBS (100) roasted in 7d
    s.autoSellEnabled = true;
    s.roastedStockLbs = RESCUE_PREORDER_LBS + 30; // 130: enough for Derek + 30 leftover
    s.roastedCostBasisPerLb = 0.60;
    s.dayNumber = s.preorderObligation!.dueDayNumber; // delivery day
    const r = endOfDay(s);

    // Derek got his full order; only the 30-lb remainder was auto-sold.
    expect(s.preorderObligation).toBeNull();           // delivered in full
    expect(r.autoSellLbs).toBe(30);
    expect(s.roastedStockLbs).toBe(0);
    // No preorder_default debt was created (Derek wasn't shorted).
    expect(s.rescueDebts.some((d) => d.kind === "preorder_default")).toBe(false);
  });

  it("a real margin sale: discount still profits over cost basis, raises lifetime earnings", () => {
    const s = withStock(6, 20, 0.60, 1.50);
    s.autoSellEnabled = true;
    const lifeBefore = s.lifetimeEarned;
    const r = endOfDay(s);
    // 1.35 sell vs 0.60 cost → positive gross.
    expect(r.grossProfit).toBeGreaterThan(0);
    expect(s.lifetimeEarned).toBeGreaterThan(lifeBefore);
    // Ledger row includes the auto-sell revenue.
    expect(s.ledger[s.ledger.length - 1].revenue).toBeCloseTo(r.revenue, 6);
  });
});

describe("auto-sell gag accounting (RT fix)", () => {
  it("crossing a gag bucket via auto-sell records the lore (not silently lost)", () => {
    // GAG_EVERY_N_LBS_SOLD = 80. Auto-selling 100 lbs crosses one bucket.
    const s = withStock(8, 100, 0.60, 1.50);
    s.autoSellEnabled = true;
    expect(s.gagsSeen.size).toBe(0);
    endOfDay(s);
    // The crossed bucket recorded a lore entry (collection progressed) rather
    // than eating a future customer gag.
    expect(s.gagsSeen.size).toBeGreaterThanOrEqual(1);
    expect(s.unitsSoldLifetime).toBe(100);
  });

  it("auto-selling under one bucket records no spurious lore", () => {
    const s = withStock(9, 40, 0.60, 1.50); // < 80
    s.autoSellEnabled = true;
    endOfDay(s);
    expect(s.gagsSeen.size).toBe(0);
  });
});

describe("auto-sell persistence", () => {
  it("round-trips autoSellEnabled; legacy save defaults to false", () => {
    const s = createState(7);
    s.autoSellEnabled = true;
    expect(deserialize(serialize(s)).autoSellEnabled).toBe(true);

    const env = JSON.parse(serialize(createState(7)));
    delete env.sim.autoSellEnabled;
    expect(deserialize(JSON.stringify(env)).autoSellEnabled).toBe(false);

    const bad = JSON.parse(serialize(createState(7)));
    bad.sim.autoSellEnabled = "yes";
    expect(() => deserialize(JSON.stringify(bad))).toThrow(/autoSellEnabled/);
  });
});
