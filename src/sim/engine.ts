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
  RESCUE_LOAN_PRINCIPAL,
  RESCUE_LOAN_FEE_RATE,
  RESCUE_LOAN_DUE_DAYS,
  RESCUE_CREDIT_RAW_LBS,
  RESCUE_CREDIT_AMOUNT_DUE,
  RESCUE_CREDIT_DUE_DAYS,
  RESCUE_PREORDER_LBS,
  RESCUE_PREORDER_CASH,
  RESCUE_PREORDER_DUE_DAYS,
  RESCUE_PAYDAY_PRINCIPAL,
  RESCUE_PAYDAY_FEE,
  RESCUE_PAYDAY_DUE_DAYS,
  LEDGER_MAX_DAYS,
  WEEK_RECAP_EVERY_DAYS,
  BRAND_CAMPAIGN_LORE_THRESHOLD,
  BRAND_CAMPAIGN_COST,
  BRAND_CAMPAIGN_PRICE_TOLERANCE,
} from "../data/economy.js";

// default blended multiplier = classic_salted = 1.0
const DEFAULT_DEMAND_MULT_BLENDED = RECIPE_DEMAND_MULT["classic_salted"];

import { LORE_LINES, LORE_TIER_DAY_GATE } from "../data/lore.js";
import { comebackTierFor, comebackPoolForTier, COMEBACK_TIERS } from "../data/comebacks.js";

