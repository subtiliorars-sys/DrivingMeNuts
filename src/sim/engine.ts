/**
 * engine.ts — Pure-function idle simulation engine. No Phaser. No Math.random.
 * Deterministic given a seeded PRNG. All mutation is explicit (caller owns state).
 *
 * Architecture:
 *   tick()        — advance roast timers + customer purchases by dtSeconds
 *   buyRaw()      — purchase raw peanut stock
 *   startRoast()  — load a batch into a roast slot
 *   setPrice()    — update sell price
 *   endOfDay()    — close the day, return DayReport, reset day stats
 *   applyOffline()— credit offline earnings within soft-cap (never punitive)
 *   createState() — factory for a fresh SimState
 */

import {
  RAW_PEANUT_BASE_PRICE,
  RAW_ORDER_MIN_LBS,
  RAW_ORDER_MAX_LBS,
  bulkDiscountFor,
  RECIPES,
  RECIPE_DEMAND_MULT,
  RECIPE_UNLOCK_THRESHOLD,
  ROASTER_EFFICIENCY,
  ROASTER_TIER_ORDER,
  ROASTER_UPGRADE_COST,
  STARTING_QUEUE_SLOTS,
  MAX_QUEUE_SLOTS,
  QUEUE_SLOT_COST,
  BATCH_MIN_LBS,
  BATCH_MAX_LBS,
  PRICE_MIN,
  PRICE_MAX,
  DEFAULT_SELL_PRICE,
  DEMAND_BASE_PRICE,
  DEMAND_BASE_LBS_PER_HOUR,
  DEMAND_SLOPE,
  DEMAND_MAX_LBS_PER_HOUR,
  DAY_DURATION_SECONDS,
  DAILY_FIXED_COSTS,
  STARTING_CASH,
  STARTING_RAW_STOCK_LBS,
  OFFLINE_EARN_RATE_FRACTION,
  OFFLINE_CAP_DOLLARS_PER_HOUR,
  OFFLINE_CAP_HOURS,
  RESCUE_ARC_CASH_THRESHOLD,
  GAG_EVERY_N_LBS_SOLD,
  DAY_FACTOR,
  DAY_NAMES,
} from "../data/economy.js";

// default blended multiplier = classic_salted = 1.0
const DEFAULT_DEMAND_MULT_BLENDED = RECIPE_DEMAND_MULT["classic_salted"];

import { LORE_LINES, LORE_TIER_DAY_GATE } from "../data/lore.js";

import type {
  SimState,
  RoastSlot,
  DayReport,
  SimEvent,
} from "./types.js";

import type { RecipeId } from "../data/economy.js";

// ---------------------------------------------------------------------------
// Tiny seeded PRNG — Mulberry32 (public domain, 32-bit state, good distribution)
// Returns a float in [0, 1) and mutates rngState in the passed state object.
// ---------------------------------------------------------------------------

