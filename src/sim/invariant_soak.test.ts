/**
 * invariant_soak.test.ts — consolidation wave (no new scope).
 *
 * A deterministic, multi-day "soak": drive the engine through a realistic mix
 * of buy / roast / sell / price-change / upgrade / rescue across many days, and
 * assert the CORE INVARIANTS hold after every single day. This is the safety net
 * for the now-intricate merged economy (ledger, supplier discount, brand
 * campaign, rescue arc + re-entry escalation + preorder-default debt) — it
 * catches cross-system regressions a single-feature unit test would miss.
 *
 * Pure node — no Phaser. Deterministic: every choice is a function of the day
 * index, so a failure reproduces exactly.
 *
 * Invariants (checked each day):
 *   I1  cash is finite and ≥ 0
 *   I2  no NaN / Infinity anywhere in the numeric state
 *   I3  stocks finite and ≥ 0
 *   I4  ledger P&L identity: net === (revenue − cogs) − fixed + offline
 *   I5  lifetimeEarned is monotonic non-decreasing
 *   I6  balance-sheet identity: equity === assets.total − liabilities.total,
 *       and inventories are valued ≥ 0
 *   I7  rescue debts: amountDue finite ≥ 0, dueDayNumber ≥ 1; preorder
 *       fulfilledLbs ≤ totalLbs; rescueMode consistent with outstanding lines
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  buyRaw,
  startRoast,
  tick,
  endOfDay,
  setPrice,
  chooseRescuePath,
  buyRoasterUpgrade,
  buyQueueSlot,
  balanceSheet,
  type RescuePath,
} from "./engine.js";
import { serialize, deserialize } from "./persistence.js";
import { DAY_DURATION_SECONDS, DAILY_FIXED_COSTS, PRICE_MIN, PRICE_MAX } from "../data/economy.js";
import type { SimState, DayReport } from "./types.js";

/** Every finite-number field we expect to stay numeric (deep, explicit). */
function assertAllFinite(s: SimState): void {
  const nums: Array<[string, number]> = [
    ["cash", s.cash], ["rawStockLbs", s.rawStockLbs], ["rawCostBasisPerLb", s.rawCostBasisPerLb],
    ["roastedStockLbs", s.roastedStockLbs], ["roastedCostBasisPerLb", s.roastedCostBasisPerLb],
    ["roastedDemandMultBlended", s.roastedDemandMultBlended], ["sellPrice", s.sellPrice],
    ["dayElapsedSeconds", s.dayElapsedSeconds], ["dayNumber", s.dayNumber],
    ["unitsSoldLifetime", s.unitsSoldLifetime], ["lifetimeEarned", s.lifetimeEarned],
    ["rescueEntryCount", s.rescueEntryCount], ["supplierLbsPurchased", s.supplierLbsPurchased],
    ["comebackTier", s.comebackTier], ["rngState", s.rngState],
  ];
  for (const [name, v] of nums) {
    expect(Number.isFinite(v), `${name} not finite: ${v}`).toBe(true);
  }
  for (const slot of s.roastSlots) {
    expect(Number.isFinite(slot.secondsRemaining)).toBe(true);
    expect(Number.isFinite(slot.batchLbs)).toBe(true);
  }
  for (const d of s.rescueDebts) {
    expect(Number.isFinite(d.amountDue)).toBe(true);
    expect(Number.isFinite(d.dueDayNumber)).toBe(true);
  }
  for (const e of s.ledger) {
    for (const v of [e.revenue, e.cogs, e.fixedCosts, e.net, e.debtService, e.cashAfter]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  }
}

function checkInvariants(s: SimState, r: DayReport, prevLifetime: number): void {
  // I1
  expect(s.cash).toBeGreaterThanOrEqual(0);
  expect(Number.isFinite(s.cash)).toBe(true);
  // I2
  assertAllFinite(s);
  // I3
  expect(s.rawStockLbs).toBeGreaterThanOrEqual(0);
  expect(s.roastedStockLbs).toBeGreaterThanOrEqual(0);
  // I4 — ledger P&L identity on the just-closed row
  const row = s.ledger[s.ledger.length - 1];
  expect(row.net).toBeCloseTo(row.revenue - row.cogs - row.fixedCosts + row.offlineEarned, 6);
  expect(row.fixedCosts).toBe(DAILY_FIXED_COSTS);
  // report agrees with ledger
  expect(r.net).toBeCloseTo(row.net, 6);
  // I5 — lifetimeEarned never decreases
  expect(s.lifetimeEarned).toBeGreaterThanOrEqual(prevLifetime - 1e-9);
  // I6 — balance sheet
  const bs = balanceSheet(s);
  expect(bs.equity).toBeCloseTo(bs.assets.total - bs.liabilities.total, 6);
  expect(bs.assets.cash).toBeGreaterThanOrEqual(0);
  expect(bs.assets.rawInventoryValue).toBeGreaterThanOrEqual(0);
  expect(bs.assets.roastedInventoryValue).toBeGreaterThanOrEqual(0);
  expect(bs.liabilities.debtsOwed).toBeGreaterThanOrEqual(0);
  expect(bs.liabilities.deferredRevenue).toBeGreaterThanOrEqual(0);
  // I7 — rescue consistency
  for (const d of s.rescueDebts) {
    expect(d.amountDue).toBeGreaterThanOrEqual(0);
    expect(d.dueDayNumber).toBeGreaterThanOrEqual(1);
  }
  if (s.preorderObligation) {
    expect(s.preorderObligation.fulfilledLbs).toBeLessThanOrEqual(s.preorderObligation.totalLbs + 1e-9);
  }
  // rescueMode "active" implies an outstanding line; never "offer" with debts (gate)
  if (s.rescueMode === "active") {
    expect(s.rescueDebts.length > 0 || s.preorderObligation !== null).toBe(true);
  }
}

/** Run one in-game day to close (sells roasted stock). */
function runDay(s: SimState): void {
  for (let h = 0; h < 14; h++) tick(s, 3_600);
  if (s.dayElapsedSeconds < DAY_DURATION_SECONDS) {
    tick(s, DAY_DURATION_SECONDS - s.dayElapsedSeconds + 1);
  }
}

describe("multi-day invariant soak", () => {
  it("holds all invariants across a 30-day varied playthrough", () => {
    let s = createState(20260607);
    s.cash = 800; // enough to act, low enough to eventually feel pressure
    let prevLifetime = s.lifetimeEarned;
    let roundTripped = false;

    for (let day = 1; day <= 30; day++) {
      // Day 15 is a forced "crunch day": no income, low cash → guarantees the
      // rescue arc fires at end-of-day (exercises rescue + the invariants under debt).
      const crunch = day === 15;

      // Vary price within bounds (deterministic sweep around the optimum).
      const price = PRICE_MIN + ((day * 7) % 100) / 100 * (PRICE_MAX - PRICE_MIN);
      setPrice(s, price);

      if (crunch) {
        // Strip income sources so end-of-day cash stays below the rescue threshold.
        s.cash = 8;
        s.roastedStockLbs = 0;
        for (const slot of s.roastSlots) Object.assign(slot, { status: "empty", batchLbs: 0, recipe: null, secondsRemaining: 0, totalSeconds: 0 });
      } else {
        // Buy raw most days (varying qty); occasionally skip to let stock run down.
        if (day % 4 !== 0) buyRaw(s, 50 + (day % 5) * 30);
        // Roast into any empty slot.
        for (let i = 0; i < s.roastSlots.length; i++) {
          if (s.roastSlots[i].status === "empty" && s.rawStockLbs >= 10) {
            startRoast(s, i, "classic_salted", Math.min(40, Math.floor(s.rawStockLbs)));
          }
        }
        // Occasionally invest (only succeeds when affordable — buyX returns null otherwise).
        if (day === 8) buyRoasterUpgrade(s);
        if (day === 12) buyQueueSlot(s);
      }

      runDay(s);
      const report = endOfDay(s);

      // If a rescue offer fired, take a path (rotate through them deterministically).
      if (s.rescueMode === "offer") {
        const paths: RescuePath[] = ["loan", "credit", "preorder", "payday", "decline"];
        chooseRescuePath(s, paths[day % paths.length]);
      }

      checkInvariants(s, report, prevLifetime);
      prevLifetime = s.lifetimeEarned;

      // Mid-soak: a full save/load round-trip must preserve the complex state.
      if (day === 18) {
        const loaded = deserialize(serialize(s));
        expect(loaded.cash).toBeCloseTo(s.cash, 6);
        expect(loaded.ledger.length).toBe(s.ledger.length);
        expect(loaded.rescueDebts.length).toBe(s.rescueDebts.length);
        expect(loaded.supplierLbsPurchased).toBe(s.supplierLbsPurchased);
        assertAllFinite(loaded);
        s = loaded;
        roundTripped = true;
      }
    }

    expect(roundTripped).toBe(true);
    expect(s.dayNumber).toBe(31);       // 30 days closed
    expect(s.ledger.length).toBeGreaterThan(0);
    // The soak actually exercised the rescue arc at least once.
    expect(s.rescueEntryCount).toBeGreaterThan(0);
  });

  it("a pathological all-mispriced run never breaks invariants (losses, but consistent)", () => {
    // Price floor every day = below COGS on most stock → losing money, but the
    // engine must stay consistent (no negative cash, no NaN, identities hold).
    const s = createState(7);
    s.cash = 200;
    let prev = s.lifetimeEarned;
    for (let day = 1; day <= 14; day++) {
      setPrice(s, PRICE_MIN);
      buyRaw(s, 30);
      if (s.roastSlots[0].status === "empty") startRoast(s, 0, "classic_salted", 20);
      runDay(s);
      const r = endOfDay(s);
      if (s.rescueMode === "offer") chooseRescuePath(s, "decline");
      checkInvariants(s, r, prev);
      prev = s.lifetimeEarned;
    }
  });
});