import type {
  SimState,
  RoastSlot,
  DayReport,
  SimEvent,
  RescueDebt,
  LedgerEntry,
  WeekRecap,
  BalanceSheet,
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
 * Demand curve's reference price, shifted upward when the brand campaign is
 * active (GDD B4: +5% price tolerance — customers accept a higher base price).
 */
function effectiveBasePrice(brandCampaignActive: boolean): number {
  return brandCampaignActive
    ? DEMAND_BASE_PRICE * (1 + BRAND_CAMPAIGN_PRICE_TOLERANCE)
    : DEMAND_BASE_PRICE;
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
 * Brand campaign: BASE_PRICE shifts up 5% when state.brandCampaignActive.
 */
function demandLbsPerHour(price: number, state: SimState, demandMult = 1.0, dayFactor = 1.0): number {
  const base = DEMAND_BASE_LBS_PER_HOUR - DEMAND_SLOPE * (price - effectiveBasePrice(state.brandCampaignActive));
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
 * Pick and emit 'gag' SimEvent(s) using the seeded PRNG.
 * Draws only from tiers unlocked by the current dayNumber (tier gating).
 * Selects a lore line deterministically; records it in gagsSeen.
 *
 * Comeback Lines (GDD B4): when the player's unique-lore count crosses a
 * COMEBACK_TIERS threshold, a one-time "comeback_unlocked" event follows the
 * gag. Once any tier is unlocked, the gag event carries a comebackId — an
 * owner reply drawn from all unlocked tiers (UI shows it instead of the stock
 * reply). The extra PRNG draw happens ONLY when comebackTier > 0, so the
 * pre-unlock event sequence is identical to older saves.
 *
 * Returns [] only if no lines are unlocked (should never happen — early tier
 * is always available).
 */
function maybeGagEvents(state: SimState): SimEvent[] {
  // Filter to lines whose tier gate has been met by the current day.
  const pool = LORE_LINES.filter(
    (l) => state.dayNumber >= LORE_TIER_DAY_GATE[l.tier]
  );
  if (pool.length === 0) return [];
  const idx = Math.floor(nextRand(state) * pool.length);
  const line = pool[idx];
  state.gagsSeen.add(line.id);

  const events: SimEvent[] = [];
  const detail: Record<string, unknown> = { loreId: line.id };

  // Comeback reply: pick from the pool of all unlocked tiers (tier > 0 only).
  if (state.comebackTier > 0) {
    const comebacks = comebackPoolForTier(state.comebackTier);
    if (comebacks.length > 0) {
      const cIdx = Math.floor(nextRand(state) * comebacks.length);
      detail.comebackId = comebacks[cIdx].id;
    }
  }

  events.push({
    kind: "gag",
    dayNumber: state.dayNumber,
    daySecond: state.dayElapsedSeconds,
    detail,
  });

  // Threshold crossing: unique-lore count may unlock a new comeback tier.
  const newTier = comebackTierFor(state.gagsSeen.size);
  if (newTier > state.comebackTier) {
    state.comebackTier = newTier;
    const tierDef = COMEBACK_TIERS[newTier - 1];
    events.push({
      kind: "comeback_unlocked",
      dayNumber: state.dayNumber,
      daySecond: state.dayElapsedSeconds,
      detail: {
        tier: newTier,
        label: tierDef.label,
        threshold: tierDef.threshold,
      },
    });
  }

  return events;
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
    rescueMode: null,
    rescueDebts: [],
    preorderObligation: null,
    unitsSoldLifetime: 0,
    gagsSeen: new Set<string>(),
    lifetimeEarned: 0,
    recipesUnlocked: new Set<string>(["classic_salted"]),
    netHistory: [],
    ledger: [],
    comebackTier: 0,
    brandCampaignActive: false,
    aftermathSeen: [],
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
        events.push(...maybeGagEvents(state));
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

  // Append today's net to the rolling 14-day history (sparkline source).
  state.netHistory.push(net);
  if (state.netHistory.length > 14) state.netHistory.shift();

  // Evaluate recipe unlock thresholds against updated lifetimeEarned.
  // State is mutated; GameScene detects new unlocks via state.recipesUnlocked post-call.
  for (const recipeId of (["honey_cinnamon", "ghost_pepper"] as const)) {
    if (!state.recipesUnlocked.has(recipeId) && state.lifetimeEarned >= RECIPE_UNLOCK_THRESHOLD[recipeId]) {
      state.recipesUnlocked.add(recipeId);
    }
  }

  // ---- Wave 5: rescue arc — preorder fulfillment + debt auto-repayment ----
  // Processed before fixed costs so the player gets full benefit of the day's earnings.
  const rescueEvents: SimEvent[] = [];

  // Ledger v1: cash paid toward debts at this close (cash-flow, not P&L).
  let debtService = 0;

  // Aftermath beats: fire ONCE per path, ever (tracked in aftermathSeen).
  // Content lives in data/rescue_aftermath.ts; the engine emits only the path key.
  // SCOPE RAIL: aftermath is closure-only — it never creates a new offer/debt
  // (re-entry escalation is owner-gated per red-team RT-1).
  const emitAftermath = (path: string): void => {
    if (state.aftermathSeen.includes(path)) return;
    state.aftermathSeen.push(path);
    rescueEvents.push({
      kind: "debt_aftermath",
      dayNumber: state.dayNumber,
      daySecond: state.dayElapsedSeconds,
      detail: { path },
    });
  };

  // 3a. Preorder fulfillment: allocate roasted stock toward obligation
  if (state.preorderObligation) {
    const ob = state.preorderObligation;
    const remaining = ob.totalLbs - ob.fulfilledLbs;
    const canFulfill = Math.min(remaining, state.roastedStockLbs);
    if (canFulfill > 0) {
      ob.fulfilledLbs += canFulfill;
      state.roastedStockLbs = Math.max(0, state.roastedStockLbs - canFulfill);
    }

    if (state.dayNumber >= ob.dueDayNumber) {
      // Delivery day: check if fully or partially fulfilled
      if (ob.fulfilledLbs >= ob.totalLbs) {
        // Full delivery — success
        rescueEvents.push({
          kind: "preorder_fulfilled",
          dayNumber: state.dayNumber,
          daySecond: state.dayElapsedSeconds,
          detail: {
            fulfilledLbs: ob.fulfilledLbs,
            totalLbs: ob.totalLbs,
            message: "Derek's order delivered in full.",
          },
        });
        state.preorderObligation = null;
        emitAftermath("preorder");
      } else {
        // Partial delivery — pro-rata payment adjustment (we already received cash upfront;
        // script says trust dented, not reversed; we keep the math clean:
        // the cash was already credited, no clawback — delivery failure costs reputation only)
        const pct = ob.fulfilledLbs / ob.totalLbs;
        rescueEvents.push({
          kind: "preorder_partial",
          dayNumber: state.dayNumber,
          daySecond: state.dayElapsedSeconds,
          detail: {
            fulfilledLbs: ob.fulfilledLbs,
            totalLbs: ob.totalLbs,
            pctDelivered: pct,
            message: `Partial delivery: ${ob.fulfilledLbs.toFixed(0)} of ${ob.totalLbs} lbs. Derek is disappointed.`,
          },
        });
        state.preorderObligation = null;
      }
    }
  }

  // 3b. Debt repayment: attempt auto-deduct for due debts
  const remainingDebts: RescueDebt[] = [];
  for (const debt of state.rescueDebts) {
    if (state.dayNumber >= debt.dueDayNumber) {
      if (state.cash >= debt.amountDue) {
        // Can pay — auto-deduct
        state.cash -= debt.amountDue;
        applyCashFloor(state);
        let message = "";
        if (debt.kind === "payday") {
          message = debt.rollovers > 0
            ? `Paid off QuickNut. That fee money is gone — that's the lesson.`
            : `QuickNut repaid $${debt.amountDue.toFixed(2)}.`;
        } else if (debt.kind === "loan") {
          message = `Old Joe's loan repaid. $${debt.amountDue.toFixed(2)} paid.`;
        } else {
          message = `Supplier credit paid. $${debt.amountDue.toFixed(2)} paid.`;
        }
        rescueEvents.push({
          kind: "debt_repaid",
          dayNumber: state.dayNumber,
          daySecond: state.dayElapsedSeconds,
          detail: { debtKind: debt.kind, amountPaid: debt.amountDue, message },
        });
        debtService += debt.amountDue;
        emitAftermath(debt.kind);
        // Do NOT push to remainingDebts — debt is cleared
      } else if (debt.kind === "payday") {
        // Payday rollover: add $7.50 fee, extend by 14 days
        const rolloverFee = RESCUE_PAYDAY_FEE;
        debt.amountDue += rolloverFee;
        debt.dueDayNumber += RESCUE_PAYDAY_DUE_DAYS;
        debt.rollovers += 1;
        rescueEvents.push({
          kind: "payday_rollover",
          dayNumber: state.dayNumber,
          daySecond: state.dayElapsedSeconds,
          detail: {
            newAmountDue: debt.amountDue,
            newDueDayNumber: debt.dueDayNumber,
            rollovers: debt.rollovers,
            message: `QuickNut rolled over: +$${rolloverFee.toFixed(2)} fee. Total owed $${debt.amountDue.toFixed(2)}.`,
          },
        });
        remainingDebts.push(debt);
      } else {
        // Loan or credit: gentle extension (one more period, no extra fee per script)
        debt.dueDayNumber += RESCUE_LOAN_DUE_DAYS;
        rescueEvents.push({
          kind: "debt_extended",
          dayNumber: state.dayNumber,
          daySecond: state.dayElapsedSeconds,
          detail: {
            debtKind: debt.kind,
            newDueDayNumber: debt.dueDayNumber,
            amountDue: debt.amountDue,
            message: debt.kind === "loan"
              ? `Old Joe extends the loan — $${debt.amountDue.toFixed(2)} now due day ${debt.dueDayNumber}.`
              : `Supplier extends credit — $${debt.amountDue.toFixed(2)} now due day ${debt.dueDayNumber}.`,
          },
        });
        remainingDebts.push(debt);
      }
    } else {
      remainingDebts.push(debt); // not due yet
    }
  }
  state.rescueDebts = remainingDebts;

  // ---- End Wave 5 rescue-arc processing ----

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

  // Wave 5: build active-debt summary line for the report card.
  const activeDebtSummary = buildActiveDebtSummary(state);

  // ---- Ledger v1: append today's P&L row (ring-capped) --------------------
  // state.dayNumber is still the day that just ended (incremented below).
  const endedDay = state.dayNumber;
  const ledgerEntry: LedgerEntry = {
    day: endedDay,
    revenue,
    cogs: cogsTotal,
    fixedCosts,
    offlineEarned,
    net,
    debtService,
    cashAfter,
  };
  state.ledger.push(ledgerEntry);
  if (state.ledger.length > LEDGER_MAX_DAYS) {
    state.ledger.splice(0, state.ledger.length - LEDGER_MAX_DAYS);
  }

  // ---- Weekly recap: every WEEK_RECAP_EVERY_DAYS days ----------------------
  // Factual totals only — no streak framing (DARK_PATTERN_GATE A.1/A.4).
  let weekRecap: WeekRecap | null = null;
  if (endedDay % WEEK_RECAP_EVERY_DAYS === 0) {
    // Rows belonging to this week (days endedDay-6 … endedDay); the ledger may
    // hold fewer if the save predates the ledger or history was trimmed.
    const weekRows = state.ledger.filter((e) => e.day > endedDay - WEEK_RECAP_EVERY_DAYS);
    if (weekRows.length > 0) {
      const totalRevenue = weekRows.reduce((sum, e) => sum + e.revenue, 0);
      const totalNet     = weekRows.reduce((sum, e) => sum + e.net, 0);
      const totalCogs    = weekRows.reduce((sum, e) => sum + e.cogs, 0);
      let bestDay = weekRows[0];
      for (const e of weekRows) {
        if (e.net > bestDay.net) bestDay = e;
      }
      weekRecap = {
        weekNumber: endedDay / WEEK_RECAP_EVERY_DAYS,
        daysIncluded: weekRows.length,
        totalRevenue,
        totalNet,
        bestDay: { day: bestDay.day, net: bestDay.net },
        grossMarginPct: totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0,
      };
    }
  }

  // Wave 5: set rescueMode to "offer" when rescue arc is pending.
  // Clear "active" mode when all debts and obligations are resolved.
  //
  // RED-TEAM RT-1 (wave4): never re-offer while a rescue line is still ACTIVE.
  // Without this gate, a player whose cash stays below the trigger could stack a
  // new +$75 loan every day while old loans auto-extend fee-free — an infinite
  // cash pump that inverts the lesson. Script §Re-Entry *does* allow repeat
  // crises, but only with escalation (7% second loan, Marta hesitation) that v1
  // does not implement yet; until that ships, one concurrent crisis line is canon.
  if (state.rescueArcPending && state.rescueMode !== "active") {
    state.rescueMode = "offer";
  } else if (state.rescueMode === "active" && state.rescueDebts.length === 0 && state.preorderObligation === null) {
    state.rescueMode = null;
  }

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
    activeDebtSummary,
    rescueEvents,
    debtService,
    weekRecap,
  };
}

// ---------------------------------------------------------------------------
// balanceSheet(state) → BalanceSheet
// Pure snapshot: assets = liabilities + equity (computed, never stored).
// Inventory at cost (conservative): raw at base price, roasted at cost basis.
// Derek's preorder is deferred revenue — cash received for goods not yet
// delivered is a liability until earned (BUSINESS_CURRICULUM: profit ≠ cash).
// ---------------------------------------------------------------------------

export function balanceSheet(state: SimState): BalanceSheet {
  const cash = state.cash;
  const rawInventoryValue = state.rawStockLbs * RAW_PEANUT_BASE_PRICE;
  const roastedInventoryValue = state.roastedStockLbs * state.roastedCostBasisPerLb;

  const debtsOwed = state.rescueDebts.reduce((sum, d) => sum + d.amountDue, 0);

  // Unearned fraction of the preorder cash (straight-line by lbs delivered).
  let deferredRevenue = 0;
  const ob = state.preorderObligation;
  if (ob && ob.totalLbs > 0) {
    const unearnedFraction = Math.max(0, 1 - ob.fulfilledLbs / ob.totalLbs);
    deferredRevenue = ob.cashReceived * unearnedFraction;
  }

  const assetsTotal = cash + rawInventoryValue + roastedInventoryValue;
  const liabilitiesTotal = debtsOwed + deferredRevenue;

  return {
    assets: {
      cash,
      rawInventoryValue,
      roastedInventoryValue,
      total: assetsTotal,
    },
    liabilities: {
      debtsOwed,
      deferredRevenue,
      total: liabilitiesTotal,
    },
    equity: assetsTotal - liabilitiesTotal,
  };
}

// ---------------------------------------------------------------------------
// buyBrandCampaign(state) → SimEvent | null
// One-time purchase of the "Legumes. Not Nuts." brand campaign (GDD B4).
// Guards: lore threshold met, not already active, sufficient cash.
// No timer, no expiry — the unlock waits forever once earned (no FOMO).
// ---------------------------------------------------------------------------

export function buyBrandCampaign(state: SimState): SimEvent | null {
  if (state.brandCampaignActive) return null;                        // one-time
  if (state.gagsSeen.size < BRAND_CAMPAIGN_LORE_THRESHOLD) return null; // not earned yet
  if (BRAND_CAMPAIGN_COST > state.cash) return null;                 // insufficient funds

  state.cash -= BRAND_CAMPAIGN_COST;
  applyCashFloor(state);
  state.brandCampaignActive = true;

  return {
    kind: "upgrade_purchased",
    dayNumber: state.dayNumber,
    daySecond: state.dayElapsedSeconds,
    detail: {
      upgradeType: "brand_campaign",
      cost: BRAND_CAMPAIGN_COST,
      priceTolerance: BRAND_CAMPAIGN_PRICE_TOLERANCE,
    },
  };
}

// ---------------------------------------------------------------------------
// chooseRescuePath(state, path) → SimEvent
// Apply a rescue path when the player selects one from the rescue-offer modal.
// Deterministic; no PRNG. Cash floor respected. Returns an event for the log.
// ---------------------------------------------------------------------------

export type RescuePath = "loan" | "credit" | "preorder" | "payday" | "decline";

/**
 * Apply the chosen rescue path to the state.
 *
 * "loan"     — +$75 cash; debt $78.75 due in 14 game-days.
 * "credit"   — +125 lbs raw stock; debt $50.00 due in 14 game-days.
 * "preorder" — +$110 cash; obligation: deliver 100 lbs roasted in 7 days.
 * "payday"   — +$50 cash; debt $57.50 due in 14 game-days; rolls over on miss.
 * "decline"  — no state change; rescueMode reset to null (re-triggers next time).
 */
export function chooseRescuePath(state: SimState, path: RescuePath): SimEvent {
  // The offer modal is only available in "offer" mode.
  // Guard: if not in offer mode, treat as decline (idempotent).
  if (state.rescueMode !== "offer") {
    return {
      kind: "rescue_path_chosen",
      dayNumber: state.dayNumber,
      daySecond: state.dayElapsedSeconds,
      detail: { path: "decline", reason: "not_in_offer_mode" },
    };
  }

  if (path === "decline") {
    // Player declines — clear offer mode, can re-trigger on next low-cash day
    state.rescueMode = null;
    state.rescueArcPending = false;
    return {
      kind: "rescue_path_chosen",
      dayNumber: state.dayNumber,
      daySecond: state.dayElapsedSeconds,
      detail: { path, cashChange: 0 },
    };
  }

  if (path === "loan") {
    const principal = RESCUE_LOAN_PRINCIPAL;
    const fee = principal * RESCUE_LOAN_FEE_RATE;
    const amountDue = principal + fee; // $78.75
    const debt: RescueDebt = {
      kind: "loan",
      principal,
      amountDue,
      dueDayNumber: state.dayNumber + RESCUE_LOAN_DUE_DAYS,
      createdOnDay: state.dayNumber,
      rollovers: 0,
    };
    state.cash += principal;
    applyCashFloor(state);
    state.rescueDebts.push(debt);
    state.rescueMode = "active";
    state.rescueArcPending = false;
    return {
      kind: "rescue_path_chosen",
      dayNumber: state.dayNumber,
      daySecond: state.dayElapsedSeconds,
      detail: { path, cashChange: principal, amountDue, dueDayNumber: debt.dueDayNumber },
    };
  }

  if (path === "credit") {
    // +125 lbs raw stock (not cash); debt $50 due in 14 days
    state.rawStockLbs += RESCUE_CREDIT_RAW_LBS;
    const debt: RescueDebt = {
      kind: "credit",
      principal: RESCUE_CREDIT_AMOUNT_DUE,
      amountDue: RESCUE_CREDIT_AMOUNT_DUE,
      dueDayNumber: state.dayNumber + RESCUE_CREDIT_DUE_DAYS,
      createdOnDay: state.dayNumber,
      rollovers: 0,
    };
    state.rescueDebts.push(debt);
    state.rescueMode = "active";
    state.rescueArcPending = false;
    return {
      kind: "rescue_path_chosen",
      dayNumber: state.dayNumber,
      daySecond: state.dayElapsedSeconds,
      detail: { path, rawLbsAdded: RESCUE_CREDIT_RAW_LBS, amountDue: RESCUE_CREDIT_AMOUNT_DUE, dueDayNumber: debt.dueDayNumber },
    };
  }

  if (path === "preorder") {
    // Only one preorder obligation at a time
    if (state.preorderObligation !== null) {
      return {
        kind: "rescue_path_chosen",
        dayNumber: state.dayNumber,
        daySecond: state.dayElapsedSeconds,
        detail: { path, reason: "preorder_already_active" },
      };
    }
    state.cash += RESCUE_PREORDER_CASH;
    applyCashFloor(state);
    state.preorderObligation = {
      totalLbs: RESCUE_PREORDER_LBS,
      fulfilledLbs: 0,
      dueDayNumber: state.dayNumber + RESCUE_PREORDER_DUE_DAYS,
      cashReceived: RESCUE_PREORDER_CASH,
      createdOnDay: state.dayNumber,
    };
    state.rescueMode = "active";
    state.rescueArcPending = false;
    return {
      kind: "rescue_path_chosen",
      dayNumber: state.dayNumber,
      daySecond: state.dayElapsedSeconds,
      detail: { path, cashChange: RESCUE_PREORDER_CASH, totalLbs: RESCUE_PREORDER_LBS, dueDayNumber: state.preorderObligation.dueDayNumber },
    };
  }

  // path === "payday"
  const principal = RESCUE_PAYDAY_PRINCIPAL;
  const amountDue = principal + RESCUE_PAYDAY_FEE; // $57.50
  const debt: RescueDebt = {
    kind: "payday",
    principal,
    amountDue,
    dueDayNumber: state.dayNumber + RESCUE_PAYDAY_DUE_DAYS,
    createdOnDay: state.dayNumber,
    rollovers: 0,
  };
  state.cash += principal;
  applyCashFloor(state);
  state.rescueDebts.push(debt);
  state.rescueMode = "active";
  state.rescueArcPending = false;
  return {
    kind: "rescue_path_chosen",
    dayNumber: state.dayNumber,
    daySecond: state.dayElapsedSeconds,
    detail: { path, cashChange: principal, amountDue, dueDayNumber: debt.dueDayNumber, aprPct: 391 },
  };
}

// ---------------------------------------------------------------------------
// buildActiveDebtSummary — one-line liability summary for the report card
// ---------------------------------------------------------------------------

function buildActiveDebtSummary(state: SimState): string | null {
  const parts: string[] = [];

  for (const debt of state.rescueDebts) {
    const daysLeft = debt.dueDayNumber - state.dayNumber;
    if (debt.kind === "loan") {
      parts.push(`Owe Old Joe $${debt.amountDue.toFixed(2)} — day ${state.dayNumber}/${debt.dueDayNumber} (${daysLeft} days left)`);
    } else if (debt.kind === "credit") {
      parts.push(`Owe supplier $${debt.amountDue.toFixed(2)} — day ${state.dayNumber}/${debt.dueDayNumber} (${daysLeft} days left)`);
    } else if (debt.kind === "payday") {
      const rolloverNote = debt.rollovers > 0 ? ` [${debt.rollovers}x rolled]` : "";
      parts.push(`QuickNut: $${debt.amountDue.toFixed(2)} due day ${debt.dueDayNumber}${rolloverNote}`);
    }
  }

  if (state.preorderObligation) {
    const ob = state.preorderObligation;
    const daysLeft = ob.dueDayNumber - state.dayNumber;
    parts.push(`Derek's order: ${ob.fulfilledLbs.toFixed(0)}/${ob.totalLbs} lbs — ${daysLeft} days left`);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
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
    DEMAND_BASE_LBS_PER_HOUR - DEMAND_SLOPE * (state.sellPrice - effectiveBasePrice(state.brandCampaignActive)),
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
// optimumPrice(recipe) → $ per lb
// Pure helper: the price that maximises total profit for a given recipe.
// Derivation: d/dp [(p - cogs) * demand(p)] = 0 with demand linear in p gives
//   p* = (BASE_LBS_PER_HOUR / DEMAND_SLOPE + DEMAND_BASE_PRICE + cogs) / 2
// Clamped to [PRICE_MIN, PRICE_MAX] so the UI can always display it.
// Exported for recipe-card two-row preview (Wave 4 polish, item 6).
// ---------------------------------------------------------------------------

/**
 * Return the profit-maximising price for a given recipe.
 * Uses the global demand curve constants (no recipe-specific demand mult —
 * the formula is the same regardless of demand-mult scaling because the mult
 * cancels out in the first-order condition).
 * Brand campaign: pass campaignActive so the preview reflects the shifted
 * base price (optimum rises by half the tolerance shift).
 */
export function optimumPrice(recipe: RecipeId, campaignActive = false): number {
  const cogs = RAW_PEANUT_BASE_PRICE + RECIPES[recipe].ingredientCostPerLb;
  const pStar = (DEMAND_BASE_LBS_PER_HOUR / DEMAND_SLOPE + effectiveBasePrice(campaignActive) + cogs) / 2;
  return clamp(parseFloat(pStar.toFixed(2)), PRICE_MIN, PRICE_MAX);
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
 * Brand campaign: pass campaignActive so the HUD hint matches live demand.
 */
export function projectedDemand(price: number, recipe: RecipeId = "classic_salted", campaignActive = false): number {
  const base = DEMAND_BASE_LBS_PER_HOUR - DEMAND_SLOPE * (price - effectiveBasePrice(campaignActive));
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