function nextRand(state: SimState): number {
  let t = (state.rngState + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  state.rngState = t;
  return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Clamp a value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Compute COGS per lb for a recipe (raw peanut cost + ingredient cost). No bulk discount here — discount is on the raw purchase, not on COGS post-roast). */
function cogsPerLb(recipe: RecipeId): number {
  return RAW_PEANUT_BASE_PRICE + RECIPES[recipe].ingredientCostPerLb;
}

/**
 * Demand in lbs/hour at a given price, scaled by the provided demand multiplier
 * and the day-of-week factor.
 * Formula: (BASE_LBS_PER_HOUR − DEMAND_SLOPE × (price − BASE_PRICE)) × demandMult × dayFactor
 * Clamped to [0, DEMAND_MAX_LBS_PER_HOUR].
 * Small Gaussian-ish jitter applied via PRNG so repeat ticks aren't exactly equal.
 *
 * W2: tick() passes state.roastedDemandMultBlended as demandMult so the blended-pool
 * recipe multiplier is applied to live sales. Default 1.0 preserves backward compat.
 * W4: tick() passes dayFactorFor(state.dayNumber) so weekday patterns apply.
 */
function demandLbsPerHour(price: number, state: SimState, demandMult = 1.0, dayFactor = 1.0): number {
  const base = DEMAND_BASE_LBS_PER_HOUR - DEMAND_SLOPE * (price - DEMAND_BASE_PRICE);
  // ±10% jitter (two uniform samples averaged → triangular distribution)
  const jitter = ((nextRand(state) + nextRand(state)) / 2 - 0.5) * 0.20;
  return clamp(base * (1 + jitter) * demandMult * dayFactor, 0, DEMAND_MAX_LBS_PER_HOUR);
}

/**
 * Effective roast duration in seconds for a batch.
 */
function roastDurationSeconds(recipe: RecipeId, lbs: number, state: SimState): number {
  const efficiency = ROASTER_EFFICIENCY[state.roasterTier];
  return RECIPES[recipe].roastSecondsPerLbTinPan * lbs * efficiency;
}

/**
 * Ensure cash never goes below 0.
 * The rescue arc flag is NOT updated here — it is evaluated only at endOfDay.
 */
function applyCashFloor(state: SimState): void {
  if (state.cash < 0) {
    state.cash = 0;
  }
}

/**
 * Pick and emit a 'gag' SimEvent using the seeded PRNG.
 * Draws only from tiers unlocked by the current dayNumber (tier gating).
 * Selects a lore line deterministically; records it in gagsSeen.
 * Returns null only if no lines are unlocked (should never happen — early tier is always available).
 */
function maybeGagEvent(state: SimState): SimEvent | null {
  // Filter to lines whose tier gate has been met by the current day.
  const pool = LORE_LINES.filter(
    (l) => state.dayNumber >= LORE_TIER_DAY_GATE[l.tier]
  );
  if (pool.length === 0) return null;
  const idx = Math.floor(nextRand(state) * pool.length);
  const line = pool[idx];
  state.gagsSeen.add(line.id);
  return {
    kind: "gag",
    dayNumber: state.dayNumber,
    daySecond: state.dayElapsedSeconds,
    detail: { loreId: line.id },
  };
}

/** Create a blank RoastSlot. */
function emptySlot(id: number): RoastSlot {
  return { id, status: "empty", batchLbs: 0, recipe: null, secondsRemaining: 0, totalSeconds: 0 };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a fresh SimState for a new game.
 * @param seed — deterministic PRNG seed (any integer); default 1.
 */
export function createState(seed = 1): SimState {
  const slots: RoastSlot[] = [];
  for (let i = 0; i < STARTING_QUEUE_SLOTS; i++) slots.push(emptySlot(i));

  return {
    cash: STARTING_CASH,
    rawStockLbs: STARTING_RAW_STOCK_LBS,
    roastedStockLbs: 0,
    roastedCostBasisPerLb: 0,
    roastedDemandMultBlended: DEFAULT_DEMAND_MULT_BLENDED, // W2: 1.0 at start (classic_salted)
    roastSlots: slots,
    roasterTier: "tin_pan",
    sellPrice: DEFAULT_SELL_PRICE,
    dayElapsedSeconds: 0,
    dayNumber: 1,
    dayStats: { revenue: 0, cogsTotal: 0, unitsSold: 0, cashSpentOnProduction: 0, offlineEarned: 0 },
    rescueArcPending: false,
    unitsSoldLifetime: 0,
    gagsSeen: new Set<string>(),
    lifetimeEarned: 0,
    recipesUnlocked: new Set<string>(["classic_salted"]),
    rngState: seed >>> 0,
  };
}

// ---------------------------------------------------------------------------
// tick(state, dtSeconds) → SimEvent[]
// Advances roast timers and processes customer purchases for dtSeconds of game time.
// Mutates state in place; returns a list of events that occurred.
// ---------------------------------------------------------------------------

export function tick(state: SimState, dtSeconds: number): SimEvent[] {
  const events: SimEvent[] = [];
  // F9: reject non-finite dt
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return events;

  // 1. Advance roast queue
  for (const slot of state.roastSlots) {
    if (slot.status !== "roasting") continue;
    slot.secondsRemaining = Math.max(0, slot.secondsRemaining - dtSeconds);
    if (slot.secondsRemaining === 0) {
      slot.status = "ready";
      // F1: update weighted-average cost basis when new roasted stock arrives.
      const oldLbs  = state.roastedStockLbs;
      const newLbs  = slot.batchLbs;
      const batchBasis = slot.recipe ? cogsPerLb(slot.recipe) : 0;
      const totalLbs = oldLbs + newLbs;
      state.roastedCostBasisPerLb = totalLbs > 0
        ? (oldLbs * state.roastedCostBasisPerLb + newLbs * batchBasis) / totalLbs
        : batchBasis;

      // W2: update blended demand multiplier (weighted average, same pattern as cost basis).
      const batchMult = slot.recipe ? RECIPE_DEMAND_MULT[slot.recipe] : DEFAULT_DEMAND_MULT_BLENDED;
      state.roastedDemandMultBlended = totalLbs > 0
        ? (oldLbs * state.roastedDemandMultBlended + newLbs * batchMult) / totalLbs
        : batchMult;

      state.roastedStockLbs = totalLbs;
      events.push({
        kind: "batch_ready",
        dayNumber: state.dayNumber,
        daySecond: state.dayElapsedSeconds,
        detail: { slotId: slot.id, lbs: slot.batchLbs, recipe: slot.recipe },
      });
    }
  }

  // 2. Customer purchases (if roasted stock available)
  if (state.roastedStockLbs > 0) {
    // Convert lbs/hour demand to lbs/second, then scale by dt.
    // W2: pass blended demand multiplier so mixed inventory sells at weighted velocity.
    // W4: apply day-of-week factor (visible/predictable; no FOMO framing).
    const lbsPerSec = demandLbsPerHour(state.sellPrice, state, state.roastedDemandMultBlended, dayFactorFor(state.dayNumber)) / 3_600;
    const demandedLbs = lbsPerSec * dtSeconds;
    const soldLbs = Math.min(demandedLbs, state.roastedStockLbs);

    if (soldLbs > 0) {
      const revenue = soldLbs * state.sellPrice;
      // F1: COGS recognized at sale using the cost basis of roasted inventory.
      const cogsSold = soldLbs * state.roastedCostBasisPerLb;
      state.roastedStockLbs = Math.max(0, state.roastedStockLbs - soldLbs);
      // Cost basis stays the same (average cost method — selling doesn't change the per-lb basis)
      state.cash += revenue;
      state.dayStats.revenue += revenue;
      state.dayStats.cogsTotal += cogsSold;
      state.dayStats.unitsSold += soldLbs;

      // Gag trigger: fire one 'gag' event per GAG_EVERY_N_LBS_SOLD cumulative lbs.
      // Deterministic: threshold crossed detected by integer-bucket transition.
      const prevBucket = Math.floor(state.unitsSoldLifetime / GAG_EVERY_N_LBS_SOLD);
      state.unitsSoldLifetime += soldLbs;
      const newBucket  = Math.floor(state.unitsSoldLifetime / GAG_EVERY_N_LBS_SOLD);
      if (newBucket > prevBucket) {
        const gagEvent = maybeGagEvent(state);
        if (gagEvent) events.push(gagEvent);
      }

      events.push({
        kind: "sale",
        dayNumber: state.dayNumber,
        daySecond: state.dayElapsedSeconds,
        detail: { lbs: soldLbs, revenue, price: state.sellPrice },
      });
    }
  }

  // 3. Advance day clock
  state.dayElapsedSeconds = Math.min(
    state.dayElapsedSeconds + dtSeconds,
    DAY_DURATION_SECONDS,
  );

  return events;
}

// ---------------------------------------------------------------------------
// buyRaw(state, lbs) → SimEvent | null
// Purchase raw peanuts. Cash deducted immediately.
// Returns null (with no state change) if insufficient cash.
// ---------------------------------------------------------------------------

export function buyRaw(state: SimState, lbs: number): SimEvent | null {
  // F9: reject non-finite input
  if (!Number.isFinite(lbs)) return null;
  // F10: reject orders below the minimum (no silent rounding up)
  if (lbs < RAW_ORDER_MIN_LBS) return null;
  const qty = clamp(Math.floor(lbs), RAW_ORDER_MIN_LBS, RAW_ORDER_MAX_LBS);
  const discount = bulkDiscountFor(qty);
  const pricePerLb = RAW_PEANUT_BASE_PRICE * (1 - discount);
  const totalCost = qty * pricePerLb;

  if (totalCost > state.cash) return null; // insufficient funds — no state change

  state.cash -= totalCost;
  state.rawStockLbs += qty;
  applyCashFloor(state);

  return {
    kind: "supply_purchased",
    dayNumber: state.dayNumber,
    daySecond: state.dayElapsedSeconds,
    detail: { lbs: qty, pricePerLb, totalCost, discount },
  };
}

// ---------------------------------------------------------------------------
// startRoast(state, slotIndex, recipe, lbs) → SimEvent | null
// Load a batch into an empty slot and begin roasting.
// Returns null if slot is not empty, insufficient raw stock, or bad batch size.
// ---------------------------------------------------------------------------

export function startRoast(
  state: SimState,
  slotIndex: number,
  recipe: RecipeId,
  lbs: number,
): SimEvent | null {
  // F9: reject non-finite input
  if (!Number.isFinite(lbs)) return null;

  const slot = state.roastSlots[slotIndex];
  if (!slot || slot.status !== "empty") return null;

  const batchLbs = clamp(Math.floor(lbs), BATCH_MIN_LBS, BATCH_MAX_LBS);
  if (batchLbs > state.rawStockLbs) return null;

  const ingredientCost = RECIPES[recipe].ingredientCostPerLb * batchLbs;
  if (ingredientCost > state.cash) return null;

  // Deduct raw stock and ingredient costs immediately (cash outflow at production).
  // F1: cash-flow lesson — production spend is tracked in cashSpentOnProduction;
  // COGS is recognized in dayStats.cogsTotal only when units are SOLD (in tick).
  state.rawStockLbs -= batchLbs;
  state.cash -= ingredientCost;
  state.dayStats.cashSpentOnProduction += cogsPerLb(recipe) * batchLbs;

  applyCashFloor(state);

  const duration = roastDurationSeconds(recipe, batchLbs, state);
  slot.status = "roasting";
  slot.batchLbs = batchLbs;
  slot.recipe = recipe;
  slot.secondsRemaining = duration;
  slot.totalSeconds = duration;

  return {
    kind: "batch_started",
    dayNumber: state.dayNumber,
    daySecond: state.dayElapsedSeconds,
    detail: { slotId: slotIndex, recipe, lbs: batchLbs, durationSeconds: duration },
  };
}

// ---------------------------------------------------------------------------
// setPrice(state, price) → SimEvent
// Clamps to [PRICE_MIN, PRICE_MAX] and records a price_changed event.
// ---------------------------------------------------------------------------

export function setPrice(state: SimState, price: number): SimEvent {
  // F9: reject non-finite — leave price unchanged, still return an event
  const safe = Number.isFinite(price) ? price : state.sellPrice;
  const clamped = clamp(safe, PRICE_MIN, PRICE_MAX);
  const previous = state.sellPrice;
  state.sellPrice = clamped;

  return {
    kind: "price_changed",
    dayNumber: state.dayNumber,
    daySecond: state.dayElapsedSeconds,
    detail: { previous, current: clamped },
  };
}

// ---------------------------------------------------------------------------
// endOfDay(state) → DayReport
// Closes out the current day: deducts fixed costs, computes P&L, resets day stats,
// increments day counter, zeroes day clock.
// ---------------------------------------------------------------------------

export function endOfDay(state: SimState): DayReport {
  const { revenue, cogsTotal, unitsSold, cashSpentOnProduction, offlineEarned } = state.dayStats;
  // F1: cogsTotal is now COGS of units SOLD (recognized at sale, not production)
  const grossProfit = revenue - cogsTotal;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  // F8: average realized price = revenue / units sold
  const avgRealizedPrice = unitsSold > 0 ? revenue / unitsSold : 0;
  const fixedCosts = DAILY_FIXED_COSTS;
  // F13 fix: offline earnings are pure cash credit (no COGS); included in net post-fixed-cost
  const net = grossProfit - fixedCosts + offlineEarned;

  // Accumulate lifetime earnings BEFORE resetting dayStats (spec §6d).
  state.lifetimeEarned += revenue;

  // Evaluate recipe unlock thresholds against updated lifetimeEarned.
  // State is mutated; GameScene detects new unlocks via state.recipesUnlocked post-call.
  for (const recipeId of (["honey_cinnamon", "ghost_pepper"] as const)) {
    if (!state.recipesUnlocked.has(recipeId) && state.lifetimeEarned >= RECIPE_UNLOCK_THRESHOLD[recipeId]) {
      state.recipesUnlocked.add(recipeId);
    }
  }

  const cashBefore = state.cash;
  // cash already includes all revenue credits (from tick + applyOffline) and ingredient debits
  // (from startRoast). endOfDay only needs to deduct the fixed overhead.
  state.cash = Math.max(0, cashBefore - fixedCosts);

  // F4: rescue arc evaluated only at end-of-day; clears when cash recovers
  state.rescueArcPending = state.cash < RESCUE_ARC_CASH_THRESHOLD;

  const cashAfter = state.cash;

  // W4: pass day-factor context so insight line can reference it (factual, not FOMO).
  // state.dayNumber has not been incremented yet here, so it is the day that just ended.
  const todayFactor = dayFactorFor(state.dayNumber);
  const todayName = DAY_NAMES[((state.dayNumber - 1) % 7 + 7) % 7];

  const insightLine = buildInsightLine({
    revenue,
    grossMarginPct,
    unitsSold,
    roastedStockLbs: state.roastedStockLbs,
    fixedCosts,
    net,
    dayFactor: todayFactor,
    dayName: todayName,
  });

  // Reset day stats and advance day counter
  state.dayStats = { revenue: 0, cogsTotal: 0, unitsSold: 0, cashSpentOnProduction: 0, offlineEarned: 0 };
  state.dayElapsedSeconds = 0;
  state.dayNumber += 1;

  // Clear any "ready" slots — batch consumed/expired at end of day.
  // (P1 simplification: no spoilage tracking for roasted stock between days — see SCOPE NOTES.)
  for (const slot of state.roastSlots) {
    if (slot.status === "ready") {
      Object.assign(slot, emptySlot(slot.id));
    }
  }

  return {
    dayNumber: state.dayNumber - 1, // report is for the day just ended
    unitsSold,
    revenue,
    avgRealizedPrice,
    cogs: cogsTotal,
    grossProfit,
    grossMarginPct,
    cashSpentOnProduction,
    fixedCosts,
    offlineEarned,
    net,
    cashBefore,
    cashAfter,
    insightLine,
  };
}

// ---------------------------------------------------------------------------
// applyOffline(state, elapsedHours) → SimEvent
// Credit offline earnings up to the soft-cap. Framed as "truck rested."
// Never punitive; never shows what was "missed." (DARK_PATTERN_GATE B.2)
// ---------------------------------------------------------------------------

export function applyOffline(state: SimState, elapsedHours: number): SimEvent {
  // F9: reject non-finite input
  const safeHours = Number.isFinite(elapsedHours) ? elapsedHours : 0;
  const cappedHours = clamp(safeHours, 0, OFFLINE_CAP_HOURS);

  // Peak hourly earn rate: estimate from current price × base demand at that price.
  // We use a deterministic approximation (no jitter) so tests are predictable.
  // F2: use new linear demand formula.
  // W2 spec §4: applyOffline conservatively uses classic_salted demand multiplier (1.0)
  // because offline time spans multiple potential recipes and we cannot know the
  // blend that would have applied. This over-estimates slightly, but the
  // maxEarnFromStock cap limits actual earnings to available stock value anyway.
  const baseDemandAtPrice = clamp(
    DEMAND_BASE_LBS_PER_HOUR - DEMAND_SLOPE * (state.sellPrice - DEMAND_BASE_PRICE),
    0,
    DEMAND_MAX_LBS_PER_HOUR,
  );
  const peakHourlyEarnings = baseDemandAtPrice * state.sellPrice;

  const offlineRate = peakHourlyEarnings * OFFLINE_EARN_RATE_FRACTION;
  const cappedRate = Math.min(offlineRate, OFFLINE_CAP_DOLLARS_PER_HOUR);

  const earned = cappedRate * cappedHours;

  // Only credit if there is roasted stock to "sell" during rest.
  // P1 simplification: consume roasted stock proportionally; cap at available stock value.
  const maxEarnFromStock = state.roastedStockLbs * state.sellPrice;
  const actualEarned = Math.min(earned, maxEarnFromStock);
  const stockConsumedLbs =
    state.sellPrice > 0 ? actualEarned / state.sellPrice : 0;

  state.roastedStockLbs = Math.max(0, state.roastedStockLbs - stockConsumedLbs);
  state.cash += actualEarned;
  // F13 fix: write to offlineEarned only — never blend into dayStats.revenue.
  // This keeps on-screen revenue clean so the gross-margin lesson isn't distorted.
  state.dayStats.offlineEarned += actualEarned;

  return {
    kind: "offline_applied",
    dayNumber: state.dayNumber,
    daySecond: state.dayElapsedSeconds,
    detail: {
      elapsedHours,
      cappedHours,
      earned: actualEarned,
      stockConsumedLbs,
      message: `Truck rested for ${cappedHours.toFixed(1)}h. Earned $${actualEarned.toFixed(2)}.`,
    },
  };
}

// ---------------------------------------------------------------------------
// dayFactorFor(dayNumber) → day-of-week demand multiplier
// Pure helper; deterministic (no PRNG). Exported for HUD/report use.
// ---------------------------------------------------------------------------

/**
 * Return the DAY_FACTOR entry for a given 1-indexed game day.
 * dayNumber 1 = Monday (index 0), 2 = Tuesday (index 1), etc.
 * Wraps weekly via modulo so it works for any day count.
 */
export function dayFactorFor(dayNumber: number): number {
  // dayNumber is 1-indexed; (dayNumber - 1) % 7 maps it to Mon=0 … Sun=6
  const idx = ((dayNumber - 1) % 7 + 7) % 7; // safe modulo for any integer
  return DAY_FACTOR[idx];
}

// ---------------------------------------------------------------------------
// projectedDemand(price) → lbs/hour (deterministic, no jitter)
// Pure utility for the price-stepper UI demand hint.
// Uses the same base formula as demandLbsPerHour() but without PRNG jitter.
// ---------------------------------------------------------------------------

/**
 * Deterministic demand estimate (no jitter) at a given price and recipe.
 * Safe to call repeatedly from UI without mutating PRNG state.
 * Formula: (BASE_LBS_PER_HOUR − DEMAND_SLOPE × (price − BASE_PRICE)) × RECIPE_DEMAND_MULT[recipe]
 * Default recipe "classic_salted" preserves backward compat (mult = 1.0).
 */
export function projectedDemand(price: number, recipe: RecipeId = "classic_salted"): number {
  const base = DEMAND_BASE_LBS_PER_HOUR - DEMAND_SLOPE * (price - DEMAND_BASE_PRICE);
  return clamp(base * RECIPE_DEMAND_MULT[recipe], 0, DEMAND_MAX_LBS_PER_HOUR);
}

// ---------------------------------------------------------------------------
// buyRoasterUpgrade(state) → SimEvent | null
// Purchase the next roaster tier. Pure function; mutates state only on success.
// Guards: sufficient cash, next tier exists, NaN-guard, cash floor respected.
// ---------------------------------------------------------------------------

export function buyRoasterUpgrade(state: SimState): SimEvent | null {
  const currentIdx = ROASTER_TIER_ORDER.indexOf(state.roasterTier);
  // NaN-guard: indexOf returns -1 if tier is somehow invalid
  if (currentIdx < 0) return null;
  const nextIdx = currentIdx + 1;
  if (nextIdx >= ROASTER_TIER_ORDER.length) return null; // already at max tier

  const nextTier = ROASTER_TIER_ORDER[nextIdx];
  const cost = ROASTER_UPGRADE_COST[nextTier];
  if (!Number.isFinite(cost) || cost <= 0) return null; // safety: no zero-cost upgrades

  if (cost > state.cash) return null; // insufficient funds — no state change

  state.cash -= cost;
  applyCashFloor(state);
  const prevTier = state.roasterTier;
  state.roasterTier = nextTier;

  return {
    kind: "upgrade_purchased",
    dayNumber: state.dayNumber,
    daySecond: state.dayElapsedSeconds,
    detail: { upgradeType: "roaster", prevTier, nextTier, cost },
  };
}

// ---------------------------------------------------------------------------
// buyQueueSlot(state) → SimEvent | null
// Purchase one additional roast queue slot. Pure function; mutates on success.
// Guards: sufficient cash, below MAX_QUEUE_SLOTS, NaN-guard, cash floor respected.
// ---------------------------------------------------------------------------

export function buyQueueSlot(state: SimState): SimEvent | null {
  const currentSlots = state.roastSlots.length;
  if (currentSlots >= MAX_QUEUE_SLOTS) return null; // already at cap

  // QUEUE_SLOT_COST is 0-indexed by purchase number (0 = buying slot 2, 1 = buying slot 3)
  const purchaseIdx = currentSlots - STARTING_QUEUE_SLOTS;
  const cost = QUEUE_SLOT_COST[purchaseIdx];
  if (cost === undefined || !Number.isFinite(cost) || cost <= 0) return null;

  if (cost > state.cash) return null; // insufficient funds — no state change

  state.cash -= cost;
  applyCashFloor(state);

  // Add a new empty slot with the next sequential id
  const newSlotId = currentSlots; // 0-indexed, so length == next id
  state.roastSlots.push(emptySlot(newSlotId));

  return {
    kind: "upgrade_purchased",
    dayNumber: state.dayNumber,
    daySecond: state.dayElapsedSeconds,
    detail: { upgradeType: "queue_slot", newSlotCount: state.roastSlots.length, cost },
  };
}

// ---------------------------------------------------------------------------
// Internal: generate insight line for end-of-day report card.
// Rules: questions not shame; one per day; maps to a curriculum concept.
// ---------------------------------------------------------------------------

interface InsightParams {
  revenue: number;
  grossMarginPct: number;
  unitsSold: number;
  roastedStockLbs: number;
  fixedCosts: number;
  net: number;
  /** Day-of-week factor applied today (from DAY_FACTOR table). */
  dayFactor: number;
  /** Human-readable day name for insight line. */
  dayName: string;
}

function buildInsightLine(p: InsightParams): string {
  if (p.revenue === 0) {
    return "No sales today — is roasted stock available? Check your roast queue.";
  }
  if (p.net < 0) {
    return `Net loss of $${Math.abs(p.net).toFixed(2)} today. Fixed costs ($${p.fixedCosts.toFixed(2)}) ate your gross profit. Price too low, or too few units sold?`;
  }
  if (p.grossMarginPct < 45) {
    return `Gross margin at ${p.grossMarginPct.toFixed(0)}% — that's unsustainable. Consider raising price or reviewing COGS.`;
  }
  if (p.grossMarginPct < 60) {
    return `Gross margin is ${p.grossMarginPct.toFixed(0)}% — tight. Healthy is above 60%. Raising price slightly could help without losing many sales.`;
  }
  if (p.roastedStockLbs > 5) {
    return `You have ${p.roastedStockLbs.toFixed(1)} lbs unsold. Did you roast too much, or price too high? Try a smaller batch or a price test tomorrow.`;
  }
  if (p.unitsSold < 5) {
    return `Only ${p.unitsSold.toFixed(1)} lbs sold. Was the truck open long enough? Make sure your queue has roasted stock ready before customers arrive.`;
  }
  // W4: day-factor insight — factual, never FOMO-framed.
  // Saturday (factor 1.25) or Friday/Sunday (1.10): note it as context, not pressure.
  if (p.dayFactor >= 1.20) {
    return `${p.dayName} crowd — ${p.grossMarginPct.toFixed(0)}% margin, $${p.net.toFixed(2)} net. Weekend foot traffic runs ~${Math.round(p.dayFactor * 100)}% of baseline.`;
  }
  if (p.dayFactor >= 1.05) {
    return `${p.dayName} boost — foot traffic at ~${Math.round(p.dayFactor * 100)}% of baseline today. ${p.grossMarginPct.toFixed(0)}% margin, $${p.net.toFixed(2)} net.`;
  }
  return `Solid day: ${p.grossMarginPct.toFixed(0)}% gross margin, $${p.net.toFixed(2)} net. Keep supply steady to maintain momentum.`;
}
