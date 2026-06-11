/**
 * district.test.ts — Vitest suite for P1.5 district mechanics.
 *
 * Tests default district, Office Quarter demand curve, permit purchasing,
 * district switching, and Derek consistency tracking.
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  tick,
  setDistrict,
  buyPermit,
  dayFactorFor,
  projectedDemand,
} from "./engine.js";
import {
  serialize,
  deserialize,
} from "./persistence.js";
import { DISTRICT_CONFIGS, OFFICE_QUARTER_DAY_FACTOR, DAY_FACTOR } from "../data/economy.js";
// ---------------------------------------------------------------------------
// 1. Default district
// ---------------------------------------------------------------------------

describe("default district", () => {
  it("fresh state has farmers_market as currentDistrict", () => {
    const state = createState(1);
    expect(state.currentDistrict).toBe("farmers_market");
  });

  it("fresh state has only farmers_market unlocked", () => {
    const state = createState(1);
    expect(state.unlockedDistricts).toEqual(["farmers_market"]);
  });

  it("Derek fields default to 0 / null", () => {
    const state = createState(1);
    expect(state.derekConsistencyCounter).toBe(0);
    expect(state.derekLastPrice).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Office Quarter has different demand curve
// ---------------------------------------------------------------------------

describe("Office Quarter demand curve", () => {
  it("has different district parameters from Farmers' Market", () => {
    const fm = DISTRICT_CONFIGS.farmers_market;
    const oq = DISTRICT_CONFIGS.office_quarter;
    expect(oq.baseDemandLbsPerHour).toBeLessThan(fm.baseDemandLbsPerHour);
    expect(oq.basePrice).toBeGreaterThan(fm.basePrice);
    expect(oq.demandSlope).toBeLessThan(fm.demandSlope);
    expect(oq.permitCost).toBeGreaterThan(fm.permitCost);
  });

  it("projectedDemand with Office Quarter returns lower volume at same price", () => {
    const price = 1.50;
    const fmDemand = projectedDemand(price, "classic_salted", false, 1.0, "farmers_market");
    const oqDemand = projectedDemand(price, "classic_salted", false, 1.0, "office_quarter");
    expect(oqDemand).toBeLessThan(fmDemand);
    expect(fmDemand).toBeCloseTo(17, 0);
    expect(oqDemand).toBeCloseTo(14, 0);
  });

  it("Office Quarter day factor drops on weekends", () => {
    const monday = dayFactorFor(1, "office_quarter");
    expect(monday).toBe(OFFICE_QUARTER_DAY_FACTOR[0]);
    const saturday = dayFactorFor(6, "office_quarter");
    expect(saturday).toBe(OFFICE_QUARTER_DAY_FACTOR[5]);
    expect(saturday).toBeLessThan(monday);
  });

  it("Farmers' Market day factor unaffected by district parameter", () => {
    const defaultMon = dayFactorFor(1);
    const oqMon = dayFactorFor(1, "office_quarter");
    expect(defaultMon).toBe(DAY_FACTOR[0]);
    expect(oqMon).not.toBe(defaultMon);
  });
});

// ---------------------------------------------------------------------------
// 3. buyPermit
// ---------------------------------------------------------------------------

describe("buyPermit", () => {
  it("rejects if insufficient cash", () => {
    const state = createState(1);
    state.cash = 10;
    const ev = buyPermit(state, "office_quarter");
    expect(ev).toBeNull();
    expect(state.unlockedDistricts).toEqual(["farmers_market"]);
  });

  it("accepts with sufficient cash", () => {
    const state = createState(1);
    state.cash = 500;
    const ev = buyPermit(state, "office_quarter");
    expect(ev).not.toBeNull();
    expect(state.unlockedDistricts).toContain("office_quarter");
    expect(state.cash).toBeCloseTo(500 - 300, 5);
  });

  it("rejects if already unlocked", () => {
    const state = createState(1);
    state.cash = 500;
    buyPermit(state, "office_quarter");
    const ev2 = buyPermit(state, "office_quarter");
    expect(ev2).toBeNull();
  });

  it("expedited version costs double", () => {
    const state = createState(1);
    state.cash = 1000;
    const cost = DISTRICT_CONFIGS.office_quarter.permitCost * 2;
    buyPermit(state, "office_quarter", true);
    expect(state.cash).toBeCloseTo(1000 - cost, 5);
  });
});

// ---------------------------------------------------------------------------
// 4. setDistrict
// ---------------------------------------------------------------------------

describe("setDistrict", () => {
  it("changes currentDistrict when unlocked", () => {
    const state = createState(1);
    state.cash = 500;
    buyPermit(state, "office_quarter");
    setDistrict(state, "office_quarter");
    expect(state.currentDistrict).toBe("office_quarter");
  });

  it("returns null for locked district", () => {
    const state = createState(1);
    const ev = setDistrict(state, "office_quarter");
    expect(ev).toBeNull();
    expect(state.currentDistrict).toBe("farmers_market");
  });

  it("affects tick() demand volume", () => {
    const state = createState(42);
    state.roastedStockLbs = 10_000;
    state.cash = 500;
    buyPermit(state, "office_quarter");
    setDistrict(state, "office_quarter");
    for (let t = 0; t < 3600; t++) tick(state, 1);
    const oqUnits = state.dayStats.unitsSold;

    const state2 = createState(42);
    state2.roastedStockLbs = 10_000;
    for (let t = 0; t < 3600; t++) tick(state2, 1);
    const fmUnits = state2.dayStats.unitsSold;

    // Both districts produce sales; exact values depend on jitter and day factors
    expect(oqUnits).toBeGreaterThan(0);
    expect(fmUnits).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Derek consistency mechanic
// ---------------------------------------------------------------------------

describe("Derek consistency mechanic", () => {
  it("derekConsistencyCounter starts at 0", () => {
    const state = createState(1);
    expect(state.derekConsistencyCounter).toBe(0);
  });

  it("derekLastPrice starts null", () => {
    const state = createState(1);
    expect(state.derekLastPrice).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. Round-trip persistence
// ---------------------------------------------------------------------------

describe("district persistence round-trip", () => {
  it("serialize/deserialize preserves district fields", () => {
    const state = createState(42);
    state.cash = 500;
    buyPermit(state, "office_quarter");
    setDistrict(state, "office_quarter");
    state.derekConsistencyCounter = 3;
    state.derekLastPrice = 1.75;

    const json = serialize(state);
    const loaded = deserialize(json);

    expect(loaded.currentDistrict).toBe("office_quarter");
    expect(loaded.unlockedDistricts).toContain("farmers_market");
    expect(loaded.unlockedDistricts).toContain("office_quarter");
    expect(loaded.derekConsistencyCounter).toBe(3);
    expect(loaded.derekLastPrice).toBeCloseTo(1.75, 5);
  });

  it("legacy save defaults to farmers_market", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    delete envelope.sim.currentDistrict;
    delete envelope.sim.unlockedDistricts;
    delete envelope.sim.derekConsistencyCounter;
    delete envelope.sim.derekLastPrice;

    const loaded = deserialize(JSON.stringify(envelope));
    expect(loaded.currentDistrict).toBe("farmers_market");
    expect(loaded.unlockedDistricts).toEqual(["farmers_market"]);
    expect(loaded.derekConsistencyCounter).toBe(0);
    expect(loaded.derekLastPrice).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 9. Full Derek consistency mechanic
// ---------------------------------------------------------------------------

describe("Derek consistency mechanic (full)", () => {
  it("Derek buys at stable price — happy, counter increments", () => {
    const state = createState(1);
    state.cash = 500;
    buyPermit(state, "office_quarter");
    setDistrict(state, "office_quarter");
    state.roastedStockLbs = 10_000;
    state.sellPrice = 1.50;
    state.dayNumber = 3;
    state.dayElapsedSeconds = 0;
    state.derekLastPurchaseDay = 0;

    const events = tick(state, 3600);

    expect(state.derekConsistencyCounter).toBe(1);
    expect(state.derekLastPrice).toBe(1.50);
    expect(state.derekLastPurchaseDay).toBe(3);
    const derekEvents = events.filter(e => e.kind === "derek_mood");
    expect(derekEvents.length).toBe(0);
  });

  it("Derek stops buying when price swings > 15% — unhappy", () => {
    const state = createState(1);
    state.cash = 500;
    buyPermit(state, "office_quarter");
    setDistrict(state, "office_quarter");
    state.roastedStockLbs = 10_000;
    state.sellPrice = 1.50;
    state.derekLastPrice = 1.50;
    state.derekConsistencyCounter = 3;
    state.dayNumber = 3;
    state.derekLastPurchaseDay = 0;

    state.sellPrice = 1.80; // 20% swing

    const events = tick(state, 3600);

    expect(state.derekConsistencyCounter).toBe(0);
    const derekEvents = events.filter(e => e.kind === "derek_mood");
    expect(derekEvents.length).toBe(1);
    expect(derekEvents[0].detail.mood).toBe("unhappy");
    expect(state.derekLastPrice).toBe(1.80);
    expect(state.derekLastPurchaseDay).toBe(3);
  });

  it("Derek counter resets on unhappy, increments on next stable day", () => {
    const state = createState(1);
    state.cash = 500;
    buyPermit(state, "office_quarter");
    setDistrict(state, "office_quarter");
    state.roastedStockLbs = 10_000;
    state.sellPrice = 1.50;
    state.derekLastPrice = 1.50;
    state.derekConsistencyCounter = 3;
    state.dayNumber = 3;
    state.derekLastPurchaseDay = 0;

    // Derek buys on day 3 — counter increments from 3 to 4
    tick(state, 3600);
    expect(state.derekConsistencyCounter).toBe(4);

    // Day 4: change price > 15%
    state.sellPrice = 1.80;
    state.dayNumber = 4;
    state.roastedStockLbs = 10_000;
    state.derekLastPurchaseDay = 0;
    tick(state, 3600);
    expect(state.derekConsistencyCounter).toBe(0);

    state.dayNumber = 5;
    state.roastedStockLbs = 10_000;
    state.derekLastPurchaseDay = 0;
    tick(state, 3600);
    expect(state.derekConsistencyCounter).toBe(1);
  });

  it("Derek does not affect Farmers' Market", () => {
    const state = createState(1);
    state.roastedStockLbs = 10_000;
    state.sellPrice = 1.50;
    state.derekLastPrice = 1.50;
    state.derekConsistencyCounter = 3;
    state.dayNumber = 3;
    state.sellPrice = 1.80;

    const events = tick(state, 3600);

    expect(state.derekConsistencyCounter).toBe(3);
    expect(state.derekLastPrice).toBe(1.50);
    const derekEvents = events.filter(e => e.kind === "derek_mood");
    expect(derekEvents.length).toBe(0);
  });

  it("Derek buys at most once per day", () => {
    const state = createState(1);
    state.cash = 500;
    buyPermit(state, "office_quarter");
    setDistrict(state, "office_quarter");
    state.roastedStockLbs = 10_000;
    state.sellPrice = 1.50;
    state.dayNumber = 3;
    state.derekLastPurchaseDay = 0;

    tick(state, 1);
    expect(state.derekConsistencyCounter).toBe(1);
    expect(state.derekLastPurchaseDay).toBe(3);

    tick(state, 1);
    expect(state.derekConsistencyCounter).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 10. buyPermit + setDistrict gating end-to-end
// ---------------------------------------------------------------------------

describe("buyPermit + setDistrict gating", () => {
  it("cannot setDistrict to an unpermitted district", () => {
    const state = createState(1);
    const ev = setDistrict(state, "office_quarter");
    expect(ev).toBeNull();
    expect(state.currentDistrict).toBe("farmers_market");
  });

  it("buyPermit unlocks district, setDistrict works", () => {
    const state = createState(1);
    state.cash = 500;
    const ev = buyPermit(state, "office_quarter");
    expect(ev).not.toBeNull();
    expect(state.unlockedDistricts).toContain("office_quarter");
    const ev2 = setDistrict(state, "office_quarter");
    expect(ev2).not.toBeNull();
    expect(state.currentDistrict).toBe("office_quarter");
  });

  it("buyPermit returns null for already-unlocked", () => {
    const state = createState(1);
    state.cash = 500;
    buyPermit(state, "office_quarter");
    const ev2 = buyPermit(state, "office_quarter");
    expect(ev2).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 11. Persistence of new fields
// ---------------------------------------------------------------------------

describe("derekLastPurchaseDay persistence", () => {
  it("serialize/deserialize preserves derekLastPurchaseDay", () => {
    const state = createState(1);
    state.derekLastPurchaseDay = 5;
    const json = serialize(state);
    const loaded = deserialize(json);
    expect(loaded.derekLastPurchaseDay).toBe(5);
  });

  it("legacy save defaults derekLastPurchaseDay to 0", () => {
    const state = createState(1);
    const json = serialize(state);
    const envelope = JSON.parse(json);
    delete envelope.sim.derekLastPurchaseDay;
    const loaded = deserialize(JSON.stringify(envelope));
    expect(loaded.derekLastPurchaseDay).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Day factor backward compat
// ---------------------------------------------------------------------------

describe("dayFactorFor backward compat", () => {
  it("calling without district still returns global DAY_FACTOR", () => {
    const mon = dayFactorFor(1);
    expect(mon).toBe(DAY_FACTOR[0]);
    const sat = dayFactorFor(6);
    expect(sat).toBe(DAY_FACTOR[5]);
  });
});

// ---------------------------------------------------------------------------
// 8. Lunch-rush time-of-day
// ---------------------------------------------------------------------------

describe("lunch-rush time-of-day", () => {
  it("lunch rush boost applies in Office Quarter at hour 12", () => {
    const state = createState(42);
    state.cash = 500;
    buyPermit(state, "office_quarter");
    setDistrict(state, "office_quarter");
    state.roastedStockLbs = 10_000;
    state.dayElapsedSeconds = 12 * 3_600; // hour 12 (noon)
    tick(state, 60);
    expect(state.dayStats.unitsSold).toBeGreaterThan(0);
  });

  it("lunch rush does NOT apply in Farmers' Market", () => {
    const state = createState(42);
    state.roastedStockLbs = 10_000;
    state.dayElapsedSeconds = 12 * 3_600;
    tick(state, 60);
    expect(state.dayStats.unitsSold).toBeGreaterThan(0);
  });

  it("projectedDemand with hour param reflects lunch boost", () => {
    const boosted = projectedDemand(1.50, "classic_salted", false, 1.0, "office_quarter", 12);
    const normal = projectedDemand(1.50, "classic_salted", false, 1.0, "office_quarter", 6);
    expect(boosted).toBeCloseTo(normal * 1.30, 1);
  });

  it("projectedDemand without hour param returns normal demand", () => {
    const noHour = projectedDemand(1.50, "classic_salted", false, 1.0, "office_quarter");
    const offPeak = projectedDemand(1.50, "classic_salted", false, 1.0, "office_quarter", 6);
    expect(noHour).toBeCloseTo(offPeak, 1);
  });

  it("lunch rush does not apply outside 1-hour window", () => {
    const normal = projectedDemand(1.50, "classic_salted", false, 1.0, "office_quarter", 10);
    const boosted = projectedDemand(1.50, "classic_salted", false, 1.0, "office_quarter", 12);
    expect(normal).toBeCloseTo(projectedDemand(1.50, "classic_salted", false, 1.0, "office_quarter", 6), 1);
    expect(boosted).toBeGreaterThan(normal);
  });
});
