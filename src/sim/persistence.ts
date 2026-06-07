/**
 * persistence.ts — Save/load logic for Driving Me Nuts.
 *
 * Phaser-free. Pure functions over a StorageLike interface so every path is
 * unit-testable in Node without a browser. GameScene owns the storage object
 * (passes window.localStorage for real play, an in-memory mock for tests).
 *
 * Spec: docs/PERSISTENCE.md
 * Red-team fix F13: applyOffline writes to dayStats.offlineEarned, NOT revenue.
 * CRIT-1: LOCAL-ONLY. No server sync without a distinct Owner Decision.
 */

import type { SimState } from "./types.js";
import { createState, applyOffline } from "./engine.js";
import { OFFLINE_CAP_HOURS } from "../data/economy.js";
import type { RecipeId, RoasterTier } from "../data/economy.js";

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

/** localStorage key for the live save. */
export const SAVE_KEY = "dmn_save_v1";

/** Stash corrupt blobs here for post-mortem debugging (never surfaced to player). */
export const CORRUPT_KEY = "dmn_save_v1-corrupt";

/** Bump on every breaking schema change. Migration chain lives in MIGRATIONS below. */
export const CURRENT_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// StorageLike interface — injectable, testable
// ---------------------------------------------------------------------------

/**
 * Minimal subset of the Web Storage API that persistence needs.
 * Pass `window.localStorage` in the game; an in-memory object in tests.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// ---------------------------------------------------------------------------
// Save envelope (wire format)
// ---------------------------------------------------------------------------

/** SimState on the wire: Set<string> fields serialised as string[]. */
type SerializedSimState = Omit<SimState, "gagsSeen" | "recipesUnlocked"> & {
  gagsSeen: string[];
  recipesUnlocked: string[];
};

interface SaveMeta {
  /** Cumulative wall-clock seconds the player spent on-screen (excludes offline). */
  totalPlaytimeSeconds: number;
}

export interface SaveEnvelope {
  schemaVersion: number;
  savedAt: number;           // Date.now() at time of save
  sim: SerializedSimState;
  meta: SaveMeta;
}

// ---------------------------------------------------------------------------
// Migration table (§5) — empty at P2 ship; add entries on schema bumps
// ---------------------------------------------------------------------------

type Migrator = (raw: unknown) => SaveEnvelope;
const MIGRATIONS: Record<number, Migrator> = {
  // example: 1 → 2 would look like:
  //   1: (raw) => { ... return upgraded envelope ... },
};

/** Run the migration chain from the envelope's version up to CURRENT_SCHEMA_VERSION. */
function migrate(raw: unknown): SaveEnvelope {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = raw;
  let version: number = (current as SaveEnvelope)?.schemaVersion ?? 0;

  while (version < CURRENT_SCHEMA_VERSION) {
    const migrator = MIGRATIONS[version];
    if (!migrator) {
      throw new Error(`No migration from schema v${version} to v${version + 1}`);
    }
    current = migrator(current);
    version = (current as SaveEnvelope).schemaVersion;
  }

  return current as SaveEnvelope;
}

// ---------------------------------------------------------------------------
// Sanity checks (§4)
// ---------------------------------------------------------------------------

/**
 * Returns a non-null string describing the first violation if the envelope
 * fails the minimal sanity checks. Returns null when it passes.
 */
function sanityCheck(env: SaveEnvelope): string | null {
  const s = env.sim;
  if (typeof s.cash !== "number" || s.cash < 0)
    return `cash invalid: ${s.cash}`;
  if (typeof s.dayNumber !== "number" || s.dayNumber < 1)
    return `dayNumber invalid: ${s.dayNumber}`;
  if (!Array.isArray(s.roastSlots) || s.roastSlots.length < 1)
    return `roastSlots invalid`;
  if (!Array.isArray(s.gagsSeen))
    return `gagsSeen must be an array (not a serialized Set {})`;
  if (typeof s.unitsSoldLifetime !== "number" || s.unitsSoldLifetime < 0)
    return `unitsSoldLifetime invalid: ${s.unitsSoldLifetime}`;
  if (typeof s.lifetimeEarned !== "number" || s.lifetimeEarned < 0)
    return `lifetimeEarned invalid: ${s.lifetimeEarned}`;
  if (!Array.isArray(s.recipesUnlocked))
    return `recipesUnlocked must be an array`;
  return null;
}

