/**
 * weather_demand.test.ts — weather WIRED into demand (GDD C3).
 *
 * The foundation (weatherForDay + constants + weatherSeed) shipped earlier and
 * was inert. This wave wires it into the live demand curve: rainy −20%,
 * hot-sunny +15%, applied alongside the weekday factor. These tests prove the
 * effect is real, correctly ordered, and that the previews reflect it.
 *
 * Pure node — no Phaser.
 */

import { describe, it, expect } from "vitest";
import { createState, tick, projectedDemand, weatherFactorFor } from "./engine.js";
import { weatherForDay, WEATHER_FACTOR, type Weather } from "../data/economy.js";

/** Find a seed whose day-1 weather is the target (search is deterministic). */
function seedForDay1(target: Weather): number {
  for (let s = 1; s < 100000; s++) if (weatherForDay(1, s) === target) return s;
  throw new Error(`no seed found for ${target}`);
}

describe("projectedDemand weather scaling", () => {
  it("scales the preview by the weather factor (rainy < clear < hot-sunny)", () => {
    const p = 1.50;
    const rainy = projectedDemand(p, "classic_salted", false, WEATHER_FACTOR.rainy);
    const clear = projectedDemand(p, "classic_salted", false, WEATHER_FACTOR.clear);
    const sunny = projectedDemand(p, "classic_salted", false, WEATHER_FACTOR.hot_sunny);
    expect(rainy).toBeLessThan(clear);
    expect(clear).toBeLessThan(sunny);
    // Exact: clear × factor.
    expect(rainy).toBeCloseTo(clear * WEATHER_FACTOR.rainy, 6);
    expect(sunny).toBeCloseTo(clear * WEATHER_FACTOR.hot_sunny, 6);
  });

  it("default (no weather arg) = clear, so callers that don't pass it are unaffected", () => {
    const p = 1.50;
    expect(projectedDemand(p)).toBeCloseTo(projectedDemand(p, "classic_salted", false, 1.0), 9);
  });
});

describe("weatherFactorFor(state)", () => {
  it("returns the multiplier for the state's current day + seed", () => {
    const s = createState(1);
    const expected = WEATHER_FACTOR[weatherForDay(s.dayNumber, s.weatherSeed)];
    expect(weatherFactorFor(s)).toBe(expected);
  });
});

describe("live demand is weather-affected (tick)", () => {
  it("rainy day sells fewer lbs than a hot-sunny day, all else equal", () => {
    // Two states identical EXCEPT weatherSeed (so the PRNG jitter stream matches
    // and only weather differs). Demand-bound: big stock, partial day.
    const rngSeed = 1;
    const rainy = createState(rngSeed);
    const sunny = createState(rngSeed);
    rainy.weatherSeed = seedForDay1("rainy");
    sunny.weatherSeed = seedForDay1("hot_sunny");
    for (const st of [rainy, sunny]) {
      st.roastedStockLbs = 1000;       // never runs out → demand-bound
      st.roastedCostBasisPerLb = 0.60;
      st.sellPrice = 1.50;
    }
    // Same rngState going in → same jitter sequence → only weather differs.
    expect(rainy.rngState).toBe(sunny.rngState);
    tick(rainy, 3_600); // one hour
    tick(sunny, 3_600);
    expect(rainy.dayStats.unitsSold).toBeGreaterThan(0);
    expect(rainy.dayStats.unitsSold).toBeLessThan(sunny.dayStats.unitsSold);
    // Ratio ≈ rainy/sunny factor (0.80 / 1.15), within jitter tolerance.
    const ratio = rainy.dayStats.unitsSold / sunny.dayStats.unitsSold;
    expect(ratio).toBeCloseTo(WEATHER_FACTOR.rainy / WEATHER_FACTOR.hot_sunny, 5);
  });

  it("clear day sits between rainy and hot-sunny", () => {
    const rngSeed = 3;
    const mk = (w: Weather) => {
      const s = createState(rngSeed);
      s.weatherSeed = seedForDay1(w);
      s.roastedStockLbs = 1000; s.roastedCostBasisPerLb = 0.60; s.sellPrice = 1.50;
      return s;
    };
    const rainy = mk("rainy"), clear = mk("clear"), sunny = mk("hot_sunny");
    tick(rainy, 3_600); tick(clear, 3_600); tick(sunny, 3_600);
    expect(rainy.dayStats.unitsSold).toBeLessThan(clear.dayStats.unitsSold);
    expect(clear.dayStats.unitsSold).toBeLessThan(sunny.dayStats.unitsSold);
  });

  it("a full day with limited stock still sells out regardless of weather (supply-bound)", () => {
    // The reason wiring didn't break existing tests: when demand > supply, the
    // day still clears all stock — weather changes velocity, not the total.
    const mk = (w: Weather) => {
      const s = createState(5);
      s.weatherSeed = seedForDay1(w);
      s.roastedStockLbs = 30; s.roastedCostBasisPerLb = 0.60; s.sellPrice = 1.50;
      return s;
    };
    const rainy = mk("rainy"), sunny = mk("hot_sunny");
    for (let h = 0; h < 14; h++) { tick(rainy, 3_600); tick(sunny, 3_600); }
    expect(rainy.roastedStockLbs).toBeCloseTo(0, 1);
    expect(sunny.roastedStockLbs).toBeCloseTo(0, 1);
  });
});
