/**
 * types.ts — SimState and companion types for the P1 idle simulation core.
 * No Phaser imports. Pure TypeScript. Deterministic.
 */

import type { RecipeId, RoasterTier } from "../data/economy.js";

// ---------------------------------------------------------------------------
// Roast queue
// ---------------------------------------------------------------------------

export type RoastSlotStatus = "empty" | "roasting" | "ready";

export interface RoastSlot {
  readonly id: number;          // 0-indexed slot index
  status: RoastSlotStatus;
  batchLbs: number;             // lbs in this batch (0 when empty)
  recipe: RecipeId | null;
  /** Seconds remaining until this batch finishes (0 when not roasting). */
  secondsRemaining: number;
  /** Total seconds this batch takes (for progress display). */
  totalSeconds: number;
}

// ---------------------------------------------------------------------------
// Cumulative stats for the current day (reset at endOfDay)
// ---------------------------------------------------------------------------

export interface DayStats {
  revenue: number;              // $ total sales this day (on-screen only; excludes offline)
  cogsTotal: number;            // $ COGS of units SOLD this day (recognized at sale)
  unitsSold: number;            // lbs sold this day
  cashSpentOnProduction: number;// $ cash outflow for roasting today (recognized at production)
  /** $ earned while the truck was offline resting (not blended into revenue — F13 fix). */
  offlineEarned: number;
}

// ---------------------------------------------------------------------------
// SimState — the complete, serialisable snapshot of the idle engine.
// All mutable fields are plain values; no class instances, no closures.
// ---------------------------------------------------------------------------

export interface SimState {
  // ---- Economy --------------------------------------------------------
  cash: number;                 // current cash on hand ($); never < 0
  rawStockLbs: number;          // lbs of raw peanuts in inventory
  roastedStockLbs: number;      // lbs of roasted peanuts ready to sell
  /** Weighted-average COGS per lb of current roasted stock (for COGS-at-sale). */
  roastedCostBasisPerLb: number;
  /**
   * W2 blended-pool: weighted-average RECIPE_DEMAND_MULT of roasted stock.
   * Updated exactly like roastedCostBasisPerLb when a batch completes.
   * tick() multiplies demand by this value. Default 1.0 (classic_salted baseline).
   * applyOffline conservatively uses classic_salted (1.0) per spec §4.
   */
  roastedDemandMultBlended: number;

  // ---- Roast queue ----------------------------------------------------
  roastSlots: RoastSlot[];      // length = current number of unlocked slots
  roasterTier: RoasterTier;

  // ---- Pricing --------------------------------------------------------
  /** Player-set sell price per lb. Clamped to [PRICE_MIN, PRICE_MAX]. */
  sellPrice: number;

  // ---- Day clock -------------------------------------------------------
  /** Simulated seconds elapsed in the current day (0 → DAY_DURATION_SECONDS). */
  dayElapsedSeconds: number;
  /** Day number (1-indexed). Increments each endOfDay call. */
  dayNumber: number;

  // ---- Cumulative day stats (reset at endOfDay) -----------------------
  dayStats: DayStats;

  // ---- Rescue arc flag ------------------------------------------------
  /**
   * Set true at end-of-day when cash is below RESCUE_ARC_CASH_THRESHOLD;
   * cleared at end-of-day when cash is >= threshold. Evaluated only at endOfDay.
   */
  rescueArcPending: boolean;

  /**
   * Wave 5: rescue-arc mode the player is currently in.
   * "offer" — rescue modal should be shown at the start of the next day.
   * "active" — player has chosen a path; debts/obligations are live.
   * null — not in rescue arc.
   */
  rescueMode: "offer" | "active" | null;

  /**
   * Active debts from rescue paths (loan, credit, payday).
   * Multiple debts can stack (e.g. payday rolls over).
   */
  rescueDebts: RescueDebt[];

  /**
   * Active preorder obligation from Derek's bulk-order path.
   * At most one at a time (cannot accept a second while one is live).
   */
  preorderObligation: PreorderObligation | null;

  // ---- Legume Lore collectible (Wave 2) --------------------------------
  /** Cumulative lbs sold across all days — drives gag trigger cadence. */
  unitsSoldLifetime: number;
  /**
   * Set of lore ids seen so far (e.g. "LL-001").
   * Seed for the future Legume Lore collectible screen.
   */
  gagsSeen: Set<string>;

  // ---- Recipe unlocks (Wave 3 / P1.5) ---------------------------------
  /**
   * Cumulative revenue across all days (for recipe unlock gates).
   * Incremented in endOfDay before dayStats reset.
   */
  lifetimeEarned: number;
  /**
   * Set of recipe ids the player has unlocked.
   * classic_salted is always present; others unlock via lifetimeEarned thresholds.
   */
  recipesUnlocked: Set<string>;

