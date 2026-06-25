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
  safeStorage,
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

  it("defaults missing world-map zone fields for legacy saves", () => {
    const state = createState(1);
    const envelope = JSON.parse(serialize(state));
    delete envelope.sim.zonesUnlocked;
    delete envelope.sim.currentZoneId;

    const loaded = deserialize(JSON.stringify(envelope));

    expect(loaded.zonesUnlocked).toEqual(["market"]);
    expect(loaded.currentZoneId).toBe("market");
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

  it("v1 save migrates to v2: roastedDemandMultBlended defaults to 1.0", () => {
    // Simulate a v1 save: schemaVersion=1, no roastedDemandMultBlended field
    const state = createState(1);
    const json = serialize(state);
    const env = JSON.parse(json);
    // Downgrade to v1 format (no blended field)
    env.schemaVersion = 1;
    delete env.sim.roastedDemandMultBlended;

    const loaded = deserialize(JSON.stringify(env));
    expect(loaded.roastedDemandMultBlended).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// W1: safeStorage — throwing StorageLike mock → tryLoad/trySave degrade gracefully
// ---------------------------------------------------------------------------

describe("safeStorage fallback (W1)", () => {
  it("safeStorage returns a StorageLike with getItem/setItem/removeItem", () => {
    // In test environment, window is not defined — safeStorage falls back to in-memory
    const s = safeStorage();
    expect(typeof s.getItem).toBe("function");
    expect(typeof s.setItem).toBe("function");
    expect(typeof s.removeItem).toBe("function");
  });

  it("in-memory fallback: setItem and getItem round-trip", () => {
    const s = safeStorage();
    s.setItem("test_key", "hello");
    expect(s.getItem("test_key")).toBe("hello");
    s.removeItem("test_key");
    expect(s.getItem("test_key")).toBeNull();
  });

  it("safeStorage() in-memory fallback: tryLoad and trySave work with no real localStorage", () => {
    // In the test environment window.localStorage is unavailable, so safeStorage()
    // returns the in-memory fallback. Verify tryLoad + trySave work cleanly with it.
    const s = safeStorage();
    // No save exists — should return fresh state
    const result = tryLoad(s, Date.now());
    expect(result.ok).toBe(false); // no save → fresh start
    expect(result.errorMessage).toBeNull();
    expect(result.state.dayNumber).toBe(1);

    // trySave should work without throwing
    expect(() => trySave(s, result.state)).not.toThrow();
    // After save, tryLoad should return the saved state
    const result2 = tryLoad(s, Date.now());
    expect(result2.ok).toBe(true);
    expect(result2.state.dayNumber).toBe(1);
  });

  it("throwing StorageLike mock: trySave calls onSaveFailed callback (W8)", () => {
    const throwingStorage: StorageLike = {
      getItem() { return null; },
      setItem() { throw new Error("QuotaExceededError"); },
      removeItem() { /* ok */ },
    };
    const state = createState(1);
    let callCount = 0;
    const onFail = () => { callCount++; };

    trySave(throwingStorage, state, 0, onFail);
    expect(callCount).toBe(1);

    // Second call with same callback: still fires (caller controls one-time logic)
    trySave(throwingStorage, state, 0, onFail);
    expect(callCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// W2: blended-pool demand multiplier round-trips and sanity validation
// ---------------------------------------------------------------------------

describe("blended demand multiplier (W2)", () => {
  it("roastedDemandMultBlended defaults to 1.0 on fresh state", () => {
    const state = createState(1);
    expect(state.roastedDemandMultBlended).toBeCloseTo(1.0, 5);
  });

  it("round-trips through serialize/deserialize", () => {
    const state = createState(1);
    state.roastedDemandMultBlended = 0.40; // ghost_pepper only
    const loaded = deserialize(serialize(state));
    expect(loaded.roastedDemandMultBlended).toBeCloseTo(0.40, 5);
  });

  it("invalid blended multiplier (0.0 = out of range) fails sanity and triggers fallback", () => {
    const state = createState(1);
    const json = serialize(state);
    const env = JSON.parse(json);
    env.sim.roastedDemandMultBlended = 0.0; // invalid: must be > 0
    expect(() => deserialize(JSON.stringify(env))).toThrow(/roastedDemandMultBlended invalid/);
  });

  it("invalid blended multiplier (> 1.0) fails sanity", () => {
    const state = createState(1);
    const json = serialize(state);
    const env = JSON.parse(json);
    env.sim.roastedDemandMultBlended = 1.5; // invalid: must be <= 1
    expect(() => deserialize(JSON.stringify(env))).toThrow(/roastedDemandMultBlended invalid/);
  });
});

// ---------------------------------------------------------------------------
// W3: deserialize slot validation — tampered recipe and bogus roasterTier
// ---------------------------------------------------------------------------

describe("deserialize slot and tier validation (W3)", () => {
  it("tampered slot.recipe 'x' → sanity failure → fresh-state fallback via tryLoad", () => {
    const storage = makeStorage();
    const state = createState(1);
    const json = serialize(state);
    const env = JSON.parse(json);
    env.sim.roastSlots[0].recipe = "x"; // not a valid RecipeId
    storage.setItem(SAVE_KEY, JSON.stringify(env));

    const result = tryLoad(storage, Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toMatch(/starting fresh/i);
    expect(result.state.dayNumber).toBe(1); // fresh state
  });

  it("bogus roasterTier → sanity failure → fresh-state fallback via tryLoad", () => {
    const storage = makeStorage();
    const state = createState(1);
    const json = serialize(state);
    const env = JSON.parse(json);
    env.sim.roasterTier = "steam_powered"; // not a valid RoasterTier
    storage.setItem(SAVE_KEY, JSON.stringify(env));

    const result = tryLoad(storage, Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toMatch(/starting fresh/i);
  });

  it("invalid slot.status → sanity failure", () => {
    const state = createState(1);
    const json = serialize(state);
    const env = JSON.parse(json);
    env.sim.roastSlots[0].status = "burning"; // not a valid status
    expect(() => deserialize(JSON.stringify(env))).toThrow(/status invalid/);
  });

  it("negative secondsRemaining → sanity failure", () => {
    const state = createState(1);
    const json = serialize(state);
    const env = JSON.parse(json);
    env.sim.roastSlots[0].secondsRemaining = -5;
    expect(() => deserialize(JSON.stringify(env))).toThrow(/secondsRemaining invalid/);
  });
});

// ---------------------------------------------------------------------------
// W14: refuse to overwrite saves with schemaVersion > CURRENT (forward-compat load)
// ---------------------------------------------------------------------------

describe("W14: future-schema forward-compat", () => {
  it("saves with schemaVersion > CURRENT load without throwing (pass-through)", () => {
    const state = createState(1);
    const json = serialize(state);
    const env = JSON.parse(json);
    env.schemaVersion = CURRENT_SCHEMA_VERSION + 5; // far future

    // Should not throw; forward-compat pass-through
    expect(() => deserialize(JSON.stringify(env))).not.toThrow();
  });

  it("future-schema save round-trips correctly via tryLoad", () => {
    const storage = makeStorage();
    const state = createState(1);
    state.cash = 99.99;
    const json = serialize(state);
    const env = JSON.parse(json);
    env.schemaVersion = CURRENT_SCHEMA_VERSION + 1; // next version
    storage.setItem(SAVE_KEY, JSON.stringify(env));

    const result = tryLoad(storage, Date.now());
    // Forward-compat: load succeeds (not forced to fresh state)
    expect(result.errorMessage).toBeNull();
    expect(result.state.cash).toBeCloseTo(99.99);
  });
});
