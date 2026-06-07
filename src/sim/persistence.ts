/**
 * persistence.ts — Save/load logic for Driving Me Nuts.
 *
 * Phaser-free. Pure functions over a StorageLike interface so every path is
 * unit-testable in Node without a browser. GameScene owns the storage object
 * (passes safeStorage() for real play, an in-memory mock for tests).
 *
 * Spec: docs/PERSISTENCE.md
 * Red-team fix F13: applyOffline writes to dayStats.offlineEarned, NOT revenue.
 * Wave3 W1: safeStorage() probes localStorage for SecurityError (managed school
 *   Chromebooks). Falls back to an in-memory singleton so the game runs even when
 *   storage is blocked — saves just won't survive page reload.
 * Wave3 W8: trySave fires a one-time onSaveFailed callback on the first failure,
 *   so the scene can surface a non-blaming toast.
 * CRIT-1: LOCAL-ONLY. No server sync without a distinct Owner Decision.
 */

import type { SimState, RescueDebt, PreorderObligation } from "./types.js";
import { createState, applyOffline } from "./engine.js";
import { OFFLINE_CAP_HOURS, MAX_QUEUE_SLOTS } from "../data/economy.js";
import type { RecipeId, RoasterTier } from "../data/economy.js";
import { RECIPES, ROASTER_EFFICIENCY } from "../data/economy.js";

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

/** localStorage key for the live save. */
export const SAVE_KEY = "dmn_save_v1";

/** Stash corrupt blobs here for post-mortem debugging (never surfaced to player). */
export const CORRUPT_KEY = "dmn_save_v1-corrupt";

/** Bump on every breaking schema change. Migration chain lives in MIGRATIONS below. */
export const CURRENT_SCHEMA_VERSION = 3;

// ---------------------------------------------------------------------------
// StorageLike interface — injectable, testable
// ---------------------------------------------------------------------------

/**
 * Minimal subset of the Web Storage API that persistence needs.
 * Pass safeStorage() in the game; an in-memory object in tests.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// ---------------------------------------------------------------------------
// safeStorage() — W1: probe localStorage; fall back to in-memory singleton
// ---------------------------------------------------------------------------

/** In-memory fallback for when localStorage is blocked (SecurityError). */
class MemoryStorage implements StorageLike {
  private readonly _store = new Map<string, string>();
  getItem(key: string): string | null {
    return this._store.has(key) ? (this._store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this._store.set(key, value);
  }
  removeItem(key: string): void {
    this._store.delete(key);
  }
}

let _memoryStorageSingleton: MemoryStorage | null = null;

/**
 * Returns window.localStorage if it is accessible, otherwise an in-memory
 * StorageLike singleton.  Probes with a get + set + remove to catch browsers
 * (e.g., managed school Chromebooks) that throw SecurityError on any access.
 *
 * The in-memory fallback means the game runs fully during the session; progress
 * will not survive a page reload, which is acceptable per spec (W1 requirement).
 */
export function safeStorage(): StorageLike {
  try {
    const PROBE_KEY = "__dmn_storage_probe__";
    window.localStorage.getItem(PROBE_KEY);
    window.localStorage.setItem(PROBE_KEY, "1");
    window.localStorage.removeItem(PROBE_KEY);
    return window.localStorage;
  } catch {
    // SecurityError or similar: storage is blocked. Use in-memory fallback.
    if (!_memoryStorageSingleton) {
      _memoryStorageSingleton = new MemoryStorage();
    }
    return _memoryStorageSingleton;
  }
}

// ---------------------------------------------------------------------------
// Save envelope (wire format)
// ---------------------------------------------------------------------------

/** SimState on the wire: Set<string> fields serialised as string[]. */
type SerializedSimState = Omit<SimState, "gagsSeen" | "recipesUnlocked"> & {
  gagsSeen: string[];
  recipesUnlocked: string[];
  /** W2: blended-pool recipe demand multiplier (schema v2). */
  roastedDemandMultBlended?: number;
  /** Wave 5 (schema v3): rescue mode. Optional for forward-compat. */
  rescueMode?: "offer" | "active" | null;
  /** Wave 5 (schema v3): rescue debts. Optional for forward-compat. */
  rescueDebts?: RescueDebt[];
  /** Wave 5 (schema v3): preorder obligation. Optional for forward-compat. */
  preorderObligation?: PreorderObligation | null;
  /**
   * Wave 4 polish: last-14-days net history for sparkline.
   * Optional/additive — absent on older saves; defaults to [] on load.
   * No schema bump needed: missing field = empty history, no migration required.
   */
  netHistory?: number[];
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
// Migration table (§5) — add entries on schema bumps
// ---------------------------------------------------------------------------

type Migrator = (raw: unknown) => SaveEnvelope;
const MIGRATIONS: Record<number, Migrator> = {
  /**
   * v1 → v2 (Wave3 W2): add roastedDemandMultBlended field.
   * Default 1.0 — conservatively assumes classic_salted in existing saves,
   * which is accurate (only recipe available before honey_cinnamon unlocks).
   */
  1: (raw) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = raw as any;
    const upgraded: SaveEnvelope = {
      ...env,
      schemaVersion: 2,
      sim: {
        ...env.sim,
        roastedDemandMultBlended: 1.0, // default: classic_salted multiplier
      },
    };
    return upgraded;
  },

  /**
   * v2 → v3 (Wave 5): add rescue-arc fields.
   * Defaults: rescueMode null, rescueDebts [], preorderObligation null.
   * Existing saves have no active rescue arc, so these safe defaults are correct.
   */
  2: (raw) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = raw as any;
    const upgraded: SaveEnvelope = {
      ...env,
      schemaVersion: 3,
      sim: {
        ...env.sim,
        rescueMode: null,
        rescueDebts: [],
        preorderObligation: null,
      },
    };
    return upgraded;
  },
};

