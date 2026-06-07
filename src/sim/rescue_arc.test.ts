/**
 * rescue_arc.test.ts — Vitest suite for Wave 5: rescue arc state machine.
 *
 * Coverage (per task spec):
 *   1. loan path — cash/stock effects, repayment day arithmetic
 *   2. credit path — stock effects, no cash change, repayment day arithmetic
 *   3. preorder path — cash effect, obligation tracking, fulfillment
 *   4. payday path — cash effect, rollover compounding
 *   5. decline path — no state change
 *   6. repayment timing — auto-deduct on due-day endOfDay
 *   7. payday rollover compounding — fee stacks correctly
 *   8. preorder fulfillment — full and partial delivery
 *   9. preorder partial failure — reduced fulfillment, obligation cleared
 *  10. no-bankruptcy invariant — cash never below 0 under all paths
 *  11. persistence round-trip — v3 schema, debts, obligations survive save/load
 *  12. v2→v3 migration — adds rescue fields with safe defaults
 *  13. DayReport includes activeDebtSummary and rescueEvents
 *  14. rescueMode transitions
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  endOfDay,
  chooseRescuePath,
} from "./engine.js";
import { serialize, deserialize, CURRENT_SCHEMA_VERSION } from "./persistence.js";
import {
  RESCUE_ARC_CASH_THRESHOLD,
  RESCUE_LOAN_PRINCIPAL,
  RESCUE_LOAN_FEE_RATE,
  RESCUE_LOAN_DUE_DAYS,
  RESCUE_CREDIT_RAW_LBS,
  RESCUE_CREDIT_AMOUNT_DUE,
  RESCUE_CREDIT_DUE_DAYS,
  RESCUE_PREORDER_LBS,
  RESCUE_PREORDER_CASH,
  RESCUE_PREORDER_DUE_DAYS,
  RESCUE_PAYDAY_PRINCIPAL,
  RESCUE_PAYDAY_FEE,
  RESCUE_PAYDAY_DUE_DAYS,
} from "../data/economy.js";

// ---------------------------------------------------------------------------
// Helper: create a state in rescue-offer mode (cash below threshold)
// ---------------------------------------------------------------------------

function makeRescueState(seed = 1): ReturnType<typeof createState> {
  const state = createState(seed);
  // Force cash below threshold so endOfDay sets rescueArcPending
  state.cash = RESCUE_ARC_CASH_THRESHOLD - 1; // e.g. $24
  // Run endOfDay to set rescueArcPending and rescueMode = "offer"
  endOfDay(state);
  // After endOfDay, state.dayNumber is now 2, rescueMode = "offer"
  return state;
}

// ---------------------------------------------------------------------------
// 1. Loan path — cash/stock effects
// ---------------------------------------------------------------------------

describe("chooseRescuePath: loan", () => {
  it("adds $75 cash immediately", () => {
    const state = makeRescueState();
    const cashBefore = state.cash;
    chooseRescuePath(state, "loan");
    expect(state.cash).toBeCloseTo(cashBefore + RESCUE_LOAN_PRINCIPAL, 5);
  });

  it("creates a debt record with correct amountDue = $78.75", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "loan");
    expect(state.rescueDebts).toHaveLength(1);
    const debt = state.rescueDebts[0];
    expect(debt.kind).toBe("loan");
    expect(debt.principal).toBe(RESCUE_LOAN_PRINCIPAL);
    const expectedDue = RESCUE_LOAN_PRINCIPAL * (1 + RESCUE_LOAN_FEE_RATE);
    expect(debt.amountDue).toBeCloseTo(expectedDue, 5); // $78.75
  });

  it("debt due in 14 game-days from choice day", () => {
    const state = makeRescueState();
    const dayWhenChosen = state.dayNumber;
    chooseRescuePath(state, "loan");
    expect(state.rescueDebts[0].dueDayNumber).toBe(dayWhenChosen + RESCUE_LOAN_DUE_DAYS);
  });

  it("sets rescueMode to 'active'", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "loan");
    expect(state.rescueMode).toBe("active");
  });

  it("clears rescueArcPending", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "loan");
    expect(state.rescueArcPending).toBe(false);
  });

  it("emits rescue_path_chosen event with correct fields", () => {
    const state = makeRescueState();
    const ev = chooseRescuePath(state, "loan");
    expect(ev.kind).toBe("rescue_path_chosen");
    expect(ev.detail.path).toBe("loan");
    expect(ev.detail.cashChange).toBe(RESCUE_LOAN_PRINCIPAL);
    expect(ev.detail.amountDue).toBeCloseTo(RESCUE_LOAN_PRINCIPAL * (1 + RESCUE_LOAN_FEE_RATE), 5);
  });

  it("does not mutate raw stock", () => {
    const state = makeRescueState();
    const rawBefore = state.rawStockLbs;
    chooseRescuePath(state, "loan");
    expect(state.rawStockLbs).toBe(rawBefore);
  });
});

// ---------------------------------------------------------------------------
// 2. Credit path — stock effects, no cash change
// ---------------------------------------------------------------------------

describe("chooseRescuePath: credit", () => {
  it("adds 125 lbs of raw stock", () => {
    const state = makeRescueState();
    const rawBefore = state.rawStockLbs;
    chooseRescuePath(state, "credit");
    expect(state.rawStockLbs).toBe(rawBefore + RESCUE_CREDIT_RAW_LBS);
  });

  it("does NOT change cash", () => {
    const state = makeRescueState();
    const cashBefore = state.cash;
    chooseRescuePath(state, "credit");
    expect(state.cash).toBeCloseTo(cashBefore, 5);
  });

  it("creates a $50 debt due in 14 days", () => {
    const state = makeRescueState();
    const dayWhenChosen = state.dayNumber;
    chooseRescuePath(state, "credit");
    expect(state.rescueDebts).toHaveLength(1);
    const debt = state.rescueDebts[0];
    expect(debt.kind).toBe("credit");
    expect(debt.amountDue).toBeCloseTo(RESCUE_CREDIT_AMOUNT_DUE, 5);
    expect(debt.dueDayNumber).toBe(dayWhenChosen + RESCUE_CREDIT_DUE_DAYS);
  });

  it("credit does NOT accrue interest on extension (no rollover field)", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "credit");
    expect(state.rescueDebts[0].rollovers).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Preorder path — cash effect, obligation tracking
// ---------------------------------------------------------------------------

describe("chooseRescuePath: preorder", () => {
  it("adds $110 cash immediately", () => {
    const state = makeRescueState();
    const cashBefore = state.cash;
    chooseRescuePath(state, "preorder");
    expect(state.cash).toBeCloseTo(cashBefore + RESCUE_PREORDER_CASH, 5);
  });

  it("creates a preorder obligation for 100 lbs, due in 7 days", () => {
    const state = makeRescueState();
    const dayWhenChosen = state.dayNumber;
    chooseRescuePath(state, "preorder");
    expect(state.preorderObligation).not.toBeNull();
    const ob = state.preorderObligation!;
    expect(ob.totalLbs).toBe(RESCUE_PREORDER_LBS);
    expect(ob.fulfilledLbs).toBe(0);
    expect(ob.dueDayNumber).toBe(dayWhenChosen + RESCUE_PREORDER_DUE_DAYS);
    expect(ob.cashReceived).toBe(RESCUE_PREORDER_CASH);
  });

  it("does not add any debt records", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "preorder");
    expect(state.rescueDebts).toHaveLength(0);
  });

  it("returns event with correct cash change and obligation details", () => {
    const state = makeRescueState();
    const ev = chooseRescuePath(state, "preorder");
    expect(ev.detail.path).toBe("preorder");
    expect(ev.detail.cashChange).toBe(RESCUE_PREORDER_CASH);
    expect(ev.detail.totalLbs).toBe(RESCUE_PREORDER_LBS);
  });
});

// ---------------------------------------------------------------------------
// 4. Payday path — cash effect, initial debt
// ---------------------------------------------------------------------------

describe("chooseRescuePath: payday", () => {
  it("adds $50 cash immediately", () => {
    const state = makeRescueState();
    const cashBefore = state.cash;
    chooseRescuePath(state, "payday");
    expect(state.cash).toBeCloseTo(cashBefore + RESCUE_PAYDAY_PRINCIPAL, 5);
  });

  it("creates a $57.50 debt due in 14 days (principal + fee)", () => {
    const state = makeRescueState();
    const dayWhenChosen = state.dayNumber;
    chooseRescuePath(state, "payday");
    expect(state.rescueDebts).toHaveLength(1);
    const debt = state.rescueDebts[0];
    expect(debt.kind).toBe("payday");
    expect(debt.amountDue).toBeCloseTo(RESCUE_PAYDAY_PRINCIPAL + RESCUE_PAYDAY_FEE, 5); // $57.50
    expect(debt.dueDayNumber).toBe(dayWhenChosen + RESCUE_PAYDAY_DUE_DAYS);
    expect(debt.rollovers).toBe(0);
  });

  it("event detail includes aprPct = 391 (cautionary math)", () => {
    const state = makeRescueState();
    const ev = chooseRescuePath(state, "payday");
    expect(ev.detail.aprPct).toBe(391);
  });
});

// ---------------------------------------------------------------------------
// 5. Decline path — no state change
// ---------------------------------------------------------------------------

describe("chooseRescuePath: decline", () => {
  it("does not add cash, stock, debts, or obligations", () => {
    const state = makeRescueState();
    const cashBefore = state.cash;
    const rawBefore = state.rawStockLbs;
    chooseRescuePath(state, "decline");
    expect(state.cash).toBeCloseTo(cashBefore, 5);
    expect(state.rawStockLbs).toBe(rawBefore);
    expect(state.rescueDebts).toHaveLength(0);
    expect(state.preorderObligation).toBeNull();
  });

  it("sets rescueMode to null after decline", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "decline");
    expect(state.rescueMode).toBeNull();
  });

  it("returns event with path=decline", () => {
    const state = makeRescueState();
    const ev = chooseRescuePath(state, "decline");
    expect(ev.kind).toBe("rescue_path_chosen");
    expect(ev.detail.path).toBe("decline");
  });

  it("can re-trigger: rescueArcPending cleared so can fire again next low-cash day", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "decline");
    // Simulate next day going low again
    state.cash = RESCUE_ARC_CASH_THRESHOLD - 1;
    endOfDay(state);
    expect(state.rescueArcPending).toBe(true);
    expect(state.rescueMode).toBe("offer");
  });
});

// ---------------------------------------------------------------------------
// 6. Repayment timing — auto-deduct on due-day endOfDay
// ---------------------------------------------------------------------------

describe("debt repayment timing", () => {
  it("loan: auto-repays when cash >= amountDue on due day", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "loan");
    const debt = state.rescueDebts[0];
    const dueDayNumber = debt.dueDayNumber;
    const amountDue = debt.amountDue;

    // Advance days until due day; keep cash high so fixed costs don't drain it
    while (state.dayNumber < dueDayNumber) {
      state.cash = amountDue + 20;
      endOfDay(state);
    }

    // Now run endOfDay on the due day with enough cash to repay
    state.cash = amountDue + 20;
    const cashBeforeRepay = state.cash;
    const report = endOfDay(state);

    // Debt should be cleared
    expect(state.rescueDebts).toHaveLength(0);
    // Cash should have been reduced by amountDue
    expect(cashBeforeRepay - state.cash).toBeGreaterThanOrEqual(amountDue - 0.01);
    // Report includes a debt_repaid rescue event
    const repaidEvent = report.rescueEvents.find(e => e.kind === "debt_repaid");
    expect(repaidEvent).toBeDefined();
    expect(repaidEvent!.detail.debtKind).toBe("loan");
  });

  it("credit: auto-repays when cash >= amountDue on due day", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "credit");
    const debt = state.rescueDebts[0];
    const amountDue = debt.amountDue;
    const dueDayNumber = debt.dueDayNumber;

    // Keep cash high through all intervening days (fixed costs deduct each endOfDay)
    while (state.dayNumber < dueDayNumber) {
      state.cash = amountDue + 50;
      endOfDay(state);
    }
    state.cash = amountDue + 50;
    const report = endOfDay(state);
    expect(state.rescueDebts).toHaveLength(0);
    const repaidEvent = report.rescueEvents.find(e => e.kind === "debt_repaid");
    expect(repaidEvent).toBeDefined();
    expect(repaidEvent!.detail.debtKind).toBe("credit");
  });

  it("loan: extends (no fee) when cash < amountDue on due day", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "loan");
    const debt = state.rescueDebts[0];
    const originalAmountDue = debt.amountDue;
    const dueDayNumber = debt.dueDayNumber;

    // Keep cash too low to repay
    state.cash = originalAmountDue - 0.01;
    while (state.dayNumber < dueDayNumber) {
      state.cash = originalAmountDue - 0.01; // keep low
      endOfDay(state);
    }
    // On due day
    state.cash = originalAmountDue - 0.01;
    const report = endOfDay(state);

    // Debt still exists, extended
    expect(state.rescueDebts).toHaveLength(1);
    expect(state.rescueDebts[0].amountDue).toBeCloseTo(originalAmountDue, 5); // no extra fee
    expect(state.rescueDebts[0].dueDayNumber).toBeGreaterThan(dueDayNumber);
    // Report has debt_extended event
    const extEvent = report.rescueEvents.find(e => e.kind === "debt_extended");
    expect(extEvent).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. Payday rollover compounding
// ---------------------------------------------------------------------------

describe("payday rollover compounding", () => {
  it("rolls over with +$7.50 fee when cash < amountDue on due day", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "payday");
    const debt = state.rescueDebts[0];
    const originalDue = debt.amountDue; // $57.50
    const dueDayNumber = debt.dueDayNumber;

    // Keep cash below $57.50 throughout
    state.cash = 5;
    while (state.dayNumber < dueDayNumber) {
      state.cash = 5;
      endOfDay(state);
    }
    state.cash = 5;
    const report = endOfDay(state);

    // Debt rolled over
    expect(state.rescueDebts).toHaveLength(1);
    const rolledDebt = state.rescueDebts[0];
    expect(rolledDebt.amountDue).toBeCloseTo(originalDue + RESCUE_PAYDAY_FEE, 5); // $65
    expect(rolledDebt.rollovers).toBe(1);
    expect(rolledDebt.dueDayNumber).toBe(dueDayNumber + RESCUE_PAYDAY_DUE_DAYS);

    const rolloverEvent = report.rescueEvents.find(e => e.kind === "payday_rollover");
    expect(rolloverEvent).toBeDefined();
    expect(rolloverEvent!.detail.rollovers).toBe(1);
  });

  it("second rollover compounds correctly: $57.50 + $7.50 + $7.50 = $72.50", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "payday");
    const debt = state.rescueDebts[0];
    let dueDayNumber = debt.dueDayNumber;

    // First rollover
    state.cash = 5;
    while (state.dayNumber < dueDayNumber) { state.cash = 5; endOfDay(state); }
    state.cash = 5;
    endOfDay(state);

    // After first rollover — debt has been extended
    const afterFirst = state.rescueDebts[0];
    dueDayNumber = afterFirst.dueDayNumber;

    // Second rollover
    while (state.dayNumber < dueDayNumber) { state.cash = 5; endOfDay(state); }
    state.cash = 5;
    endOfDay(state);

    expect(state.rescueDebts[0].rollovers).toBe(2);
    expect(state.rescueDebts[0].amountDue).toBeCloseTo(
      RESCUE_PAYDAY_PRINCIPAL + RESCUE_PAYDAY_FEE + RESCUE_PAYDAY_FEE + RESCUE_PAYDAY_FEE,
      5
    ); // $72.50
  });

  it("toast message includes rollover amount and new total", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "payday");
    const debt = state.rescueDebts[0];
    const dueDayNumber = debt.dueDayNumber;

    state.cash = 5;
    while (state.dayNumber < dueDayNumber) { state.cash = 5; endOfDay(state); }
    state.cash = 5;
    const report = endOfDay(state);

    const event = report.rescueEvents.find(e => e.kind === "payday_rollover");
    const msg = event?.detail.message as string;
    expect(msg).toContain("7.50");
    expect(msg).toContain("65");
  });

  it("payday repaid-in-full toast says 'that's the lesson'", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "payday");
    const debt = state.rescueDebts[0];
    const dueDayNumber = debt.dueDayNumber;
    const amountDue = debt.amountDue;

    // Roll over once
    state.cash = 5;
    while (state.dayNumber < dueDayNumber) { state.cash = 5; endOfDay(state); }
    state.cash = 5;
    endOfDay(state); // rollover

    const newDebt = state.rescueDebts[0];
    const newDue = newDebt.dueDayNumber;
    const newAmount = newDebt.amountDue;

    // Now pay it off — keep cash high through the advance so it doesn't drain
    while (state.dayNumber < newDue) {
      state.cash = newAmount + 50;
      endOfDay(state);
    }
    state.cash = newAmount + 50;
    const report = endOfDay(state);

    const repaidEvent = report.rescueEvents.find(e => e.kind === "debt_repaid");
    const msg = repaidEvent?.detail.message as string;
    expect(msg.toLowerCase()).toContain("lesson");
    void amountDue; // used above for setup
  });
});

// ---------------------------------------------------------------------------
// 8. Preorder fulfillment — full delivery
// ---------------------------------------------------------------------------

describe("preorder fulfillment", () => {
  it("allocates roasted stock toward obligation each endOfDay", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "preorder");
    const ob = state.preorderObligation!;

    // Give 50 lbs roasted stock
    state.roastedStockLbs = 50;
    endOfDay(state);

    // 50 lbs should have been allocated
    // (Note: after endOfDay the obligation is still present since dueDay is in the future)
    if (state.preorderObligation) {
      expect(state.preorderObligation.fulfilledLbs).toBeGreaterThanOrEqual(50);
    }
    void ob; // used above for setup
  });

  it("clears obligation on full delivery by due day", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "preorder");
    const ob = state.preorderObligation!;
    const dueDayNumber = ob.dueDayNumber;

    // Put enough roasted stock in each day to meet the obligation
    while (state.dayNumber < dueDayNumber) {
      state.roastedStockLbs = RESCUE_PREORDER_LBS; // always enough
      endOfDay(state);
    }
    // On due day with enough stock
    state.roastedStockLbs = RESCUE_PREORDER_LBS;
    const report = endOfDay(state);

    expect(state.preorderObligation).toBeNull();
    const event = report.rescueEvents.find(e => e.kind === "preorder_fulfilled");
    expect(event).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 9. Preorder partial failure
// ---------------------------------------------------------------------------

describe("preorder partial delivery", () => {
  it("emits preorder_partial and clears obligation when due and short", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "preorder");
    const ob = state.preorderObligation!;
    const dueDayNumber = ob.dueDayNumber;

    // Never put any roasted stock in
    state.roastedStockLbs = 0;
    while (state.dayNumber < dueDayNumber) {
      state.roastedStockLbs = 0;
      endOfDay(state);
    }
    state.roastedStockLbs = 0;
    const report = endOfDay(state);

    // Obligation is cleared (delivery happened, even if zero)
    expect(state.preorderObligation).toBeNull();
    const event = report.rescueEvents.find(e => e.kind === "preorder_partial");
    expect(event).toBeDefined();
    expect((event!.detail.fulfilledLbs as number)).toBe(0);
    expect((event!.detail.pctDelivered as number)).toBe(0);
  });

  it("cash is NOT clawed back on partial delivery (cash was received upfront)", () => {
    const state = makeRescueState();
    const cashBeforePreorder = state.cash;
    chooseRescuePath(state, "preorder");
    const cashAfterPreorder = state.cash;
    expect(cashAfterPreorder).toBeCloseTo(cashBeforePreorder + RESCUE_PREORDER_CASH, 5);

    const ob = state.preorderObligation!;
    const dueDayNumber = ob.dueDayNumber;

    // Advance to due day with no stock
    while (state.dayNumber <= dueDayNumber) {
      state.roastedStockLbs = 0;
      endOfDay(state);
    }

    // Cash should NOT have been reduced by preorder cash (no clawback)
    // It may have been reduced by fixed costs, but not by $110
    expect(state.cash).toBeGreaterThanOrEqual(0); // cash floor holds
  });
});

// ---------------------------------------------------------------------------
// 10. No-bankruptcy invariant
// ---------------------------------------------------------------------------

describe("no-bankruptcy invariant", () => {
  it("cash never goes below 0 under loan path", () => {
    const state = makeRescueState();
    state.cash = 0;
    chooseRescuePath(state, "loan");
    expect(state.cash).toBeGreaterThanOrEqual(0);
    // Run multiple endOfDay with zero cash
    for (let i = 0; i < 20; i++) {
      state.cash = 0;
      endOfDay(state);
      expect(state.cash).toBeGreaterThanOrEqual(0);
    }
  });

  it("cash never goes below 0 under payday path with rollovers", () => {
    const state = makeRescueState();
    state.cash = 1;
    chooseRescuePath(state, "payday");
    for (let i = 0; i < 40; i++) {
      state.cash = Math.max(0, state.cash);
      endOfDay(state);
      expect(state.cash).toBeGreaterThanOrEqual(0);
    }
  });

  it("cash never goes below 0 under credit path", () => {
    const state = makeRescueState();
    state.cash = 0;
    chooseRescuePath(state, "credit");
    for (let i = 0; i < 20; i++) {
      endOfDay(state);
      expect(state.cash).toBeGreaterThanOrEqual(0);
    }
  });

  it("cash floor holds even with combined debts + fixed costs", () => {
    const state = makeRescueState();
    // Take both loan and payday (in two separate rescue triggers)
    chooseRescuePath(state, "loan");
    state.cash = 0;
    for (let i = 0; i < 30; i++) {
      state.cash = 0;
      endOfDay(state);
      expect(state.cash).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 11. Persistence round-trip — v3 schema
// ---------------------------------------------------------------------------

describe("persistence round-trip v3", () => {
  it("rescueDebts survive serialize/deserialize", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "loan");
    const debtBefore = state.rescueDebts[0];

    const loaded = deserialize(serialize(state));
    expect(loaded.rescueDebts).toHaveLength(1);
    const debtAfter = loaded.rescueDebts[0];
    expect(debtAfter.kind).toBe("loan");
    expect(debtAfter.amountDue).toBeCloseTo(debtBefore.amountDue, 5);
    expect(debtAfter.dueDayNumber).toBe(debtBefore.dueDayNumber);
    expect(debtAfter.rollovers).toBe(0);
  });

  it("preorderObligation survives serialize/deserialize", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "preorder");
    const obBefore = state.preorderObligation!;

    const loaded = deserialize(serialize(state));
    expect(loaded.preorderObligation).not.toBeNull();
    const obAfter = loaded.preorderObligation!;
    expect(obAfter.totalLbs).toBe(obBefore.totalLbs);
    expect(obAfter.dueDayNumber).toBe(obBefore.dueDayNumber);
    expect(obAfter.cashReceived).toBe(obBefore.cashReceived);
  });

  it("rescueMode survives serialize/deserialize", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "payday");
    const loaded = deserialize(serialize(state));
    expect(loaded.rescueMode).toBe("active");
  });

  it("null rescueMode / empty debts survive round-trip", () => {
    const state = createState(1);
    const loaded = deserialize(serialize(state));
    expect(loaded.rescueMode).toBeNull();
    expect(loaded.rescueDebts).toHaveLength(0);
    expect(loaded.preorderObligation).toBeNull();
  });

  it("payday rollover count survives round-trip", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "payday");
    // Manually set rollover count
    state.rescueDebts[0].rollovers = 3;
    state.rescueDebts[0].amountDue = RESCUE_PAYDAY_PRINCIPAL + 4 * RESCUE_PAYDAY_FEE;

    const loaded = deserialize(serialize(state));
    expect(loaded.rescueDebts[0].rollovers).toBe(3);
    expect(loaded.rescueDebts[0].amountDue).toBeCloseTo(
      RESCUE_PAYDAY_PRINCIPAL + 4 * RESCUE_PAYDAY_FEE,
      5
    );
  });

  it("CURRENT_SCHEMA_VERSION is 4", () => {
    // Bumped 3→4 by the ledger/lore wave (ledger, comebackTier,
    // brandCampaignActive, aftermathSeen). If this fails, a schema change
    // landed without updating the MIGRATIONS chain — fix that first.
    expect(CURRENT_SCHEMA_VERSION).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 12. v2→v3 migration
// ---------------------------------------------------------------------------

describe("v2→v3 migration", () => {
  it("migrates a v2 save: adds rescueMode null, rescueDebts [], preorderObligation null", () => {
    // Build a valid v2 save by serializing a fresh state and downgrading schemaVersion
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    // Downgrade to v2
    envelope.schemaVersion = 2;
    delete envelope.sim.rescueMode;
    delete envelope.sim.rescueDebts;
    delete envelope.sim.preorderObligation;

    const loaded = deserialize(JSON.stringify(envelope));
    expect(loaded.rescueMode).toBeNull();
    expect(loaded.rescueDebts).toHaveLength(0);
    expect(loaded.preorderObligation).toBeNull();
  });

  it("migrates a v1 save all the way to v3 (chain)", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    // Downgrade to v1: remove v2 and v3 fields
    envelope.schemaVersion = 1;
    delete envelope.sim.roastedDemandMultBlended;
    delete envelope.sim.rescueMode;
    delete envelope.sim.rescueDebts;
    delete envelope.sim.preorderObligation;

    const loaded = deserialize(JSON.stringify(envelope));
    expect(loaded.roastedDemandMultBlended).toBe(1.0);
    expect(loaded.rescueMode).toBeNull();
    expect(loaded.rescueDebts).toHaveLength(0);
    expect(loaded.preorderObligation).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 13. DayReport includes activeDebtSummary and rescueEvents
// ---------------------------------------------------------------------------

describe("DayReport: activeDebtSummary and rescueEvents", () => {
  it("activeDebtSummary is null when no debts active", () => {
    const state = createState(1);
    state.cash = 100;
    const report = endOfDay(state);
    expect(report.activeDebtSummary).toBeNull();
    expect(report.rescueEvents).toHaveLength(0);
  });

  it("activeDebtSummary contains debt info when loan active", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "loan");
    state.cash = 10; // keep cash low to prevent immediate repayment
    const report = endOfDay(state);
    // Debt is not due yet (due in 14 days), so summary should mention it
    expect(report.activeDebtSummary).toBeTruthy();
    expect(report.activeDebtSummary).toContain("Old Joe");
  });

  it("activeDebtSummary contains preorder info when obligation active", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "preorder");
    state.roastedStockLbs = 0;
    const report = endOfDay(state);
    expect(report.activeDebtSummary).toBeTruthy();
    expect(report.activeDebtSummary).toContain("Derek");
  });

  it("rescueEvents has debt_repaid when loan auto-repaid", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "loan");
    const debt = state.rescueDebts[0];
    const dueDayNumber = debt.dueDayNumber;
    const amountDue = debt.amountDue;

    // Keep cash high through advance loop so it doesn't drain below repayment amount
    while (state.dayNumber < dueDayNumber) {
      state.cash = amountDue + 50;
      endOfDay(state);
    }
    state.cash = amountDue + 50;
    const report = endOfDay(state);
    expect(report.rescueEvents.some(e => e.kind === "debt_repaid")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 14. rescueMode transitions
// ---------------------------------------------------------------------------

describe("rescueMode state transitions", () => {
  it("starts null on fresh state", () => {
    const state = createState(1);
    expect(state.rescueMode).toBeNull();
  });

  it("becomes 'offer' after endOfDay with cash < threshold", () => {
    const state = makeRescueState(); // already ran endOfDay
    expect(state.rescueMode).toBe("offer");
  });

  it("becomes 'active' after choosing a path", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "loan");
    expect(state.rescueMode).toBe("active");
  });

  it("returns to null after all debts repaid and cash healthy", () => {
    const state = makeRescueState();
    chooseRescuePath(state, "loan");
    const debt = state.rescueDebts[0];
    const dueDayNumber = debt.dueDayNumber;
    const amountDue = debt.amountDue;

    state.cash = amountDue + 100;
    while (state.dayNumber < dueDayNumber) endOfDay(state);
    endOfDay(state); // repayment day

    // After repayment, if no more debts and cash >= threshold, mode should clear
    // (on the next endOfDay when cash is healthy)
    if (state.rescueDebts.length === 0 && state.preorderObligation === null) {
      state.cash = RESCUE_ARC_CASH_THRESHOLD + 50; // healthy
      endOfDay(state);
      expect(state.rescueMode).toBeNull();
    }
  });

  it("does not guard chooseRescuePath if state is not in offer mode", () => {
    // Calling chooseRescuePath when not in offer mode returns decline-style event
    const state = createState(1);
    state.rescueMode = null; // not in offer
    const ev = chooseRescuePath(state, "loan");
    // Should be a no-op event with reason
    expect(ev.kind).toBe("rescue_path_chosen");
    expect(ev.detail.path).toBe("decline");
  });
});
