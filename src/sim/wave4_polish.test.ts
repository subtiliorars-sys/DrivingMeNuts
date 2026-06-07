/**
 * wave4_polish.test.ts — Vitest suite for Wave 4 polish batch.
 *
 * Coverage:
 *   1. importEnvelopeText — validation path: corrupt JSON, sanity failure, success
 *   2. Late lore tier gate — LL-021+ appear only on day 20+
 *   3. optimumPrice — classic $1.90, honey $1.95, ghost $2.05 (formula verification)
 *   4. netHistory — accumulates in endOfDay, capped at 14, persists round-trip
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  endOfDay,
  optimumPrice,
} from "./engine.js";
import { serialize, deserialize, importEnvelopeText, type StorageLike } from "./persistence.js";
import { LORE_LINES, LORE_TIER_DAY_GATE } from "../data/lore.js";

// ---------------------------------------------------------------------------
// Minimal in-memory storage mock
// ---------------------------------------------------------------------------

function makeStorage(): StorageLike & { _store: Map<string, string> } {
  const _store = new Map<string, string>();
  return {
    _store,
    getItem: (k: string) => _store.get(k) ?? null,
    setItem: (k: string, v: string) => { _store.set(k, v); },
    removeItem: (k: string) => { _store.delete(k); },
  };
}

// ---------------------------------------------------------------------------
// 1. importEnvelopeText validation path
// ---------------------------------------------------------------------------

describe("importEnvelopeText", () => {
  it("rejects empty/blank text", () => {
    const storage = makeStorage();
    const result = importEnvelopeText("", storage);
    expect(result.ok).toBe(false);
    expect(result.state).toBeNull();
    expect(result.errorMessage).toBeTruthy();
    expect(storage._store.size).toBe(0); // no state change
  });

  it("rejects invalid JSON", () => {
    const storage = makeStorage();
    const result = importEnvelopeText("not json {{{", storage);
    expect(result.ok).toBe(false);
    expect(result.state).toBeNull();
    expect(result.errorMessage).toMatch(/import failed/i);
  });

  it("rejects valid JSON that fails sanity check (bad cash value)", () => {
    const state = createState(1);
    const json = serialize(state);
    // Corrupt: set cash to negative
    const env = JSON.parse(json);
    env.sim.cash = -100;
    const corrupt = JSON.stringify(env);

    const storage = makeStorage();
    const result = importEnvelopeText(corrupt, storage);
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toMatch(/import failed/i);
    expect(storage._store.size).toBe(0); // no write on failure
  });

  it("accepts a valid serialized save and writes to storage", () => {
    const state = createState(42);
    state.cash = 777;
    const json = serialize(state);

    const storage = makeStorage();
    const result = importEnvelopeText(json, storage);
    expect(result.ok).toBe(true);
    expect(result.state).not.toBeNull();
    expect(result.state!.cash).toBeCloseTo(777, 2);
    expect(storage._store.size).toBe(1); // wrote to SAVE_KEY
  });

  it("applies migrations on import (v1 envelope upgrades to current schema)", () => {
    // Build a v1-style envelope manually
    const state = createState(1);
    const env = JSON.parse(serialize(state));
    // Strip fields that didn't exist in v1
    delete env.sim.roastedDemandMultBlended;
    env.schemaVersion = 1;
    const v1Json = JSON.stringify(env);

    const storage = makeStorage();
    const result = importEnvelopeText(v1Json, storage);
    expect(result.ok).toBe(true);
    expect(result.state).not.toBeNull();
    // Migration should have set default 1.0
    expect(result.state!.roastedDemandMultBlended).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// 2. Late lore tier gate — LL-021–LL-040 appear only on day 20+
// ---------------------------------------------------------------------------

describe("late lore tier gate", () => {
  it("all LL-021+ lines have tier 'late'", () => {
    const lateLines = LORE_LINES.filter((l) => {
      const num = parseInt(l.id.replace("LL-", ""), 10);
      return num >= 21;
    });
    expect(lateLines.length).toBe(20); // LL-021 through LL-040
    for (const line of lateLines) {
      expect(line.tier).toBe("late");
    }
  });

  it("late-tier lines are not in the pool before day 20", () => {
    const lateGate = LORE_TIER_DAY_GATE["late"]; // 20
    expect(lateGate).toBe(20);

    const poolDay19 = LORE_LINES.filter((l) => 19 >= LORE_TIER_DAY_GATE[l.tier]);
    const lateInDay19 = poolDay19.filter((l) => l.tier === "late");
    expect(lateInDay19.length).toBe(0);
  });

  it("late-tier lines enter the pool on day 20+", () => {
    const poolDay20 = LORE_LINES.filter((l) => 20 >= LORE_TIER_DAY_GATE[l.tier]);
    const lateInDay20 = poolDay20.filter((l) => l.tier === "late");
    expect(lateInDay20.length).toBeGreaterThanOrEqual(20); // all 24 late lines
  });

  it("LORE_LINES has exactly 40 entries", () => {
    expect(LORE_LINES.length).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// 3. optimumPrice — formula verification
// ---------------------------------------------------------------------------

describe("optimumPrice", () => {
  it("classic_salted optimum is $1.90 (COGS $0.60, base $1.20, base_lbs 20, slope 10)", () => {
    // p* = (BASE_LBS/SLOPE + BASE_PRICE + COGS) / 2 = (20/10 + 1.20 + 0.60) / 2 = (2 + 1.80) / 2 = 1.90
    const p = optimumPrice("classic_salted");
    expect(p).toBeCloseTo(1.90, 2);
  });

  it("honey_cinnamon optimum is $1.95 (COGS $0.70)", () => {
    // p* = (2 + 1.20 + 0.70) / 2 = (2 + 1.90) / 2 = 3.90 / 2 = 1.95
    const p = optimumPrice("honey_cinnamon");
    expect(p).toBeCloseTo(1.95, 2);
  });

  it("ghost_pepper optimum is $2.05 (COGS $0.90)", () => {
    // p* = (2 + 1.20 + 0.90) / 2 = (2 + 2.10) / 2 = 4.10 / 2 = 2.05
    const p = optimumPrice("ghost_pepper");
    expect(p).toBeCloseTo(2.05, 2);
  });

  it("all optimum prices are within [PRICE_MIN, PRICE_MAX]", () => {
    for (const recipe of ["classic_salted", "honey_cinnamon", "ghost_pepper"] as const) {
      const p = optimumPrice(recipe);
      expect(p).toBeGreaterThanOrEqual(0.75);
      expect(p).toBeLessThanOrEqual(2.50);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. netHistory — accumulates in endOfDay, capped at 14, survives round-trip
// ---------------------------------------------------------------------------

describe("netHistory", () => {
  it("starts empty on createState", () => {
    const state = createState(1);
    expect(state.netHistory).toEqual([]);
  });

  it("endOfDay appends one entry per day", () => {
    const state = createState(1);
    state.roastedStockLbs = 10;
    state.roastedCostBasisPerLb = 0.60;

    endOfDay(state);
    expect(state.netHistory.length).toBe(1);

    endOfDay(state);
    expect(state.netHistory.length).toBe(2);
  });

  it("netHistory is capped at 14 entries", () => {
    const state = createState(1);
    for (let i = 0; i < 20; i++) {
      endOfDay(state);
    }
    expect(state.netHistory.length).toBe(14);
  });

  it("survives serialize/deserialize round-trip", () => {
    const state = createState(7);
    endOfDay(state);
    endOfDay(state);
    const net0 = state.netHistory[0];
    const net1 = state.netHistory[1];

    const loaded = deserialize(serialize(state));
    expect(loaded.netHistory.length).toBe(2);
    expect(loaded.netHistory[0]).toBeCloseTo(net0, 6);
    expect(loaded.netHistory[1]).toBeCloseTo(net1, 6);
  });

  it("defaults to [] when field absent in save (legacy save forward-compat)", () => {
    const state = createState(1);
    const env = JSON.parse(serialize(state));
    delete env.sim.netHistory;
    const loaded = deserialize(JSON.stringify(env));
    expect(loaded.netHistory).toEqual([]);
  });
});