// ---------------------------------------------------------------------------
// serialize(state) → JSON string
// ---------------------------------------------------------------------------

/**
 * Serialize a SimState (plus meta) into a SaveEnvelope JSON string.
 * @param state  The current SimState to save.
 * @param totalPlaytimeSeconds  Cumulative on-screen seconds (caller tracks this).
 */
export function serialize(state: SimState, totalPlaytimeSeconds = 0): string {
  const sim: SerializedSimState = {
    ...state,
    // Convert Set<string> → string[] (JSON.stringify silently drops Sets)
    gagsSeen: [...state.gagsSeen],
    recipesUnlocked: [...state.recipesUnlocked],
  };

  const envelope: SaveEnvelope = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: Date.now(),
    sim,
    meta: { totalPlaytimeSeconds },
  };

  return JSON.stringify(envelope);
}

// ---------------------------------------------------------------------------
// deserialize(json) → SimState
// ---------------------------------------------------------------------------

/**
 * Parse a JSON save string and return a live SimState.
 * Throws on any parse / sanity / migration failure — caller must catch and fall back.
 */
export function deserialize(json: string): SimState {
  const parsed: unknown = JSON.parse(json); // throws on bad JSON

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = parsed as any;

  // Run migration if needed
  let envelope: SaveEnvelope;
  if (raw.schemaVersion === CURRENT_SCHEMA_VERSION) {
    envelope = raw as SaveEnvelope;
  } else if (raw.schemaVersion < CURRENT_SCHEMA_VERSION) {
    envelope = migrate(raw);
  } else {
    // Future version loaded on an older build — drop unknown keys (forward-compat)
    // Attempt to use it as-is; sanity check will catch structural problems.
    envelope = raw as SaveEnvelope;
  }

  const violation = sanityCheck(envelope);
  if (violation) {
    throw new Error(`Save sanity check failed: ${violation}`);
  }

  const sim = envelope.sim;

  // Revive gagsSeen: string[] → Set<string>
  // Drop any ids that are not valid non-empty strings (defensive; spec says unknown ids dropped)
  const revivedGagsSeen = new Set<string>(
    sim.gagsSeen.filter((id): id is string => typeof id === "string" && id.length > 0)
  );

  // Reconstruct dayStats — ensure offlineEarned field present (forward-compat with older saves)
  const dayStats = {
    revenue: Number(sim.dayStats?.revenue ?? 0),
    cogsTotal: Number(sim.dayStats?.cogsTotal ?? 0),
    unitsSold: Number(sim.dayStats?.unitsSold ?? 0),
    cashSpentOnProduction: Number(sim.dayStats?.cashSpentOnProduction ?? 0),
    offlineEarned: Number(sim.dayStats?.offlineEarned ?? 0),
  };

  // Revive recipesUnlocked: string[] → Set<string>
  // classic_salted always present; validate ids are valid RecipeIds (defensive).
  const validRecipeIds = new Set<string>(["classic_salted", "honey_cinnamon", "ghost_pepper"]);
  const revivedRecipesUnlocked = new Set<string>(
    (Array.isArray(sim.recipesUnlocked) ? sim.recipesUnlocked : []).filter(
      (id): id is string => typeof id === "string" && validRecipeIds.has(id)
    )
  );
  // Always ensure classic_salted is present (forward-compat with older saves missing this field)
  revivedRecipesUnlocked.add("classic_salted");

  const state: SimState = {
    cash: sim.cash,
    rawStockLbs: sim.rawStockLbs,
    roastedStockLbs: sim.roastedStockLbs,
    roastedCostBasisPerLb: sim.roastedCostBasisPerLb,
    roastSlots: sim.roastSlots.map(slot => ({
      id: slot.id,
      status: slot.status,
      batchLbs: slot.batchLbs,
      recipe: slot.recipe as RecipeId | null,
      secondsRemaining: slot.secondsRemaining,
      totalSeconds: slot.totalSeconds,
    })),
    roasterTier: sim.roasterTier as RoasterTier,
    sellPrice: sim.sellPrice,
    dayElapsedSeconds: sim.dayElapsedSeconds,
    dayNumber: sim.dayNumber,
    dayStats,
    rescueArcPending: sim.rescueArcPending,
    unitsSoldLifetime: sim.unitsSoldLifetime,
    gagsSeen: revivedGagsSeen,
    lifetimeEarned: Number(sim.lifetimeEarned ?? 0),
    recipesUnlocked: revivedRecipesUnlocked,
    rngState: sim.rngState,
  };

  return state;
}

