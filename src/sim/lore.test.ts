/**
 * lore.test.ts — Wave 2: Legume Lore gag event tests.
 *
 * Coverage:
 *   1. Determinism  — same seed → same gag sequence
 *   2. Frequency    — a full day yields ≥1 and ≤6 gags at default price
 *   3. Id validity  — all emitted lore ids exist in lore.ts
 *   4. gagsSeen     — collected ids accumulate in state
 */

import { describe, it, expect } from "vitest";
import { createState, tick } from "./engine.js";
import { LORE_LINES, LORE_BY_ID } from "../data/lore.js";
import { DAY_DURATION_SECONDS, GAG_EVERY_N_LBS_SOLD } from "../data/economy.js";
import type { SimEvent, SimState } from "./types.js";

// ---------------------------------------------------------------------------
// Helper: run a full simulated day with ample pre-loaded roasted stock.
// Direct state injection avoids the capital constraint of a fresh game state —
// this is a unit test of gag cadence, not an end-to-end economy test.
// Returns all events emitted.
// ---------------------------------------------------------------------------

function runFullDay(seed: number): { events: SimEvent[]; state: SimState } {
  const state = createState(seed);
  // Inject enough roasted stock to satisfy full-day demand (~280 lbs at default price).
  // This bypasses the roast queue and starting-capital limits intentionally.
  state.roastedStockLbs = 500;
  state.roastedCostBasisPerLb = 0.60; // classic_salted COGS

  const tickSecs = 60;
  const ticks = Math.ceil(DAY_DURATION_SECONDS / tickSecs) + 1;
  const allEvents: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    allEvents.push(...tick(state, tickSecs));
  }
  return { events: allEvents, state };
}

// ---------------------------------------------------------------------------
// 1. Determinism
// ---------------------------------------------------------------------------

describe("gag determinism", () => {
  it("same seed produces the same gag id sequence", () => {
    const run1 = runFullDay(7).events.filter((e) => e.kind === "gag");
    const run2 = runFullDay(7).events.filter((e) => e.kind === "gag");

    expect(run1.length).toBe(run2.length);
    expect(run1.length).toBeGreaterThan(0);
    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].detail.loreId).toBe(run2[i].detail.loreId);
      expect(run1[i].daySecond).toBe(run2[i].daySecond);
    }
  });

  it("different seeds produce different gag sequences", () => {
    const ids11 = runFullDay(11).events.filter((e) => e.kind === "gag").map((e) => e.detail.loreId);
    const ids99 = runFullDay(99).events.filter((e) => e.kind === "gag").map((e) => e.detail.loreId);

    // Both should have gags; they should not be identical sequences.
    expect(ids11.length).toBeGreaterThan(0);
    expect(ids99.length).toBeGreaterThan(0);
    const identical = ids11.length === ids99.length && ids11.every((id, i) => id === ids99[i]);
    expect(identical).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Frequency bound: ≥1 and ≤6 gags on a full default-price day
// ---------------------------------------------------------------------------

describe("gag frequency", () => {
  it("a full default-price day yields between 1 and 6 gag events", () => {
    for (const seed of [1, 2, 42, 100, 777]) {
      const gags = runFullDay(seed).events.filter((e) => e.kind === "gag");
      expect(gags.length).toBeGreaterThanOrEqual(1);
      expect(gags.length).toBeLessThanOrEqual(6);
    }
  });

  it("GAG_EVERY_N_LBS_SOLD constant is exported and positive", () => {
    expect(GAG_EVERY_N_LBS_SOLD).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Id validity — emitted ids exist in lore.ts
// ---------------------------------------------------------------------------

describe("gag lore id validity", () => {
  it("all emitted lore ids exist in LORE_BY_ID", () => {
    const gags = runFullDay(1).events.filter((e) => e.kind === "gag");
    expect(gags.length).toBeGreaterThan(0);
    for (const ev of gags) {
      const id = ev.detail.loreId as string;
      expect(LORE_BY_ID[id]).toBeDefined();
    }
  });

  it("LORE_LINES has at least 6 entries (early-tier set)", () => {
    expect(LORE_LINES.length).toBeGreaterThanOrEqual(6);
  });

  it("every LORE_LINES entry has id, customer, owner, and tone strings", () => {
    for (const line of LORE_LINES) {
      expect(typeof line.id).toBe("string");
      expect(typeof line.customer).toBe("string");
      expect(typeof line.owner).toBe("string");
      expect(typeof line.tone).toBe("string");
      expect(line.id.length).toBeGreaterThan(0);
      expect(line.customer.length).toBeGreaterThan(0);
      expect(line.owner.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. gagsSeen collection
// ---------------------------------------------------------------------------

describe("gagsSeen collection", () => {
  it("state.gagsSeen accumulates lore ids from gag events", () => {
    const { events, state } = runFullDay(1);
    const gagEvents = events.filter((e) => e.kind === "gag");
    expect(gagEvents.length).toBeGreaterThan(0);

    for (const ev of gagEvents) {
      expect(state.gagsSeen.has(ev.detail.loreId as string)).toBe(true);
    }
  });

  it("gagsSeen starts empty on createState", () => {
    const state = createState(42);
    expect(state.gagsSeen.size).toBe(0);
  });

  it("unitsSoldLifetime starts at 0 on createState", () => {
    const state = createState(1);
    expect(state.unitsSoldLifetime).toBe(0);
  });
});
