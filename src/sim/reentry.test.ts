/**
 * reentry.test.ts — rescue-arc re-entry escalation.
 */

import { describe, it, expect } from "vitest";
import { createState, endOfDay, chooseRescuePath } from "./engine.js";
import type { SimState } from "./types.js";

function intoOffer(state: SimState) {
  state.cash = 10;
  endOfDay(state);
}

describe("re-entry escalation", () => {
  it("escalation is costlier: repeat loan owes MORE", () => {
    const state = createState(6);
    intoOffer(state);
    chooseRescuePath(state, "loan");
    const firstOwe = state.rescueDebts[0].amountDue;
    
    // Resolve
    state.cash = 100_000;
    state.dayNumber = state.rescueDebts[0].dueDayNumber;
    endOfDay(state);

    intoOffer(state);
    chooseRescuePath(state, "loan");
    const repeatOwe = state.rescueDebts[0].amountDue;
    
    expect(repeatOwe).toBeGreaterThan(firstOwe);
    expect(repeatOwe).toBeCloseTo(75 * (1 + 0.005), 6);
  });
});
