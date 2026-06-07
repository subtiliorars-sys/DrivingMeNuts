/**
 * reentry.test.ts — rescue-arc re-entry escalation (RESCUE_ARC_SCRIPT §Re-Entry,
 * owner-approved 2026-06-07; the RT-1 deferral from wave 4).
 *
 * Invariants under test:
 *  - The one-concurrent-crisis gate (RT-1) STILL holds: no new offer while a
 *    crisis is active → no debt-stacking cash pump.
 *  - A repeat entry escalates terms (7% loan, 200lb/$220 Derek); Marta/QuickNut
 *    terms unchanged.
 *  - rescueEntryCount tracks taken paths (decline doesn't count) and persists.
 *  - Escalation makes repeat borrowing COSTLIER, never a money pump.
 *
 * Pure node — no Phaser.
 */

import { describe, it, expect } from "vitest";
import { createState, endOfDay, chooseRescuePath, balanceSheet } from "./engine.js";
import { serialize, deserialize } from "./persistence.js";
import {
  RESCUE_LOAN_PRINCIPAL,
  RESCUE_LOAN_FEE_RATE,
  RESCUE_LOAN_FEE_RATE_REPEAT,
  RESCUE_PREORDER_LBS,
  RESCUE_PREORDER_CASH,
  RESCUE_PREORDER_LBS_REPEAT,
  RESCUE_PREORDER_CASH_REPEAT,
  RESCUE_PAYDAY_PRINCIPAL,
  RESCUE_PAYDAY_FEE,
  RESCUE_CREDIT_AMOUNT_DUE,
  DAILY_FIXED_COSTS,
} from "../data/economy.js";
import type { SimState } from "./types.js";

/** Drive the state into an open rescue offer (end a day below the cash threshold). */
function intoOffer(state: SimState): void {
  state.cash = 10;
  endOfDay(state);
  expect(state.rescueMode).toBe("offer");
}

/** Fully resolve all active debts/obligations so the arc can re-trigger. */
function resolveAllDebts(state: SimState): void {
  // Loop a few closes: deliver any preorder IN FULL (so it doesn't default into
  // a debt), and auto-repay debts at their due day, until the sheet is clean.
  for (let i = 0; i < 6 && (state.rescueDebts.length > 0 || state.preorderObligation || state.rescueMode); i++) {
    state.cash = 100_000;
    if (state.preorderObligation) {
      // Stock enough roasted to fulfill the order in full on this close.
      state.roastedStockLbs = state.preorderObligation.totalLbs;
      state.roastedCostBasisPerLb = 0.60;
    }
    const maxDue = Math.max(
      ...state.rescueDebts.map((d) => d.dueDayNumber),
      state.preorderObligation?.dueDayNumber ?? 0,
      state.dayNumber,
    );
    state.dayNumber = maxDue;
    endOfDay(state);
  }
  expect(state.rescueDebts).toHaveLength(0);
  expect(state.preorderObligation).toBeNull();
  expect(state.rescueMode).toBeNull();
}

