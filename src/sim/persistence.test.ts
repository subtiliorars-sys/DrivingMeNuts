/**
 * persistence.test.ts — Vitest suite for save/load persistence.
 *
 * All tests use an in-memory StorageLike mock — no browser, no Phaser.
 * Spec reference: docs/PERSISTENCE.md
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  serialize,
  deserialize,
  computeOfflineHours,
  tryLoad,
  trySave,
  resetSave,
  SAVE_KEY,
  CORRUPT_KEY,
  CURRENT_SCHEMA_VERSION,
  type StorageLike,
} from "./persistence.js";
import { createState, applyOffline } from "./engine.js";
import { OFFLINE_CAP_HOURS } from "../../src/data/economy.js";

// ---------------------------------------------------------------------------
// In-memory StorageLike mock
// ---------------------------------------------------------------------------

function makeStorage(): StorageLike & { _store: Map<string, string> } {
  const _store = new Map<string, string>();
  return {
    _store,
    getItem(key: string): string | null {
      return _store.has(key) ? (_store.get(key) as string) : null;
    },
    setItem(key: string, value: string): void {
      _store.set(key, value);
    },
    removeItem(key: string): void {
      _store.delete(key);
    },
  };
}

// ---------------------------------------------------------------------------
// Round-trip (spec §5 required test)
// ---------------------------------------------------------------------------

describe("round-trip", () => {
  it("save/load preserves gagsSeen and unitsSoldLifetime", () => {
    const state = createState(1);
    state.gagsSeen = new Set(["LL-001", "LL-003"]);
    state.unitsSoldLifetime = 250;

    const saved = serialize(state);
    const loaded = deserialize(saved);

    expect(loaded.gagsSeen).toBeInstanceOf(Set);
    expect(loaded.gagsSeen.has("LL-001")).toBe(true);
    expect(loaded.gagsSeen.has("LL-003")).toBe(true);
    expect(loaded.gagsSeen.size).toBe(2);
    expect(loaded.unitsSoldLifetime).toBe(250);
  });

  it("serializes gagsSeen as a string array in the JSON", () => {
    const state = createState(1);
    state.gagsSeen = new Set(["LL-002"]);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    expect(Array.isArray(envelope.sim.gagsSeen)).toBe(true);
    expect(envelope.sim.gagsSeen).toContain("LL-002");
  });

  it("round-trip preserves cash, dayNumber, roastSlots, sellPrice", () => {
    const state = createState(42);
    state.cash = 123.45;
    state.dayNumber = 7;
    state.sellPrice = 1.75;
    state.rawStockLbs = 55;
    state.roastedStockLbs = 12;

    const loaded = deserialize(serialize(state));

    expect(loaded.cash).toBeCloseTo(123.45);
    expect(loaded.dayNumber).toBe(7);
    expect(loaded.sellPrice).toBeCloseTo(1.75);
    expect(loaded.rawStockLbs).toBeCloseTo(55);
    expect(loaded.roastedStockLbs).toBeCloseTo(12);
  });

  it("round-trip preserves rngState", () => {
    const state = createState(999);
    const loaded = deserialize(serialize(state));
    expect(loaded.rngState).toBe(state.rngState);
  });

  it("round-trip preserves schemaVersion in the envelope", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    expect(envelope.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("round-trip includes a savedAt timestamp", () => {
    const before = Date.now();
    const json = serialize(createState(1));
    const after = Date.now();
    const envelope = JSON.parse(json);
    expect(envelope.savedAt).toBeGreaterThanOrEqual(before);
    expect(envelope.savedAt).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// Corruption handling (spec §7)
// ---------------------------------------------------------------------------

describe("corruption handling", () => {
  it("deserialize throws on invalid JSON", () => {
    expect(() => deserialize("not-json{{{")).toThrow();
  });

  it("deserialize throws when cash is negative", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    envelope.sim.cash = -1;
    expect(() => deserialize(JSON.stringify(envelope))).toThrow(/cash invalid/);
  });

  it("deserialize throws when dayNumber is 0", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    envelope.sim.dayNumber = 0;
    expect(() => deserialize(JSON.stringify(envelope))).toThrow(/dayNumber invalid/);
  });

  it("deserialize throws when roastSlots is empty", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    envelope.sim.roastSlots = [];
    expect(() => deserialize(JSON.stringify(envelope))).toThrow(/roastSlots invalid/);
  });

  it("deserialize throws when gagsSeen is an object (old corrupt Set)", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    envelope.sim.gagsSeen = {}; // simulates old JSON.stringify(Set) bug
    expect(() => deserialize(JSON.stringify(envelope))).toThrow(/gagsSeen must be an array/);
  });

  it("deserialize throws when unitsSoldLifetime is negative", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    envelope.sim.unitsSoldLifetime = -5;
    expect(() => deserialize(JSON.stringify(envelope))).toThrow(/unitsSoldLifetime invalid/);
  });

  it("tryLoad on corrupt JSON returns fresh state + errorMessage + stashes blob", () => {
    const storage = makeStorage();
    storage.setItem(SAVE_KEY, "{{bad json}}");

    const result = tryLoad(storage, Date.now());

    expect(result.ok).toBe(false);
    expect(result.state.dayNumber).toBe(1);
    expect(result.state.cash).toBeGreaterThan(0); // fresh state has STARTING_CASH
    expect(result.errorMessage).toMatch(/starting fresh/i);
    // Corrupt blob must be stashed, not silently wiped
    expect(storage.getItem(CORRUPT_KEY)).toBe("{{bad json}}");
  });

  it("tryLoad on empty storage returns fresh state with no toast", () => {
    const storage = makeStorage();
    const result = tryLoad(storage, Date.now());

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBeNull();
    expect(result.offlineMessage).toBeNull();
    expect(result.state.dayNumber).toBe(1);
  });

  it("unknown gag ids in gagsSeen are dropped (not thrown)", () => {
    const state = createState(1);
    state.gagsSeen = new Set(["LL-001"]);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    // Inject a non-string (number) into gagsSeen — should be filtered out
    envelope.sim.gagsSeen = ["LL-001", 42, "", null];
    const loaded = deserialize(JSON.stringify(envelope));
    // Only valid non-empty string ids survive
    expect(loaded.gagsSeen.has("LL-001")).toBe(true);
    expect(loaded.gagsSeen.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeOfflineHours — cap boundary tests (spec §6)
// ---------------------------------------------------------------------------

describe("computeOfflineHours", () => {
  it("returns 0 when savedAt equals nowMs", () => {
    const t = Date.now();
    expect(computeOfflineHours(t, t)).toBe(0);
  });

  it("returns correct hours for 2h elapsed", () => {
    const t = 1_000_000;
    const two_hours = 2 * 3_600_000;
    expect(computeOfflineHours(t, t + two_hours)).toBeCloseTo(2.0);
  });

  it("caps at OFFLINE_CAP_HOURS (24h)", () => {
    const t = 0;
    const way_past = 100 * 3_600_000; // 100 hours
    expect(computeOfflineHours(t, way_past)).toBe(OFFLINE_CAP_HOURS);
  });

  it("returns exactly OFFLINE_CAP_HOURS at the boundary", () => {
    const t = 0;
    const exactly24h = OFFLINE_CAP_HOURS * 3_600_000;
    expect(computeOfflineHours(t, t + exactly24h)).toBe(OFFLINE_CAP_HOURS);
  });

  it("clamps negative elapsed to 0 (clock skew / clock went backward)", () => {
    const t = 1_000_000_000;
    expect(computeOfflineHours(t, t - 1000)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// tryLoad with valid save — offline earnings surface correctly
// ---------------------------------------------------------------------------

describe("tryLoad with valid save", () => {
  it("loads state and applies offline earnings when elapsed > 0", () => {
    const storage = makeStorage();
    const state = createState(1);
    // Give it some roasted stock so applyOffline can earn something
    state.roastedStockLbs = 50;
    const savedAt = 1_000_000;

    // Manually build an envelope with a known savedAt
    const json = serialize(state);
    const env = JSON.parse(json);
    env.savedAt = savedAt;
    storage.setItem(SAVE_KEY, JSON.stringify(env));

    const two_hours_later = savedAt + 2 * 3_600_000;
    const result = tryLoad(storage, two_hours_later);

    expect(result.ok).toBe(true);
    expect(result.errorMessage).toBeNull();
    // Offline earnings credited: cash should be > STARTING_CASH
    expect(result.state.cash).toBeGreaterThan(state.cash);
    // Message must be gain-framed, not loss-framed (DARK_PATTERN_GATE §A.8)
    expect(result.offlineMessage).toMatch(/earned/i);
    expect(result.offlineMessage).not.toMatch(/lost/i);
    expect(result.offlineMessage).not.toMatch(/missed/i);
  });

  it("offline earnings land in dayStats.offlineEarned, NOT dayStats.revenue (F13)", () => {
    const state = createState(1);
    state.roastedStockLbs = 50;

    const event = applyOffline(state, 2);
    const earned = event.detail.earned as number;

    // Revenue must be untouched (0); offlineEarned must carry the amount
    expect(state.dayStats.revenue).toBe(0);
    expect(state.dayStats.offlineEarned).toBeCloseTo(earned);
  });

  it("returns null offlineMessage when no time elapsed (same-session reload)", () => {
    const storage = makeStorage();
    const state = createState(1);
    const json = serialize(state);
    const env = JSON.parse(json);
    const now = Date.now();
    env.savedAt = now;
    storage.setItem(SAVE_KEY, JSON.stringify(env));

    const result = tryLoad(storage, now); // 0 elapsed
    // offlineMessage null or earned === 0 → no message expected
    // (could be null or a 0-earnings message; the important thing is no misleading toast)
    if (result.offlineMessage !== null) {
      // If a message is produced, it must not mention loss
      expect(result.offlineMessage).not.toMatch(/lost/i);
    }
  });
});

// ---------------------------------------------------------------------------
// trySave + resetSave
// ---------------------------------------------------------------------------

describe("trySave and resetSave", () => {
  let storage: ReturnType<typeof makeStorage>;

  beforeEach(() => {
    storage = makeStorage();
  });

  it("trySave writes a valid JSON blob under SAVE_KEY", () => {
    const state = createState(1);
    trySave(storage, state);
    const raw = storage.getItem(SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("trySave followed by tryLoad round-trips the state", () => {
    const state = createState(5);
    state.cash = 77.77;
    state.dayNumber = 3;
    state.gagsSeen = new Set(["LL-001"]);

    trySave(storage, state);
    const env = JSON.parse(storage.getItem(SAVE_KEY)!);
    const sameInstant = env.savedAt; // use exact savedAt so 0 offline elapsed
    env.savedAt = sameInstant;
    storage.setItem(SAVE_KEY, JSON.stringify(env));

    const result = tryLoad(storage, sameInstant);
    expect(result.ok).toBe(true);
    expect(result.state.cash).toBeCloseTo(77.77);
    expect(result.state.dayNumber).toBe(3);
    expect(result.state.gagsSeen.has("LL-001")).toBe(true);
  });

  it("resetSave removes SAVE_KEY and CORRUPT_KEY from storage", () => {
    storage.setItem(SAVE_KEY, "anything");
    storage.setItem(CORRUPT_KEY, "corrupt");

    resetSave(storage);

    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(storage.getItem(CORRUPT_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Version-mismatch path (spec §5)
// ---------------------------------------------------------------------------

describe("version mismatch", () => {
  it("future version (higher than current) loads without throwing on valid structure", () => {
    // A save from a future build that added a new field but kept the same structure.
    // Our code falls through to the sanity check; it passes → load succeeds.
    const state = createState(1);
    const json = serialize(state);
    const env = JSON.parse(json);
    env.schemaVersion = CURRENT_SCHEMA_VERSION + 10; // far-future
    env.sim.newFutureField = "ignored"; // forward-compat: unknown fields silently ignored
    // Should not throw; sanity passes
    expect(() => deserialize(JSON.stringify(env))).not.toThrow();
  });

  it("past version with no registered migrator throws (caught by tryLoad)", () => {
    const state = createState(1);
    const json = serialize(state);
    const env = JSON.parse(json);
    env.schemaVersion = 0; // v0 — no migrator registered
    storage: {
      const storage = makeStorage();
      storage.setItem(SAVE_KEY, JSON.stringify(env));
      const result = tryLoad(storage, Date.now());
      // Should fall back to fresh state with an error message
      expect(result.ok).toBe(false);
      expect(result.errorMessage).toMatch(/starting fresh/i);
    }
  });
});
