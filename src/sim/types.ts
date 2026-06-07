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
  revenue: number;        // $ total sales this day
  cogsTotal: number;      // $ total COGS for goods sold this day
  unitsSold: number;      // lbs sold this day
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
  /** Set true when cash hits 0. Never resets automatically (owner resets it). */
  rescueArcPending: boolean;

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
  unitsSold: number;       // lbs
  revenue: number;         // $
  cogs: number;            // $
  grossProfit: number;     // revenue - cogs
  grossMarginPct: number;  // grossProfit / revenue * 100  (NaN → 0 if no revenue)
  fixedCosts: number;      // $
  net: number;             // grossProfit - fixedCosts
  cashBefore: number;      // cash at start of day
  cashAfter: number;       // cash after applying net
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
  | "rescue_arc_triggered";

export interface SimEvent {
  kind: SimEventKind;
  dayNumber: number;
  daySecond: number;
  detail: Record<string, unknown>;
}