describe("re-entry escalation", () => {
  it("first loan is 5%, a second (post-resolution) loan is 7%", () => {
    const state = createState(1);

    intoOffer(state);
    const ev1 = chooseRescuePath(state, "loan");
    expect(ev1.detail.isRepeat).toBe(false);
    expect(ev1.detail.amountDue as number).toBeCloseTo(RESCUE_LOAN_PRINCIPAL * (1 + RESCUE_LOAN_FEE_RATE), 6);
    expect(state.rescueEntryCount).toBe(1);

    resolveAllDebts(state);

    intoOffer(state);
    const ev2 = chooseRescuePath(state, "loan");
    expect(ev2.detail.isRepeat).toBe(true);
    expect(ev2.detail.amountDue as number).toBeCloseTo(RESCUE_LOAN_PRINCIPAL * (1 + RESCUE_LOAN_FEE_RATE_REPEAT), 6);
    expect(ev2.detail.feeRate).toBe(RESCUE_LOAN_FEE_RATE_REPEAT);
    expect(state.rescueEntryCount).toBe(2);
  });

  it("Derek's pre-order scales up on repeat (100/$110 → 200/$220)", () => {
    const state = createState(2);
    intoOffer(state);
    const ev1 = chooseRescuePath(state, "preorder");
    expect(ev1.detail.totalLbs).toBe(RESCUE_PREORDER_LBS);
    expect(ev1.detail.cashChange).toBe(RESCUE_PREORDER_CASH);

    resolveAllDebts(state);

    intoOffer(state);
    const ev2 = chooseRescuePath(state, "preorder");
    expect(ev2.detail.totalLbs).toBe(RESCUE_PREORDER_LBS_REPEAT);
    expect(ev2.detail.cashChange).toBe(RESCUE_PREORDER_CASH_REPEAT);
    expect(state.preorderObligation!.totalLbs).toBe(RESCUE_PREORDER_LBS_REPEAT);
    expect(state.preorderObligation!.cashReceived).toBe(RESCUE_PREORDER_CASH_REPEAT);
  });

  it("Marta's credit and QuickNut terms are UNCHANGED on repeat", () => {
    const state = createState(3);
    intoOffer(state);
    chooseRescuePath(state, "credit");
    resolveAllDebts(state);
    intoOffer(state);
    const evCredit = chooseRescuePath(state, "credit");
    expect(evCredit.detail.amountDue).toBe(RESCUE_CREDIT_AMOUNT_DUE); // same $50
    expect(evCredit.detail.isRepeat).toBe(true);

    resolveAllDebts(state);
    intoOffer(state);
    const evPayday = chooseRescuePath(state, "payday");
    expect(evPayday.detail.amountDue as number).toBeCloseTo(RESCUE_PAYDAY_PRINCIPAL + RESCUE_PAYDAY_FEE, 6); // same $57.50
  });

  it("decline does NOT increment the entry count", () => {
    const state = createState(4);
    intoOffer(state);
    chooseRescuePath(state, "decline");
    expect(state.rescueEntryCount).toBe(0);
    expect(state.rescueMode).toBeNull();
  });

  it("RT-1 STILL holds: no new offer while a crisis is active (no stacking pump)", () => {
    const state = createState(5);
    intoOffer(state);
    chooseRescuePath(state, "loan");
    expect(state.rescueMode).toBe("active");

    // Keep cash low and close several days WITHOUT resolving the debt.
    // The offer must NOT reappear while the debt is live, so a second loan
    // cannot be taken — the debt-stacking cash pump stays closed.
    for (let i = 0; i < 5; i++) {
      state.cash = 10;
      // not at due day yet — debt persists, no auto-repay
      endOfDay(state);
      expect(state.rescueMode).not.toBe("offer");
      // chooseRescuePath is a no-op when not in offer mode
      const blocked = chooseRescuePath(state, "loan");
      expect(blocked.detail.reason).toBe("not_in_offer_mode");
    }
    // Exactly one debt ever created — no stacking.
    expect(state.rescueDebts.length).toBe(1);
    expect(state.rescueEntryCount).toBe(1);
  });

  it("escalation is costlier, not a pump: repeat loan owes MORE for the same $75", () => {
    const state = createState(6);
    intoOffer(state);
    chooseRescuePath(state, "loan");
    const firstOwe = state.rescueDebts[0].amountDue;
    resolveAllDebts(state);
    intoOffer(state);
    chooseRescuePath(state, "loan");
    const repeatOwe = state.rescueDebts[0].amountDue;
    // Same principal advanced, strictly higher repayment → worse for the player.
    expect(repeatOwe).toBeGreaterThan(firstOwe);
  });

  it("RT-1b: defaulting a preorder converts unearned cash to an owed debt (NO pump)", () => {
    const state = createState(8);
    intoOffer(state);
    const ev = chooseRescuePath(state, "preorder"); // +$110, owe 100 lbs in 7d
    const cashIn = ev.detail.cashChange as number;
    const totalLbs = ev.detail.totalLbs as number;
    expect(state.preorderObligation).not.toBeNull();

    // Deliver NOTHING: jump to the due day with zero roasted stock.
    state.roastedStockLbs = 0;
    state.dayNumber = state.preorderObligation!.dueDayNumber;
    const report = endOfDay(state);

    // The unearned cash is now a debt of kind preorder_default for the full infusion.
    const dflt = state.rescueDebts.find((d) => d.kind === "preorder_default");
    expect(dflt).toBeDefined();
    expect(dflt!.amountDue).toBeCloseTo(cashIn, 6);
    expect(report.rescueEvents.some((e) => e.kind === "preorder_partial")).toBe(true);
    // Obligation cleared, but the liability replaced it → net wealth not increased.
    expect(state.preorderObligation).toBeNull();
    void totalLbs;
  });

  it("RT-1b: equity (net worth) is CONSERVED through grant and default — no free money", () => {
    // The canonical net-worth measure is balanceSheet().equity (assets − liabilities).
    // Grant: cash up, deferred-revenue liability up → equity flat.
    // Default: deferred revenue → preorder_default debt at the SAME value → equity
    //          changes only by the day's fixed costs, never by a windfall.
    const state = createState(9);
    state.cash = 50; state.rawStockLbs = 0;

    intoOffer(state);
    const eqBeforeGrant = balanceSheet(state).equity;
    chooseRescuePath(state, "preorder"); // +$110 cash, +$110 deferred revenue
    expect(balanceSheet(state).equity).toBeCloseTo(eqBeforeGrant, 6);

    // Deliver nothing, run to the due day, close.
    state.roastedStockLbs = 0;
    state.dayNumber = state.preorderObligation!.dueDayNumber;
    const eqBeforeDefault = balanceSheet(state).equity;
    endOfDay(state);
    // Only the day's fixed costs leave; the $110 deferred-rev became a $110 debt.
    expect(balanceSheet(state).equity).toBeCloseTo(eqBeforeDefault - DAILY_FIXED_COSTS, 2);
    // And the gate keeps the arc "active" (debt outstanding) → no free re-infusion.
    expect(state.rescueMode).toBe("active");
  });

  it("RT-1b: partial delivery owes exactly the UNEARNED remainder", () => {
    const state = createState(12);
    intoOffer(state);
    chooseRescuePath(state, "preorder"); // 100 lbs / $110
    // Deliver half: 50 of 100 lbs.
    state.roastedStockLbs = 50;
    state.roastedCostBasisPerLb = 0.60;
    state.dayNumber = state.preorderObligation!.dueDayNumber;
    endOfDay(state);
    const d = state.rescueDebts.find((x) => x.kind === "preorder_default");
    expect(d).toBeDefined();
    // unearned = cashReceived × (1 − 50/100) = $110 × 0.5 = $55
    expect(d!.amountDue).toBeCloseTo(RESCUE_PREORDER_CASH * 0.5, 6);
  });

  it("preorder_default debt survives a save round-trip", () => {
    const state = createState(10);
    intoOffer(state);
    chooseRescuePath(state, "preorder");
    state.roastedStockLbs = 0;
    state.dayNumber = state.preorderObligation!.dueDayNumber;
    endOfDay(state);
    const loaded = deserialize(serialize(state));
    const d = loaded.rescueDebts.find((x) => x.kind === "preorder_default");
    expect(d).toBeDefined();
  });

  it("F-4: a crafted oversized debt amountDue is rejected on load", () => {
    const state = createState(13);
    intoOffer(state);
    chooseRescuePath(state, "loan");
    const env = JSON.parse(serialize(state));
    env.sim.rescueDebts[0].amountDue = 1e15; // unrepayable soft-lock attempt
    expect(() => deserialize(JSON.stringify(env))).toThrow(/amountDue/);
  });

  it("F-5: a crafted 'offer' mode with an outstanding debt is coerced to 'active'", () => {
    const state = createState(14);
    intoOffer(state);
    chooseRescuePath(state, "loan"); // active debt
    const env = JSON.parse(serialize(state));
    env.sim.rescueMode = "offer"; // crafted desync: offer on top of a live debt
    const loaded = deserialize(JSON.stringify(env));
    // Coerced back to active so the one-concurrent-crisis gate still holds.
    expect(loaded.rescueMode).toBe("active");
    expect(loaded.rescueDebts.length).toBe(1);
  });

  it("rescueEntryCount round-trips and legacy saves default to 0", () => {
    const state = createState(7);
    state.rescueEntryCount = 3;
    expect(deserialize(serialize(state)).rescueEntryCount).toBe(3);

    const env = JSON.parse(serialize(createState(7)));
    delete env.sim.rescueEntryCount;
    expect(deserialize(JSON.stringify(env)).rescueEntryCount).toBe(0);

    const bad = JSON.parse(serialize(createState(7)));
    bad.sim.rescueEntryCount = -2;
    expect(() => deserialize(JSON.stringify(bad))).toThrow(/rescueEntryCount/);
  });
});
