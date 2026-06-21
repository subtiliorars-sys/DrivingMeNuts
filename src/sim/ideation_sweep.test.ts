import { describe, it, expect } from "vitest";
import { createState, buyRaw, startRoast, tick, endOfDay } from "./engine.js";
import { weatherForDay, SUPPLIER_LEVEL_THRESHOLDS } from "../data/economy.js";

describe("Ideation Sweep Tasks Tests", () => {
  it("records weather in the ledger entry at end of day", () => {
    const state = createState(12345);
    
    // Day 1
    state.cash = 100;
    buyRaw(state, 20);
    startRoast(state, 0, "classic_salted", 10);
    
    // Run day to close
    for (let h = 0; h < 14; h++) tick(state, 3600);
    const report = endOfDay(state);
    
    const day1Weather = weatherForDay(1, state.weatherSeed);
    expect(report.dayNumber).toBe(1);
    expect(state.ledger.length).toBe(1);
    expect(state.ledger[0].weather).toBe(day1Weather);
    expect(state.ledger[0].day).toBe(1);
  });

  it("calculates supplier level thresholds and tracks progress accurately", () => {
    const state = createState(12345);
    state.cash = 10000; // Provide enough cash for purchases
    expect(state.supplierLbsPurchased).toBe(0);

    // Buy 200 lbs raw
    buyRaw(state, 200);
    expect(state.supplierLbsPurchased).toBe(200);

    // Goal for Level 1 is 500 lbs
    expect(SUPPLIER_LEVEL_THRESHOLDS[0]).toBe(500);
    expect(state.supplierLbsPurchased).toBeLessThan(SUPPLIER_LEVEL_THRESHOLDS[0]);

    // Buy 400 more lbs (total 600)
    buyRaw(state, 400);
    expect(state.supplierLbsPurchased).toBe(600);
  });
});
