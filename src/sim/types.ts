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

  // ---- Legume Lore collectible (Wave 2) --------------------------------
  /** Cumulative lbs sold across all days — drives gag trigger cadence. */
  unitsSoldLifetime: number;
  /**
   * Set of lore ids seen so far (e.g. "LL-001").
   * Seed for the future Legume Lore collectible screen.
   */
  gagsSeen: Set<string>;

  // ---- PRNG state (seeded, deterministic) -----------------------------
  /** Mutable PRNG state — updated in place by nextRand(). */
  rngState: number;
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
  | "gag";

export interface SimEvent {
  kind: SimEventKind;
  dayNumber: number;
  daySecond: number;
  detail: Record<string, unknown>;
}
