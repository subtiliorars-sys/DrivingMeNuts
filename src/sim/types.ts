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
  /**
   * Weighted-average price ACTUALLY PAID per lb of current raw stock ($).
   * Bulk + supplier discounts lower it; it flows into the roasted cost basis at
   * roast time so a discount is realized as lower COGS / higher margin AT SALE
   * (RT6-1 fix) — not as phantom equity at purchase. Starting/legacy stock is
   * valued at RAW_PEANUT_BASE_PRICE (the honest default). Additive-optional in
   * the save (absent → base price), so it needs no schema bump.
   */
  rawCostBasisPerLb: number;
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
   * Re-entry escalation (RESCUE_ARC_SCRIPT §Re-Entry): how many times the player
   * has TAKEN a rescue path (loan/credit/preorder/payday; decline doesn't count).
   * 0 on the first crisis → base terms. ≥1 → escalated terms (7% loan, 200lb/
   * $220 Derek pre-order, Marta relationship note). Additive-optional in the
   * save (absent → 0), so no schema bump.
   */
  rescueEntryCount: number;

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

  // ---- Net-history sparkline (last 14 days, capped) -------------------
  /**
   * Net profit for each of the last 14 completed days (index 0 = oldest).
   * Updated in endOfDay after net is computed. Missing on legacy saves → default [].
   * Additive optional field: absent = empty history, no migration needed (safe because
   * an empty array is the correct default for a save that predates this field).
   */
  netHistory: number[];

  // ---- Ledger v1 (schema v4) -------------------------------------------
  /**
   * Daily P&L rows for the last LEDGER_MAX_DAYS completed days (index 0 = oldest).
   * Appended in endOfDay; ring-capped. Source for the Books panel and the
   * weekly recap. netHistory remains the sparkline's source (kept separate
   * for save back-compat; ledger is the richer record).
   */
  ledger: LedgerEntry[];

  // ---- Comeback Lines (schema v4 — GDD B4 Nut Facts meter) -------------
  /**
   * Highest comeback tier unlocked (0 = none, 1–4 per COMEBACK_TIERS).
   * Derived from gagsSeen.size crossing thresholds; stored so unlock events
   * fire exactly once. Migration derives it from gagsSeen for old saves.
   */
  comebackTier: number;

  // ---- Brand campaign (schema v4 — GDD B4 "Legumes. Not Nuts.") --------
  /**
   * True once the player buys the brand campaign (permanent; one-time).
   * Shifts the demand curve's base price by BRAND_CAMPAIGN_PRICE_TOLERANCE.
   */
  brandCampaignActive: boolean;

  // ---- Auto-sell off-peak (GDD C4 — additive-optional, no schema bump) --
  /**
   * True once the player buys the auto-sell upgrade. When set, endOfDay
   * liquidates leftover roasted stock at AUTO_SELL_DISCOUNT (after sales +
   * preorder fulfillment). Additive-optional in the save (absent → false → the
   * pre-upgrade behaviour: leftover roasted stock carries to the next day).
   */
  autoSellEnabled: boolean;

  // ---- Rescue aftermath (schema v4) -------------------------------------
  /**
   * Aftermath paths already shown ("loan" | "credit" | "payday" | "preorder").
   * Each path's aftermath beat fires once per save, ever — repeat repayments
   * of the same kind do not replay the beat. Plain array (max 4 entries).
   */
  aftermathSeen: string[];

  /**
   * Aftermath beats queued at endOfDay but not yet displayed (RT5-1 fix).
   * Persisted so a beat is never lost if the player closes the tab while the
   * day report or an earlier beat is still on screen — the engine marks a path
   * "seen" (won't re-emit) at the same moment it queues it here, so this is the
   * only durable record of a pending beat. Drained one-at-a-time by the scene.
   */
  pendingAftermath: string[];

  // ---- Achievements (wave 6 — additive-optional, no schema bump) --------
  /**
   * Ids of achievements earned so far (data/achievements.ts). Recorded by
   * checkAchievements(); already-earned ones are derived silently on load.
   * Additive-optional: absent on v4 saves → [] (then re-derived, no toasts).
   */
  achievementsUnlocked: string[];

  // ---- Supplier relationship (wave 6 — GDD C4) --------------------------
  /**
   * Cumulative raw lbs ordered across the whole game. Drives the supplier
   * relationship level (economy.ts supplierLevelFor). Additive-optional:
   * absent on v4 saves → 0 (relationship starts fresh, which is honest —
   * pre-wave-6 saves never tracked this).
   */
  supplierLbsPurchased: number;

  // ---- PRNG state (seeded, deterministic) -----------------------------
  /** Mutable PRNG state — updated in place by nextRand(). */
  rngState: number;
}

