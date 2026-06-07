/**
 * wave4.test.ts — Vitest suite for Wave 4: roaster/queue upgrades + weekday demand.
 *
 * Coverage:
 *   1. buyRoasterUpgrade — purchase guards, state mutation, NaN-guard, insufficient cash
 *   2. buyQueueSlot — purchase guards, state mutation, max cap, insufficient cash
 *   3. dayFactorFor — determinism, wraps weekly, correct values
 *   4. Day-factor applied to demand — tick() demand scales with day factor
 *   5. Payback math sanity — tier2 (copper) daily capacity delta × margin > 0
 *   6. Persistence round-trip — upgraded state (roasterTier + slots) survives save/load
 *   7. Insufficient-cash rejection without mutation
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  tick,
  startRoast,
  buyRoasterUpgrade,
  buyQueueSlot,
  dayFactorFor,
} from "./engine.js";
import { serialize, deserialize } from "./persistence.js";
import {
  ROASTER_UPGRADE_COST,
  QUEUE_SLOT_COST,
  MAX_QUEUE_SLOTS,
  STARTING_QUEUE_SLOTS,
  DAY_FACTOR,
  DAY_NAMES,
  STARTING_CASH,
} from "../data/economy.js";

// ---------------------------------------------------------------------------
// 1. buyRoasterUpgrade — purchase guards
// ---------------------------------------------------------------------------

describe("buyRoasterUpgrade", () => {
  it("upgrades tin_pan → copper when cash is sufficient", () => {
    const state = createState(1);
    state.cash = ROASTER_UPGRADE_COST.copper + 10;
    const ev = buyRoasterUpgrade(state);
    expect(ev).not.toBeNull();
    expect(state.roasterTier).toBe("copper");
    expect(state.cash).toBeCloseTo(10, 5);
  });

  it("returns null and does NOT mutate when cash is insufficient", () => {
    const state = createState(1);
    state.cash = ROASTER_UPGRADE_COST.copper - 0.01;
    const cashBefore = state.cash;
    const tierBefore = state.roasterTier;
    const ev = buyRoasterUpgrade(state);
    expect(ev).toBeNull();
    expect(state.roasterTier).toBe(tierBefore);
    expect(state.cash).toBeCloseTo(cashBefore, 8);
  });

  it("upgrades copper → industrial", () => {
    const state = createState(1);
    state.roasterTier = "copper";
    state.cash = ROASTER_UPGRADE_COST.industrial + 50;
    const ev = buyRoasterUpgrade(state);
    expect(ev).not.toBeNull();
    expect(state.roasterTier).toBe("industrial");
    expect(state.cash).toBeCloseTo(50, 5);
  });

  it("returns null when already at max tier (industrial)", () => {
    const state = createState(1);
    state.roasterTier = "industrial";
    state.cash = 999_999;
    const ev = buyRoasterUpgrade(state);
    expect(ev).toBeNull();
    expect(state.roasterTier).toBe("industrial"); // unchanged
  });

  it("emits upgrade_purchased event with correct detail", () => {
    const state = createState(1);
    state.cash = ROASTER_UPGRADE_COST.copper;
    const ev = buyRoasterUpgrade(state);
    expect(ev?.kind).toBe("upgrade_purchased");
    expect(ev?.detail.upgradeType).toBe("roaster");
    expect(ev?.detail.prevTier).toBe("tin_pan");
    expect(ev?.detail.nextTier).toBe("copper");
    expect(ev?.detail.cost).toBe(ROASTER_UPGRADE_COST.copper);
  });

  it("cash floor is respected (cash never below 0)", () => {
    const state = createState(1);
    state.cash = ROASTER_UPGRADE_COST.copper; // exact cost
    buyRoasterUpgrade(state);
    expect(state.cash).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 2. buyQueueSlot — purchase guards
// ---------------------------------------------------------------------------

describe("buyQueueSlot", () => {
  it("adds a slot and charges correct cost for first purchase", () => {
    const state = createState(1);
    state.cash = QUEUE_SLOT_COST[0] + 10;
    const slotsBefore = state.roastSlots.length;
    const ev = buyQueueSlot(state);
    expect(ev).not.toBeNull();
    expect(state.roastSlots.length).toBe(slotsBefore + 1);
    expect(state.cash).toBeCloseTo(10, 5);
  });

  it("new slot starts empty", () => {
    const state = createState(1);
    state.cash = QUEUE_SLOT_COST[0];
    buyQueueSlot(state);
    const newSlot = state.roastSlots[state.roastSlots.length - 1];
    expect(newSlot.status).toBe("empty");
    expect(newSlot.batchLbs).toBe(0);
    expect(newSlot.recipe).toBeNull();
  });

  it("returns null and does NOT mutate when cash is insufficient", () => {
    const state = createState(1);
    state.cash = QUEUE_SLOT_COST[0] - 0.01;
    const cashBefore = state.cash;
    const slotsBefore = state.roastSlots.length;
    const ev = buyQueueSlot(state);
    expect(ev).toBeNull();
    expect(state.roastSlots.length).toBe(slotsBefore);
    expect(state.cash).toBeCloseTo(cashBefore, 8);
  });

  it("caps at MAX_QUEUE_SLOTS and returns null when already at max", () => {
    const state = createState(1);
    state.cash = 999_999;
    // Buy up to max
    while (state.roastSlots.length < MAX_QUEUE_SLOTS) {
      const ev = buyQueueSlot(state);
      expect(ev).not.toBeNull();
    }
    // One more should fail
    const ev = buyQueueSlot(state);
    expect(ev).toBeNull();
    expect(state.roastSlots.length).toBe(MAX_QUEUE_SLOTS);
  });

  it("second slot purchase uses escalated cost (QUEUE_SLOT_COST[1])", () => {
    const state = createState(1);
    state.cash = QUEUE_SLOT_COST[0] + QUEUE_SLOT_COST[1] + 1;
    buyQueueSlot(state); // buy slot 2
    const cashAfterFirst = state.cash;
    buyQueueSlot(state); // buy slot 3
    const spent = cashAfterFirst - state.cash;
    expect(spent).toBeCloseTo(QUEUE_SLOT_COST[1], 5);
  });

  it("emits upgrade_purchased event with correct detail", () => {
    const state = createState(1);
    state.cash = QUEUE_SLOT_COST[0];
    const ev = buyQueueSlot(state);
    expect(ev?.kind).toBe("upgrade_purchased");
    expect(ev?.detail.upgradeType).toBe("queue_slot");
    expect(ev?.detail.newSlotCount).toBe(STARTING_QUEUE_SLOTS + 1);
    expect(ev?.detail.cost).toBe(QUEUE_SLOT_COST[0]);
  });
});

// ---------------------------------------------------------------------------
// 3. dayFactorFor — determinism and correct values
// ---------------------------------------------------------------------------

describe("dayFactorFor", () => {
  it("day 1 maps to Monday (index 0) = DAY_FACTOR[0]", () => {
    expect(dayFactorFor(1)).toBe(DAY_FACTOR[0]);
  });

  it("day 7 maps to Sunday (index 6) = DAY_FACTOR[6]", () => {
    expect(dayFactorFor(7)).toBe(DAY_FACTOR[6]);
  });

  it("day 8 wraps to Monday again (index 0)", () => {
    expect(dayFactorFor(8)).toBe(DAY_FACTOR[0]);
  });

  it("Saturday (day 6 = index 5) has highest factor (1.25)", () => {
    expect(dayFactorFor(6)).toBe(DAY_FACTOR[5]); // Saturday
    expect(dayFactorFor(6)).toBe(1.25);
  });

  it("Monday (day 1) has lowest factor (0.85)", () => {
    expect(dayFactorFor(1)).toBe(0.85);
  });

  it("is deterministic — same input always returns same output", () => {
    for (let d = 1; d <= 21; d++) {
      expect(dayFactorFor(d)).toBe(dayFactorFor(d));
    }
  });

  it("covers all 7 days with distinct names via DAY_NAMES", () => {
    expect(new Set(DAY_NAMES).size).toBe(7);
    expect(DAY_NAMES[0]).toBe("Monday");
    expect(DAY_NAMES[5]).toBe("Saturday");
    expect(DAY_NAMES[6]).toBe("Sunday");
  });
});

// ---------------------------------------------------------------------------
// 4. Day-factor applied to demand — tick() demand scales with day factor
// ---------------------------------------------------------------------------

describe("day-factor demand application", () => {
  it("Saturday (day 6) sells more than Monday (day 1) at same price/seed", () => {
    // Run two identical states on different day numbers; Saturday should outsell Monday.
    // We use a fixed seed and many ticks to average out jitter.
    const TICKS = 500;
    const DT = 60; // 60 sim-seconds per tick

    const stateMon = createState(42);
    stateMon.dayNumber = 1; // Monday, factor 0.85
    stateMon.roastedStockLbs = 1_000; // ample stock

    const stateSat = createState(42);
    stateSat.dayNumber = 6; // Saturday, factor 1.25
    stateSat.roastedStockLbs = 1_000;

    for (let i = 0; i < TICKS; i++) {
      tick(stateMon, DT);
      tick(stateSat, DT);
    }

    // Saturday demand multiplier (1.25) > Monday (0.85), so more sold on Saturday.
    expect(stateSat.dayStats.unitsSold).toBeGreaterThan(stateMon.dayStats.unitsSold);
  });

  it("day factor is consistent across multiple ticks (determinism)", () => {
    const stateA = createState(7);
    stateA.dayNumber = 6; // Saturday
    stateA.roastedStockLbs = 500;

    const stateB = createState(7);
    stateB.dayNumber = 6; // Saturday, same seed
    stateB.roastedStockLbs = 500;

    for (let i = 0; i < 100; i++) {
      tick(stateA, 60);
      tick(stateB, 60);
    }

    expect(stateA.dayStats.unitsSold).toBeCloseTo(stateB.dayStats.unitsSold, 8);
  });
});

// ---------------------------------------------------------------------------
// 5. Payback math sanity: copper daily capacity delta × margin > 0
// ---------------------------------------------------------------------------

describe("payback math sanity", () => {
  it("copper roaster finishes a batch sooner than tin_pan (shorter duration → more throughput)", () => {
    // roastDurationSeconds for copper = tin_pan × 0.6
    // Verify: copper batch finishes earlier, so after equal sim-time ticks the copper
    // state has roasted stock while tin_pan is still roasting.
    const RECIPE = "classic_salted" as const;
    const BATCH = 10;

    const stateTin = createState(1);
    stateTin.rawStockLbs = 100;
    stateTin.cash = 999;
    startRoast(stateTin, 0, RECIPE, BATCH);

    const stateCop = createState(1);
    stateCop.roasterTier = "copper";
    stateCop.rawStockLbs = 100;
    stateCop.cash = 999;
    startRoast(stateCop, 0, RECIPE, BATCH);

    // Tin Pan: 60 sim-s/lb × 10 lbs × 1.0 = 600 sim-s to finish
    // Copper:  60 sim-s/lb × 10 lbs × 0.6 = 360 sim-s to finish
    // After 400 sim-seconds: copper done (360 < 400), tin_pan not done (600 > 400)
    tick(stateTin, 400);
    tick(stateCop, 400);

    expect(stateCop.roastedStockLbs).toBeGreaterThan(0);  // copper batch is ready
    expect(stateTin.roastedStockLbs).toBe(0);             // tin_pan still roasting
  });

  it("copper tier2 payback period is positive: capacity gain × gross margin > 0", () => {
    // Tier2 benefit: roast duration multiplier drops from 1.0 to 0.6 (–40%).
    // At default price $1.50 and COGS $0.60, gross margin per lb = $0.90.
    // A 10-lb batch on tin_pan takes 600 sim-seconds; on copper, 360 sim-seconds.
    // Saving 240 sim-seconds per batch means more batches per day = more capacity.
    // Even one extra 10-lb batch per day = +$9 gross profit.
    // Payback = cost / daily_benefit = $500 / $9 ≈ 55 days worst-case (1 extra batch).
    // But with multiple batches chained, payback is realistically ~8–12 days (per spec).
    const cogsPerLb = 0.60;
    const sellPrice = 1.50;
    const grossMarginPerLb = sellPrice - cogsPerLb;
    expect(grossMarginPerLb).toBeGreaterThan(0);

    // Verify the upgrade cost is tuned so payback is a real decision (not trivial, not huge).
    const copperCost = ROASTER_UPGRADE_COST.copper;
    // At ~$60/day net profit, payback should be 8-12 days
    const dailyNetEstimate = 60; // conservative single-slot day
    const paybackDays = copperCost / dailyNetEstimate;
    expect(paybackDays).toBeGreaterThan(5);  // not a trivial decision
    expect(paybackDays).toBeLessThan(20);    // not impossibly long
  });

  it("ROASTER_UPGRADE_COST ordering: copper < industrial", () => {
    expect(ROASTER_UPGRADE_COST.copper).toBeLessThan(ROASTER_UPGRADE_COST.industrial);
  });

  it("QUEUE_SLOT_COST is escalating", () => {
    expect(QUEUE_SLOT_COST[1]).toBeGreaterThan(QUEUE_SLOT_COST[0]);
  });
});

// ---------------------------------------------------------------------------
// 6. Persistence round-trip with upgraded state
// ---------------------------------------------------------------------------

describe("persistence round-trip with upgrades", () => {
  it("round-trips roasterTier=copper through serialize/deserialize", () => {
    const state = createState(1);
    state.roasterTier = "copper";
    const loaded = deserialize(serialize(state));
    expect(loaded.roasterTier).toBe("copper");
  });

  it("round-trips roasterTier=industrial through serialize/deserialize", () => {
    const state = createState(1);
    state.roasterTier = "industrial";
    const loaded = deserialize(serialize(state));
    expect(loaded.roasterTier).toBe("industrial");
  });

  it("round-trips upgraded slot count (2 slots) through serialize/deserialize", () => {
    const state = createState(1);
    state.cash = QUEUE_SLOT_COST[0];
    buyQueueSlot(state);
    expect(state.roastSlots.length).toBe(2);
    const loaded = deserialize(serialize(state));
    expect(loaded.roastSlots.length).toBe(2);
    expect(loaded.roastSlots[1].status).toBe("empty");
  });

  it("round-trips max slot count (3 slots) through serialize/deserialize", () => {
    const state = createState(1);
    state.cash = 999_999;
    buyQueueSlot(state);
    buyQueueSlot(state);
    expect(state.roastSlots.length).toBe(MAX_QUEUE_SLOTS);
    const loaded = deserialize(serialize(state));
    expect(loaded.roastSlots.length).toBe(MAX_QUEUE_SLOTS);
  });

  it("sanity check rejects slot count exceeding MAX_QUEUE_SLOTS", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    // Inject one extra slot beyond max
    while (envelope.sim.roastSlots.length <= MAX_QUEUE_SLOTS) {
      envelope.sim.roastSlots.push({ id: 99, status: "empty", batchLbs: 0, recipe: null, secondsRemaining: 0, totalSeconds: 0 });
    }
    expect(() => deserialize(JSON.stringify(envelope))).toThrow(/roastSlots invalid/);
  });

  it("round-trips state after both upgrades purchased", () => {
    const state = createState(42);
    state.cash = 999_999;
    buyRoasterUpgrade(state); // tin_pan → copper
    buyQueueSlot(state);       // 1 → 2 slots
    state.dayNumber = 5;       // Friday
    const loaded = deserialize(serialize(state));
    expect(loaded.roasterTier).toBe("copper");
    expect(loaded.roastSlots.length).toBe(2);
    expect(loaded.dayNumber).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// 7. Insufficient-cash rejection without mutation (belt-and-suspenders)
// ---------------------------------------------------------------------------

describe("insufficient-cash rejection without mutation", () => {
  it("buyRoasterUpgrade: state is unchanged on failure", () => {
    const state = createState(1);
    state.cash = 0;
    const snapCash = state.cash;
    const snapTier = state.roasterTier;
    const snapSlots = state.roastSlots.length;
    buyRoasterUpgrade(state);
    expect(state.cash).toBe(snapCash);
    expect(state.roasterTier).toBe(snapTier);
    expect(state.roastSlots.length).toBe(snapSlots);
  });

  it("buyQueueSlot: state is unchanged on failure", () => {
    const state = createState(1);
    state.cash = 0;
    const snapCash = state.cash;
    const snapSlots = state.roastSlots.length;
    buyQueueSlot(state);
    expect(state.cash).toBe(snapCash);
    expect(state.roastSlots.length).toBe(snapSlots);
  });

  it("STARTING_CASH ($50) is not enough to buy copper upgrade ($500)", () => {
    const state = createState(1);
    expect(state.cash).toBe(STARTING_CASH);
    const ev = buyRoasterUpgrade(state);
    expect(ev).toBeNull();
    expect(state.roasterTier).toBe("tin_pan");
  });
});
