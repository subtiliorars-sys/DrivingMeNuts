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
import { createState, endOfDay, chooseRescuePath } from "./engine.js";
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

  it("RT-1b: the preorder loop is NOT net-positive over repeated defaults", () => {
    // Model the exploit: take preorder cash, convert to inventory, default, repeat.
    // With the fix, each default leaves an equal debt, so net worth (cash + raw
    // inventory value − debts owed) never ratchets up across cycles.
    const state = createState(9);
    state.cash = 50;

    const netWorth = (): number => {
      const debts = state.rescueDebts.reduce((s, d) => s + d.amountDue, 0);
      return state.cash + state.rawStockLbs * 0.40 - debts;
    };

    const before = netWorth();
    for (let cycle = 0; cycle < 3; cycle++) {
      state.cash = 10;            // force a crisis
      endOfDay(state);
      if (state.rescueMode !== "offer") break;
      chooseRescuePath(state, "preorder"); // +cash, owe lbs
      // never deliver; jump to due day
      state.roastedStockLbs = 0;
      // due day is the LATEST among debts/obligation
      const due = Math.max(
        state.preorderObligation?.dueDayNumber ?? 0,
        ...state.rescueDebts.map((d) => d.dueDayNumber),
        state.dayNumber,
      );
      state.dayNumber = due;
      endOfDay(state);
    }
    // Net worth must not have grown by free money (allow small fixed-cost drift down).
    expect(netWorth()).toBeLessThanOrEqual(before + 0.01);
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