// ---------------------------------------------------------------------------
// Ledger v1 types  (bookkeeping teaching surface — GDD D2 / BUSINESS_CURRICULUM)
// ---------------------------------------------------------------------------

/**
 * One completed day's P&L + cash-flow row.
 * P&L identity: net = (revenue − cogs) − fixedCosts + offlineEarned.
 * debtService is deliberately NOT in net — debt principal repayment is a
 * cash-flow/balance-sheet item, not a P&L expense. Showing them side by side
 * is the teaching point (profit ≠ cash).
 */
export interface LedgerEntry {
  /** Day number this row describes (the day that ended). */
  day: number;
  revenue: number;
  cogs: number;
  fixedCosts: number;
  offlineEarned: number;
  /** P&L net for the day (same value pushed to netHistory). */
  net: number;
  /** $ paid toward rescue debts at this day's close (cash out, not expense). */
  debtService: number;
  /** Cash on hand after the day fully closed. */
  cashAfter: number;
}

/**
 * Weekly recap attached to the DayReport every WEEK_RECAP_EVERY_DAYS days.
 * Factual totals only — no streaks, no "don't break it" framing
 * (DARK_PATTERN_GATE A.1/A.4).
 */
export interface WeekRecap {
  /** 1-based week number (day 7 → week 1). */
  weekNumber: number;
  /** Number of ledger days included (≤ 7; fewer if history was trimmed). */
  daysIncluded: number;
  totalRevenue: number;
  totalNet: number;
  /** Best day by net (null if no days included). */
  bestDay: { day: number; net: number } | null;
  /** Aggregate gross margin % across the week (0 if no revenue). */
  grossMarginPct: number;
}

/**
 * Balance-sheet snapshot (computed, not stored): assets = liabilities + equity.
 * Inventory is valued at cost (raw at base price, roasted at cost basis) —
 * conservative accounting, the standard for inventory.
 */
export interface BalanceSheet {
  assets: {
    cash: number;
    rawInventoryValue: number;
    roastedInventoryValue: number;
    total: number;
  };
  liabilities: {
    /** Sum of rescue-debt amountDue. */
    debtsOwed: number;
    /** Unearned portion of Derek's preorder cash (deferred revenue). */
    deferredRevenue: number;
    total: number;
  };
  /** equity = assets.total − liabilities.total (may be negative). */
  equity: number;
}

// ---------------------------------------------------------------------------
// Rescue arc types (Wave 5)
// ---------------------------------------------------------------------------

/** Which rescue path originated this debt. */
// "preorder_default" is created when a Derek pre-order is delivered short: the
// UNEARNED portion of the cash already received becomes a debt owed back (closes
// the no-clawback cash-pump red-team RT-1b found, while honoring the script's
// "no hard cash yank" intent — you owe it, you don't get it ripped from your till).
export type RescueDebtKind = "loan" | "credit" | "payday" | "preorder_default";

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
  /**
   * Ledger v1: $ paid toward rescue debts at this day's close (cash out,
   * not a P&L expense — shown as its own report-card line). 0 when none.
   */
  debtService: number;
  /**
   * Auto-sell off-peak: lbs of leftover roasted stock liquidated at end of day
   * (0 when the upgrade is off or there was nothing left). For a clarifying
   * report-card sub-line; the revenue is already folded into `revenue`.
   */
  autoSellLbs: number;
  /** Auto-sell off-peak: $ from the discounted liquidation (folded into revenue). */
  autoSellRevenue: number;
  /**
   * Weekly recap, attached every WEEK_RECAP_EVERY_DAYS days; null otherwise.
   * Factual totals only (DARK_PATTERN_GATE-compliant — no streak framing).
   */
  weekRecap: WeekRecap | null;
  /**
   * Wave 6: achievements newly earned as of this day's close. Empty when none.
   * Consumed by the scene for one-time unlock toasts.
   */
  achievementEvents: SimEvent[];
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
  | "preorder_partial"
  // Ledger/lore wave: comeback unlocks + one-time rescue aftermath beats
  | "comeback_unlocked"
  | "debt_aftermath"
  // Wave 6: achievement earned. (Supplier level-ups ride on supply_purchased's
  // detail.supplierLevelUp — no separate event kind.)
  | "achievement_unlocked";
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