  // ---- PRNG state (seeded, deterministic) -----------------------------
  /** Mutable PRNG state — updated in place by nextRand(). */
  rngState: number;
}

// ---------------------------------------------------------------------------
// Rescue arc types (Wave 5)
// ---------------------------------------------------------------------------

/** Which rescue path originated this debt. */
export type RescueDebtKind = "loan" | "credit" | "payday";

/**
 * A single debt record created by a rescue path.
 * Persisted in rescueDebts[].
 */
export interface RescueDebt {
  /** Discriminates loan vs supplier credit vs payday. */
  kind: RescueDebtKind;
  /** Original principal advanced ($). */
  principal: number;
  /** Current amount owed ($) — increases on payday rollover. */
  amountDue: number;
  /** Game-day the debt is due (day player must have repaid by end-of-day). */
  dueDayNumber: number;
  /** Day the debt was created (informational). */
  createdOnDay: number;
  /**
   * How many times the payday debt has rolled over.
   * 0 for loan/credit (they do not compound).
   */
  rollovers: number;
}

/**
 * An active preorder obligation from Derek's bulk-order path.
 * Tracks how many lbs of roasted peanuts the player must deliver.
 */
export interface PreorderObligation {
  /** Total lbs of roasted peanuts to deliver. */
  totalLbs: number;
  /** Lbs fulfilled so far (incremented by preorder auto-allocation in endOfDay). */
  fulfilledLbs: number;
  /** Game-day the delivery is due (end-of that day). */
  dueDayNumber: number;
  /** Cash already received upfront (informational; already in state.cash). */
  cashReceived: number;
  /** Day the obligation was created (informational). */
  createdOnDay: number;
}

// ---------------------------------------------------------------------------
// DayReport — returned by endOfDay(), consumed by the HUD report card.
// Matches UI_WIREFRAMES §4 layout exactly.
// ---------------------------------------------------------------------------

export interface DayReport {
  dayNumber: number;
  unitsSold: number;            // lbs
  revenue: number;              // $ on-screen sales only (excludes offlineEarned)
  avgRealizedPrice: number;     // $ per lb = revenue / unitsSold (0 if no sales)
  cogs: number;                 // $ COGS of units SOLD (recognized at sale, not production)
  grossProfit: number;          // revenue - cogs
  grossMarginPct: number;       // grossProfit / revenue * 100  (0 if no revenue)
  cashSpentOnProduction: number;// $ cash outflow for roasting today (cash-flow lesson)
  fixedCosts: number;           // $
  /** $ the truck earned during offline rest (separate line; not in grossProfit). */
  offlineEarned: number;
  net: number;                  // grossProfit - fixedCosts + offlineEarned
  cashBefore: number;           // cash at start of day
  cashAfter: number;            // cash after applying net
  /** One insight line for the HUD report card (question, not shame). */
  insightLine: string;
  /**
   * Wave 5: one-line liability summary for the report card while debts are active.
   * null when no debts or obligations are live.
   */
  activeDebtSummary: string | null;
  /**
   * Wave 5: rescue-arc events that occurred during end-of-day processing
   * (debt repayments, rollovers, preorder resolution).
   * Empty array when no rescue-arc activity occurred.
   */
  rescueEvents: SimEvent[];
}

// ---------------------------------------------------------------------------
// SimEvent — append-only event log entries for UI / testing.
// ---------------------------------------------------------------------------

export type SimEventKind =
  | "batch_started"
  | "batch_ready"
  | "sale"
  | "supply_purchased"
  | "price_changed"
  | "day_ended"
  | "offline_applied"
  | "rescue_arc_triggered"
  | "gag"
  | "upgrade_purchased"
  // Wave 5: rescue arc events
  | "rescue_path_chosen"
  | "debt_repaid"
  | "debt_extended"
  | "payday_rollover"
  | "preorder_fulfilled"
  | "preorder_partial";
  // NOTE W15: "recipe_unlocked" SimEvent was specced in RECIPE_BATCH_UI.md §3e but
  // never emitted from endOfDay(). GameScene detects new unlocks via Set-diff
  // (unlockedBefore snapshot vs post-endOfDay state.recipesUnlocked) — that is
  // the live path and it works. Emitting a redundant event was removed to keep
  // endOfDay's event list honest. See RECIPE_BATCH_UI.md §7 deviation note.

export interface SimEvent {
  kind: SimEventKind;
  dayNumber: number;
  daySecond: number;
  detail: Record<string, unknown>;
}