// ---------------------------------------------------------------------------
// computeOfflineHours(savedAtMs, nowMs) → clamped elapsed hours
// ---------------------------------------------------------------------------

/**
 * Compute clamped elapsed offline hours between a save timestamp and now.
 * Always returns a value in [0, OFFLINE_CAP_HOURS].
 */
export function computeOfflineHours(savedAtMs: number, nowMs: number): number {
  const elapsedMs = Math.max(0, nowMs - savedAtMs);
  const elapsedHours = elapsedMs / 3_600_000;
  return Math.min(elapsedHours, OFFLINE_CAP_HOURS);
}

// ---------------------------------------------------------------------------
// tryLoad — high-level helper used by GameScene.create()
// ---------------------------------------------------------------------------

export interface LoadResult {
  state: SimState;
  /** Loaded cleanly and offline earnings were applied. */
  ok: boolean;
  /** Human-readable offline toast message, or null if no offline time. */
  offlineMessage: string | null;
  /** Error message when falling back to fresh state; null on success. */
  errorMessage: string | null;
}

/**
 * Attempt to load a save from storage.
 * On any failure: returns a fresh SimState + sets errorMessage for the toast.
 * On success: applies offline earnings and returns the message for the report.
 *
 * @param storage  StorageLike (window.localStorage in game, mock in tests).
 * @param nowMs    Current wall-clock timestamp (injectable for testing).
 */
export function tryLoad(storage: StorageLike, nowMs = Date.now()): LoadResult {
  const raw = storage.getItem(SAVE_KEY);

  if (raw === null) {
    // No save on disk — fresh start, no toast needed.
    return { state: createState(1), ok: false, offlineMessage: null, errorMessage: null };
  }

  let envelope: SaveEnvelope;
  let state: SimState;

  try {
    state = deserialize(raw);
    // Re-parse just to get savedAt (deserialize already validated the envelope)
    envelope = JSON.parse(raw) as SaveEnvelope;
  } catch (err) {
    console.warn("[DMN] Save load failed — starting fresh.", err);
    // Stash the corrupt blob for debugging; never surfaced to the player.
    try { storage.setItem(CORRUPT_KEY, raw); } catch { /* storage full — best effort */ }
    return {
      state: createState(1),
      ok: false,
      offlineMessage: null,
      errorMessage: "Couldn't load your save — starting fresh. Sorry for the reset.",
    };
  }

  // Apply offline earnings
  const elapsedHours = computeOfflineHours(envelope.savedAt, nowMs);
  let offlineMessage: string | null = null;

  if (elapsedHours > 0) {
    const event = applyOffline(state, elapsedHours);
    const earned = event.detail.earned as number;
    const capped = event.detail.cappedHours as number;
    if (earned > 0) {
      offlineMessage = `Truck rested ${capped.toFixed(1)}h — earned $${earned.toFixed(2)}.`;
    }
  }

  return { state, ok: true, offlineMessage, errorMessage: null };
}

// ---------------------------------------------------------------------------
// trySave — high-level helper used by GameScene save triggers
// ---------------------------------------------------------------------------

/**
 * Serialize and persist the current state.
 * Swallows storage errors (quota exceeded, private mode) — save is best-effort.
 *
 * @param storage            StorageLike.
 * @param state              Current SimState to save.
 * @param totalPlaytimeSeconds  Cumulative on-screen seconds.
 */
export function trySave(
  storage: StorageLike,
  state: SimState,
  totalPlaytimeSeconds = 0,
): void {
  try {
    storage.setItem(SAVE_KEY, serialize(state, totalPlaytimeSeconds));
  } catch (err) {
    console.warn("[DMN] Save failed (storage quota or private mode?).", err);
  }
}

// ---------------------------------------------------------------------------
// resetSave — wipes the save from storage (player-initiated only)
// ---------------------------------------------------------------------------

/**
 * Remove the saved game from storage. Does NOT reset the live SimState —
 * the caller (GameScene) is responsible for reinitialising state after
 * confirming the player's intent.
 */
export function resetSave(storage: StorageLike): void {
  storage.removeItem(SAVE_KEY);
  storage.removeItem(CORRUPT_KEY);
}
