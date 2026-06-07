/**
 * edge_cases.test.ts — Boundary and unhappy-path tests for the P1 sim engine.
 *
 * Added by QA (provost-qa) to close coverage gaps identified during QA pass:
 *   1. setPrice clamping exactly at PRICE_MIN / PRICE_MAX bounds
 *   2. buyRaw insufficient cash (exact boundary: cost == cash succeeds; cost > cash fails)
 *   3. startRoast insufficient raw stock
 *   4. tick with dt=0 (must be a no-op)
 *   5. tick with huge dt (day clock must cap at DAY_DURATION_SECONDS, not overflow)
 *   6. applyOffline at exactly OFFLINE_CAP_HOURS (boundary — not one over, not one under)
 *   7. endOfDay called twice consecutively (second call deducts fixed costs again; no double-count)
 *
 * All tests are pure-sim, deterministic, no Phaser.
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  tick,
  buyRaw,
  startRoast,
  setPrice,
  endOfDay,
  applyOffline,
} from "./engine.js";
import {
  PRICE_MIN,
  PRICE_MAX,
  RAW_PEANUT_BASE_PRICE,
  RAW_ORDER_MIN_LBS,
  DAY_DURATION_SECONDS,
  OFFLINE_CAP_HOURS,
  OFFLINE_CAP_DOLLARS_PER_HOUR,
  STARTING_CASH,
} from "../data/economy.js";

// ---------------------------------------------------------------------------
// 1. setPrice — clamping exactly at bounds
// ---------------------------------------------------------------------------

describe("setPrice — bound clamping", () => {
  it("price set to exactly PRICE_MIN is stored unchanged", () => {
    const state = createState(1);
    const ev = setPrice(state, PRICE_MIN);
    expect(state.sellPrice).toBe(PRICE_MIN);
    expect(ev.detail.current).toBe(PRICE_MIN);
  });

  it("price set to exactly PRICE_MAX is stored unchanged", () => {
    const state = createState(1);
    const ev = setPrice(state, PRICE_MAX);
    expect(state.sellPrice).toBe(PRICE_MAX);
    expect(ev.detail.current).toBe(PRICE_MAX);
  });

  it("price one epsilon below PRICE_MIN is clamped to PRICE_MIN", () => {
    const state = createState(1);
    setPrice(state, PRICE_MIN - 0.001);
    expect(state.sellPrice).toBe(PRICE_MIN);
  });

  it("price one epsilon above PRICE_MAX is clamped to PRICE_MAX", () => {
    const state = createState(1);
    setPrice(state, PRICE_MAX + 0.001);
    expect(state.sellPrice).toBe(PRICE_MAX);
  });

  it("event records the previous price correctly on clamp", () => {
    const state = createState(1);
    // Default price is DEFAULT_SELL_PRICE; now clamp below floor
    const prevPrice = state.sellPrice;
    const ev = setPrice(state, -999);
    expect(ev.detail.previous).toBe(prevPrice);
    expect(ev.detail.current).toBe(PRICE_MIN);
  });
});

// ---------------------------------------------------------------------------
// 2. buyRaw — insufficient cash boundary
// ---------------------------------------------------------------------------

describe("buyRaw — insufficient cash boundary", () => {
  it("purchase succeeds when cash exactly equals the total cost", () => {
    const state = createState(1);
    // RAW_ORDER_MIN_LBS = 10, cost = 10 × $0.40 = $4.00
    const exactCost = RAW_ORDER_MIN_LBS * RAW_PEANUT_BASE_PRICE; // $4.00
    state.cash = exactCost;
    const ev = buyRaw(state, RAW_ORDER_MIN_LBS);
    expect(ev).not.toBeNull();
    expect(state.cash).toBeCloseTo(0, 8);
    expect(state.rawStockLbs).toBeGreaterThan(0);
  });

  it("purchase fails when cash is one cent short of total cost", () => {
    const state = createState(1);
    const exactCost = RAW_ORDER_MIN_LBS * RAW_PEANUT_BASE_PRICE; // $4.00
    state.cash = exactCost - 0.01; // $3.99 — one cent short
    const rawBefore = state.rawStockLbs;
    const cashBefore = state.cash;
    const ev = buyRaw(state, RAW_ORDER_MIN_LBS);
    expect(ev).toBeNull();
    // State must be completely unchanged
    expect(state.cash).toBe(cashBefore);
    expect(state.rawStockLbs).toBe(rawBefore);
  });

  it("purchase with zero cash is rejected", () => {
    const state = createState(1);
    state.cash = 0;
    const ev = buyRaw(state, RAW_ORDER_MIN_LBS);
    expect(ev).toBeNull();
    expect(state.cash).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. startRoast — insufficient raw stock
// ---------------------------------------------------------------------------

describe("startRoast — insufficient raw stock", () => {
  it("returns null when rawStockLbs < requested batch", () => {
    const state = createState(1);
    state.cash = STARTING_CASH;
    state.rawStockLbs = 5; // only 5 lbs available
    const rawBefore = state.rawStockLbs;
    const cashBefore = state.cash;
    const ev = startRoast(state, 0, "classic_salted", 10); // asks for 10
    expect(ev).toBeNull();
    // State must be completely unchanged
    expect(state.rawStockLbs).toBe(rawBefore);
    expect(state.cash).toBe(cashBefore);
    expect(state.roastSlots[0].status).toBe("empty");
  });

  it("returns null when rawStockLbs is exactly zero", () => {
    const state = createState(1);
    state.cash = STARTING_CASH;
    state.rawStockLbs = 0;
    const ev = startRoast(state, 0, "classic_salted", 1); // minimum batch
    expect(ev).toBeNull();
    expect(state.roastSlots[0].status).toBe("empty");
  });

  it("succeeds when rawStockLbs exactly equals batch size", () => {
    const state = createState(1);
    state.cash = STARTING_CASH;
    state.rawStockLbs = 10;
    const ev = startRoast(state, 0, "classic_salted", 10);
    expect(ev).not.toBeNull();
    expect(state.rawStockLbs).toBe(0);
    expect(state.roastSlots[0].status).toBe("roasting");
  });
});

// ---------------------------------------------------------------------------
// 4. tick — dt=0 is a strict no-op
// ---------------------------------------------------------------------------

describe("tick — dt=0 is a no-op", () => {
  it("tick(0) returns empty events array", () => {
    const state = createState(1);
    state.roastedStockLbs = 100; // give it stock so demand would fire if dt > 0
    const events = tick(state, 0);
    expect(events).toHaveLength(0);
  });

  it("tick(0) does not change cash", () => {
    const state = createState(1);
    state.roastedStockLbs = 100;
    const cashBefore = state.cash;
    tick(state, 0);
    expect(state.cash).toBe(cashBefore);
  });

  it("tick(0) does not advance dayElapsedSeconds", () => {
    const state = createState(1);
    const timeBefore = state.dayElapsedSeconds;
    tick(state, 0);
    expect(state.dayElapsedSeconds).toBe(timeBefore);
  });

  it("tick(negative dt) is also a no-op (treated same as 0)", () => {
    const state = createState(1);
    state.roastedStockLbs = 100;
    const cashBefore = state.cash;
    const timeBefore = state.dayElapsedSeconds;
    const events = tick(state, -999);
    expect(events).toHaveLength(0);
    expect(state.cash).toBe(cashBefore);
    expect(state.dayElapsedSeconds).toBe(timeBefore);
  });
});

// ---------------------------------------------------------------------------
// 5. tick — huge dt must not overflow DAY_DURATION_SECONDS
// ---------------------------------------------------------------------------

describe("tick — huge dt caps at DAY_DURATION_SECONDS", () => {
  it("single tick with dt >> DAY_DURATION_SECONDS clamps day clock at max", () => {
    const state = createState(1);
    tick(state, 1e9); // 1 billion simulated seconds
    expect(state.dayElapsedSeconds).toBeLessThanOrEqual(DAY_DURATION_SECONDS);
    expect(state.dayElapsedSeconds).toBeCloseTo(DAY_DURATION_SECONDS, 1);
  });

  it("day clock never exceeds DAY_DURATION_SECONDS across many large ticks", () => {
    const state = createState(1);
    state.roastedStockLbs = 100_000;
    for (let i = 0; i < 10; i++) {
      tick(state, 1e7);
    }
    expect(state.dayElapsedSeconds).toBeLessThanOrEqual(DAY_DURATION_SECONDS);
  });

  it("cash is never negative after a huge tick with finite stock", () => {
    const state = createState(1);
    state.roastedStockLbs = 50;
    tick(state, 1e9);
    expect(state.cash).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 6. applyOffline — exactly at the cap boundary
// ---------------------------------------------------------------------------

describe("applyOffline — exactly at OFFLINE_CAP_HOURS boundary", () => {
  it("cappedHours equals OFFLINE_CAP_HOURS when elapsedHours == OFFLINE_CAP_HOURS", () => {
    const state = createState(1);
    state.roastedStockLbs = 1_000_000;
    const ev = applyOffline(state, OFFLINE_CAP_HOURS);
    expect(ev.detail.cappedHours).toBe(OFFLINE_CAP_HOURS);
  });

  it("cappedHours for exactly-at-cap equals cappedHours for far-over-cap", () => {
    const stateA = createState(1);
    stateA.roastedStockLbs = 1_000_000;
    const stateB = createState(1);
    stateB.roastedStockLbs = 1_000_000;

    const evA = applyOffline(stateA, OFFLINE_CAP_HOURS);          // exactly at cap
    const evB = applyOffline(stateB, OFFLINE_CAP_HOURS * 10);     // well over cap

    expect(evA.detail.cappedHours).toBe(OFFLINE_CAP_HOURS);
    expect(evB.detail.cappedHours).toBe(OFFLINE_CAP_HOURS);
    // Earnings must match (same cap, same state)
    expect(evA.detail.earned as number).toBeCloseTo(evB.detail.earned as number, 6);
  });

  it("elapsedHours just under cap earns less than exactly at cap", () => {
    const stateA = createState(1);
    stateA.roastedStockLbs = 1_000_000;
    const stateB = createState(1);
    stateB.roastedStockLbs = 1_000_000;

    const evUnder = applyOffline(stateA, OFFLINE_CAP_HOURS - 1); // 1 hour under
    const evAt    = applyOffline(stateB, OFFLINE_CAP_HOURS);     // exactly at cap

    expect(evUnder.detail.earned as number).toBeLessThan(evAt.detail.earned as number);
  });

  it("per-hour rate never exceeds OFFLINE_CAP_DOLLARS_PER_HOUR even at boundary", () => {
    const state = createState(1);
    state.roastedStockLbs = 1_000_000;
    const ev = applyOffline(state, OFFLINE_CAP_HOURS);
    const earned = ev.detail.earned as number;
    const cappedHours = ev.detail.cappedHours as number;
    // Per-hour rate = earned / cappedHours
    const perHourRate = earned / cappedHours;
    expect(perHourRate).toBeLessThanOrEqual(OFFLINE_CAP_DOLLARS_PER_HOUR + 0.001);
  });
});

// ---------------------------------------------------------------------------
// 7. endOfDay — called twice consecutively
// ---------------------------------------------------------------------------

describe("endOfDay — called twice", () => {
  it("second endOfDay sees zero revenue (stats were reset)", () => {
    const state = createState(1);
    // Inject some stats for the first day
    state.dayStats.revenue   = 20.00;
    state.dayStats.cogsTotal = 8.00;
    state.dayStats.unitsSold = 10;

    const report1 = endOfDay(state);
    expect(report1.revenue).toBeCloseTo(20.00, 5);
    expect(report1.dayNumber).toBe(1);

    // Second call — dayStats were reset, so second report should show zero revenue
    const report2 = endOfDay(state);
    expect(report2.revenue).toBe(0);
    expect(report2.cogs).toBe(0);
    expect(report2.unitsSold).toBe(0);
    expect(report2.dayNumber).toBe(2); // second day just ended
    expect(state.dayNumber).toBe(3);   // now on day 3
  });

  it("second endOfDay still deducts fixed costs (not double-counted from first)", () => {
    const state = createState(1);
    state.cash = 100.00; // plenty of cash
    state.dayStats.revenue   = 20.00;
    state.dayStats.cogsTotal = 8.00;
    state.dayStats.unitsSold = 10;

    const report1 = endOfDay(state);
    // After day 1: cash = 100 - 5 = 95
    expect(report1.cashAfter).toBeCloseTo(95.00, 5);
    expect(state.cash).toBeCloseTo(95.00, 5);

    // Day 2: no revenue, fixed costs still apply
    const report2 = endOfDay(state);
    // After day 2: cash = 95 - 5 = 90
    expect(report2.cashAfter).toBeCloseTo(90.00, 5);
    expect(state.cash).toBeCloseTo(90.00, 5);
  });

  it("second endOfDay on zero-cash state leaves cash at 0 (floor holds)", () => {
    const state = createState(1);
    state.cash = 3.00; // less than DAILY_FIXED_COSTS ($5)
    // First endOfDay: cash = max(0, 3 - 5) = 0
    endOfDay(state);
    expect(state.cash).toBe(0);
    expect(state.rescueArcPending).toBe(true);

    // Second endOfDay: cash = max(0, 0 - 5) = 0 (still floored, not negative)
    endOfDay(state);
    expect(state.cash).toBe(0);
  });

  it("day number increments correctly across two consecutive endOfDay calls", () => {
    const state = createState(1);
    expect(state.dayNumber).toBe(1);
    endOfDay(state);
    expect(state.dayNumber).toBe(2);
    endOfDay(state);
    expect(state.dayNumber).toBe(3);
  });

  it("insightLine on second (zero-revenue) day prompts queue check", () => {
    const state = createState(1);
    state.dayStats.revenue   = 10.00;
    state.dayStats.cogsTotal = 6.00;
    state.dayStats.unitsSold = 5;
    endOfDay(state); // day 1 — has revenue

    // Day 2 — no revenue
    const report2 = endOfDay(state);
    expect(report2.insightLine).toMatch(/roast queue|roasted stock/i);
  });
});

// ---------------------------------------------------------------------------
// 8. NaN / non-finite input guards (F9)
// ---------------------------------------------------------------------------

describe("NaN / non-finite input guards", () => {
  it("tick() with NaN dt is a no-op", () => {
    const state = createState(1);
    state.roastedStockLbs = 100;
    const cashBefore = state.cash;
    const timeBefore = state.dayElapsedSeconds;
    const events = tick(state, NaN);
    expect(events).toHaveLength(0);
    expect(state.cash).toBe(cashBefore);
    expect(state.dayElapsedSeconds).toBe(timeBefore);
  });

  it("tick() with Infinity dt is a no-op", () => {
    const state = createState(1);
    state.roastedStockLbs = 100;
    const cashBefore = state.cash;
    const events = tick(state, Infinity);
    expect(events).toHaveLength(0);
    expect(state.cash).toBe(cashBefore);
  });

  it("buyRaw() with NaN lbs returns null without mutating state", () => {
    const state = createState(1);
    const cashBefore = state.cash;
    const rawBefore = state.rawStockLbs;
    const ev = buyRaw(state, NaN);
    expect(ev).toBeNull();
    expect(state.cash).toBe(cashBefore);
    expect(state.rawStockLbs).toBe(rawBefore);
  });

  it("setPrice() with NaN leaves price unchanged", () => {
    const state = createState(1);
    const prevPrice = state.sellPrice;
    setPrice(state, NaN);
    expect(state.sellPrice).toBe(prevPrice);
  });

  it("startRoast() with NaN lbs returns null without mutating state", () => {
    const state = createState(1);
    state.rawStockLbs = 20;
    const rawBefore = state.rawStockLbs;
    const cashBefore = state.cash;
    const ev = startRoast(state, 0, "classic_salted", NaN);
    expect(ev).toBeNull();
    expect(state.rawStockLbs).toBe(rawBefore);
    expect(state.cash).toBe(cashBefore);
  });
});

// ---------------------------------------------------------------------------
// 9. buyRaw rejects orders below minimum (F10)
// ---------------------------------------------------------------------------

describe("buyRaw — rejects orders below minimum", () => {
  it("order of exactly 1 lb (below RAW_ORDER_MIN_LBS) is rejected", () => {
    const state = createState(1);
    state.cash = STARTING_CASH;
    const rawBefore = state.rawStockLbs;
    const cashBefore = state.cash;
    const ev = buyRaw(state, 1); // RAW_ORDER_MIN_LBS = 10
    expect(ev).toBeNull();
    expect(state.rawStockLbs).toBe(rawBefore);
    expect(state.cash).toBe(cashBefore);
  });

  it("order of exactly RAW_ORDER_MIN_LBS - 1 is rejected", () => {
    const state = createState(1);
    state.cash = STARTING_CASH;
    const ev = buyRaw(state, RAW_ORDER_MIN_LBS - 1);
    expect(ev).toBeNull();
  });

  it("order of exactly RAW_ORDER_MIN_LBS is accepted", () => {
    const state = createState(1);
    state.cash = STARTING_CASH;
    const ev = buyRaw(state, RAW_ORDER_MIN_LBS);
    expect(ev).not.toBeNull();
  });
});