/**
 * Run the migration chain from the envelope's version up to CURRENT_SCHEMA_VERSION.
 * W14 guard: refuse to overwrite saves with schemaVersion > CURRENT_SCHEMA_VERSION.
 */
function migrate(raw: unknown): SaveEnvelope {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = raw;
  const rawVersion: number = (current as SaveEnvelope)?.schemaVersion ?? 0;

  // W14: future version — load it as-is (forward-compat) but never migrate downward.
  if (rawVersion > CURRENT_SCHEMA_VERSION) {
    return current as SaveEnvelope;
  }

  let version = rawVersion;

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

/** Valid RoastSlot status values. */
const VALID_SLOT_STATUSES = new Set(["empty", "roasting", "ready"]);

/** Valid RecipeId values. */
const VALID_RECIPE_IDS = new Set(Object.keys(RECIPES));

/** Valid RoasterTier values. */
const VALID_ROASTER_TIERS = new Set(Object.keys(ROASTER_EFFICIENCY));

/**
 * Returns a non-null string describing the first violation if the envelope
 * fails the minimal sanity checks. Returns null when it passes.
 * W3: validates slot.status enum, slot.recipe ∈ RECIPES (or null),
 *   finite non-negative slot timers, roasterTier ∈ ROASTER_EFFICIENCY keys.
 * W2: validates roastedDemandMultBlended is finite and in (0, 1].
 */
function sanityCheck(env: SaveEnvelope): string | null {
  const s = env.sim;
  if (typeof s.cash !== "number" || s.cash < 0)
    return `cash invalid: ${s.cash}`;
  if (typeof s.dayNumber !== "number" || s.dayNumber < 1)
    return `dayNumber invalid: ${s.dayNumber}`;
  // W4: slots array must have between 1 and MAX_QUEUE_SLOTS entries
  if (!Array.isArray(s.roastSlots) || s.roastSlots.length < 1 || s.roastSlots.length > MAX_QUEUE_SLOTS)
    return `roastSlots invalid: length ${(s.roastSlots as unknown[])?.length}`;
  if (!Array.isArray(s.gagsSeen))
    return `gagsSeen must be an array (not a serialized Set {})`;
  if (typeof s.unitsSoldLifetime !== "number" || s.unitsSoldLifetime < 0)
    return `unitsSoldLifetime invalid: ${s.unitsSoldLifetime}`;
  if (typeof s.lifetimeEarned !== "number" || s.lifetimeEarned < 0)
    return `lifetimeEarned invalid: ${s.lifetimeEarned}`;
  if (!Array.isArray(s.recipesUnlocked))
    return `recipesUnlocked must be an array`;

  // W3: roasterTier must be a valid tier key
  if (!VALID_ROASTER_TIERS.has(s.roasterTier as string))
    return `roasterTier invalid: ${s.roasterTier}`;

  // W3: validate each roast slot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const slot of (s.roastSlots as any[])) {
    if (!VALID_SLOT_STATUSES.has(slot.status))
      return `slot ${slot.id} status invalid: ${slot.status}`;
    if (slot.recipe !== null && !VALID_RECIPE_IDS.has(slot.recipe))
      return `slot ${slot.id} recipe invalid: ${slot.recipe}`;
    if (!Number.isFinite(slot.secondsRemaining) || slot.secondsRemaining < 0)
      return `slot ${slot.id} secondsRemaining invalid: ${slot.secondsRemaining}`;
    if (!Number.isFinite(slot.totalSeconds) || slot.totalSeconds < 0)
      return `slot ${slot.id} totalSeconds invalid: ${slot.totalSeconds}`;
  }

  // W2: blended demand multiplier must be finite and in (0, 1] when present
  const mult = (s as SerializedSimState).roastedDemandMultBlended;
  if (mult !== undefined) {
    if (!Number.isFinite(mult) || mult <= 0 || mult > 1)
      return `roastedDemandMultBlended invalid: ${mult}`;
  }

  // Wave 5: validate rescueDebts array when present
  const ss = s as SerializedSimState;
  if (ss.rescueDebts !== undefined) {
    if (!Array.isArray(ss.rescueDebts))
      return `rescueDebts must be an array`;
    const VALID_DEBT_KINDS = new Set(["loan", "credit", "payday"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const d of (ss.rescueDebts as any[])) {
      // RT-4: entry must be a non-null object, else d.kind below would THROW a
      // TypeError instead of returning a friendly corruption message.
      if (d === null || typeof d !== "object")
        return `rescueDebt entry invalid: ${String(d)}`;
      if (!VALID_DEBT_KINDS.has(d.kind))
        return `rescueDebt kind invalid: ${d.kind}`;
      if (typeof d.amountDue !== "number" || !Number.isFinite(d.amountDue) || d.amountDue < 0)
        return `rescueDebt amountDue invalid: ${d.amountDue}`;
      // RT-4: Number.isFinite rejects NaN/Infinity — a NaN dueDayNumber passes
      // `< 1` (false) and produces a debt that is never due (permanent ghost debt).
      if (!Number.isFinite(d.dueDayNumber) || d.dueDayNumber < 1)
        return `rescueDebt dueDayNumber invalid: ${d.dueDayNumber}`;
    }
  }

  // Wave 5: validate preorderObligation when present (non-null)
  // RT-4: all three fields must be FINITE. An Infinity totalLbs (or NaN/Infinity
  // dueDayNumber) passes typeof/range checks and creates an obligation that is
  // never fulfilled and never expires — endOfDay would silently consume ALL
  // roasted stock every day forever (soft-lock via crafted/corrupt import).
  const ob = ss.preorderObligation;
  if (ob !== undefined && ob !== null) {
    if (!Number.isFinite(ob.totalLbs) || ob.totalLbs <= 0)
      return `preorderObligation totalLbs invalid: ${ob.totalLbs}`;
    if (!Number.isFinite(ob.fulfilledLbs) || ob.fulfilledLbs < 0)
      return `preorderObligation fulfilledLbs invalid: ${ob.fulfilledLbs}`;
    if (!Number.isFinite(ob.dueDayNumber) || ob.dueDayNumber < 1)
      return `preorderObligation dueDayNumber invalid: ${ob.dueDayNumber}`;
  }

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
    // W2: persist blended demand multiplier
    roastedDemandMultBlended: state.roastedDemandMultBlended,
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
 *
 * W14 guard: saves with schemaVersion > CURRENT_SCHEMA_VERSION are loaded as-is
 * (forward-compat) but never migrated downward — the migrate() function handles this.
 */
export function deserialize(json: string): SimState {
  const parsed: unknown = JSON.parse(json); // throws on bad JSON

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = parsed as any;

  // Run migration if needed (migrate() also handles the W14 future-version case)
  let envelope: SaveEnvelope;
  if (raw.schemaVersion === CURRENT_SCHEMA_VERSION) {
    envelope = raw as SaveEnvelope;
  } else {
    // migrate handles both past versions (via chain) and future versions (pass-through)
    envelope = migrate(raw);
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

  // W2: restore blended demand multiplier; default 1.0 if absent (classic_salted)
  const blended = (sim as SerializedSimState).roastedDemandMultBlended;
  const roastedDemandMultBlended =
    typeof blended === "number" && Number.isFinite(blended) && blended > 0 && blended <= 1
      ? blended
      : 1.0;

  // Wave 5: revive rescue arc fields (default to safe values if absent — migration may not have run)
  const ss = sim as SerializedSimState;
  const rescueMode = (ss.rescueMode === "offer" || ss.rescueMode === "active") ? ss.rescueMode : null;

  const VALID_DEBT_KINDS = new Set(["loan", "credit", "payday"]);
  const rescueDebts: RescueDebt[] = Array.isArray(ss.rescueDebts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (ss.rescueDebts as any[])
        .filter((d) => VALID_DEBT_KINDS.has(d.kind) && typeof d.amountDue === "number")
        .map((d) => ({
          kind: d.kind as RescueDebt["kind"],
          principal: Number(d.principal ?? d.amountDue),
          amountDue: Number(d.amountDue),
          dueDayNumber: Number(d.dueDayNumber),
          createdOnDay: Number(d.createdOnDay ?? 1),
          rollovers: Number(d.rollovers ?? 0),
        }))
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawOb = ss.preorderObligation as any;
  const preorderObligation: PreorderObligation | null =
    rawOb != null && typeof rawOb === "object" && typeof rawOb.totalLbs === "number"
      ? {
          totalLbs: Number(rawOb.totalLbs),
          fulfilledLbs: Number(rawOb.fulfilledLbs ?? 0),
          dueDayNumber: Number(rawOb.dueDayNumber),
          cashReceived: Number(rawOb.cashReceived ?? 0),
          createdOnDay: Number(rawOb.createdOnDay ?? 1),
        }
      : null;

  // Wave 4 polish: revive netHistory; default [] if absent (safe — empty history is correct
  // for saves that predate this field; no migration needed per additive-optional rule).
  const rawNetHistory = (ss as SerializedSimState).netHistory;
  const netHistory: number[] = Array.isArray(rawNetHistory)
    ? rawNetHistory.filter((v): v is number => typeof v === "number" && Number.isFinite(v)).slice(-14)
    : [];

  const state: SimState = {
    cash: sim.cash,
    rawStockLbs: sim.rawStockLbs,
    roastedStockLbs: sim.roastedStockLbs,
    roastedCostBasisPerLb: sim.roastedCostBasisPerLb,
    roastedDemandMultBlended,
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
    rescueMode,
    rescueDebts,
    preorderObligation,
    unitsSoldLifetime: sim.unitsSoldLifetime,
    gagsSeen: revivedGagsSeen,
    lifetimeEarned: Number(sim.lifetimeEarned ?? 0),
    recipesUnlocked: revivedRecipesUnlocked,
    netHistory,
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
 * W8: On the FIRST failed save attempt, calls `onSaveFailed` (if provided) so
 * the caller can surface a one-time non-blaming toast. The callback is invoked
 * at most once per trySave instance (caller passes a stateful closure).
 *
 * @param storage            StorageLike.
 * @param state              Current SimState to save.
 * @param totalPlaytimeSeconds  Cumulative on-screen seconds.
 * @param onSaveFailed       Optional: called once on first save failure.
 */
export function trySave(
  storage: StorageLike,
  state: SimState,
  totalPlaytimeSeconds = 0,
  onSaveFailed?: () => void,
): void {
  try {
    storage.setItem(SAVE_KEY, serialize(state, totalPlaytimeSeconds));
  } catch (err) {
    console.warn("[DMN] Save failed (storage quota or private mode?).", err);
    if (onSaveFailed) onSaveFailed();
  }
}

// ---------------------------------------------------------------------------
// importEnvelopeText — validate + store a save JSON string from file import
// (item 2: Save Export/Import; CRIT-1 compliant — zero server, all local)
// ---------------------------------------------------------------------------

export interface ImportResult {
  /** Whether the import succeeded and the state was stored. */
  ok: boolean;
  /** Loaded SimState on success; null on failure. */
  state: SimState | null;
  /** Human-readable error message on failure; null on success. */
  errorMessage: string | null;
  /** RT-3: true when an existing save was preserved at IMPORT_BACKUP_KEY before overwrite. */
  previousSaveBackedUp: boolean;
}

/**
 * RT-3: key where the pre-import save is preserved. Import is destructive
 * (overwrites SAVE_KEY); stashing the previous save here makes a mis-import
 * recoverable instead of being the game's largest remaining data-loss surface.
 * Single slot — each import overwrites the previous backup.
 */
export const IMPORT_BACKUP_KEY = "dmn_save_v1-preimport";

/**
 * Parse and validate an imported save JSON string, then write it to storage
 * (overwriting any existing save).  On any failure returns ok=false with a
 * friendly message and makes NO state change.
 *
 * RT-3: before overwriting, the existing save (if any) is copied to
 * IMPORT_BACKUP_KEY so a wrong-file import never destroys progress.
 *
 * Pure-function level: all validation goes through the existing deserialize()
 * path (sanity checks + migrations apply automatically).
 *
 * @param text     Raw text content from the imported file.
 * @param storage  StorageLike (window.localStorage in game, mock in tests).
 */
export function importEnvelopeText(text: string, storage: StorageLike): ImportResult {
  if (typeof text !== "string" || text.trim().length === 0) {
    return { ok: false, state: null, errorMessage: "Import failed: file appears to be empty.", previousSaveBackedUp: false };
  }

  let state: SimState;
  try {
    state = deserialize(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, state: null, errorMessage: `Import failed: ${msg}`, previousSaveBackedUp: false };
  }

  // RT-3: preserve the current save before overwriting it. Best-effort — a
  // quota failure on the backup must not block the import itself, but we do
  // report whether the backup happened so the UI can word its toast honestly.
  let previousSaveBackedUp = false;
  try {
    const prev = storage.getItem(SAVE_KEY);
    if (prev !== null) {
      storage.setItem(IMPORT_BACKUP_KEY, prev);
      previousSaveBackedUp = true;
    }
  } catch { /* best effort — proceed with import */ }

  // Write the validated (and migrated) text back to storage so the next
  // tryLoad sees the canonical current-schema version.
  try {
    // Re-serialise through serialize() to ensure the envelope is schema-current.
    storage.setItem(SAVE_KEY, serialize(state));
  } catch {
    return { ok: false, state: null, errorMessage: "Import failed: could not write to storage (quota or private mode?).", previousSaveBackedUp };
  }

  return { ok: true, state, errorMessage: null, previousSaveBackedUp };
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
