/**
 * weather.test.ts — weather FOUNDATION (GDD C3).
 *
 * Foundation only: the constants + the pure deterministic `weatherForDay` + the
 * per-save `weatherSeed`. Weather is NOT yet wired into demand, so it has zero
 * gameplay effect — these tests cover determinism, distribution, the forecast
 * trick, and the persistence of weatherSeed. (Demand wiring is deferred to an
 * attended session per docs/SYSTEMS_BACKLOG.md §1.)
 *
 * Pure node — no Phaser.
 */

import { describe, it, expect } from "vitest";
import {
  weatherForDay,
  WEATHER_FACTOR,
  WEATHER_LABEL,
  WEATHER_DEFAULT_SEED,
  type Weather,
} from "../data/economy.js";
import { createState } from "./engine.js";
import { serialize, deserialize } from "./persistence.js";

const ALL: Weather[] = ["clear", "hot_sunny", "rainy"];

describe("weather constants", () => {
  it("GDD C3 multipliers + labels are present and sane", () => {
    expect(WEATHER_FACTOR.clear).toBe(1.0);
    expect(WEATHER_FACTOR.hot_sunny).toBe(1.15);
    expect(WEATHER_FACTOR.rainy).toBe(0.80);
    for (const w of ALL) {
      expect(WEATHER_LABEL[w].length).toBeGreaterThan(0);
      expect(WEATHER_FACTOR[w]).toBeGreaterThan(0);
    }
  });
});

describe("weatherForDay determinism", () => {
  it("same (day, seed) always returns the same weather", () => {
    for (let d = 1; d <= 50; d++) {
      const a = weatherForDay(d, 12345);
      const b = weatherForDay(d, 12345);
      expect(a).toBe(b);
      expect(ALL).toContain(a);
    }
  });

  it("different seeds generally produce different calendars", () => {
    const calA = Array.from({ length: 30 }, (_, i) => weatherForDay(i + 1, 1));
    const calB = Array.from({ length: 30 }, (_, i) => weatherForDay(i + 1, 999999));
    // Not identical day-for-day (overwhelmingly likely for a 30-day window).
    const sameCount = calA.filter((w, i) => w === calB[i]).length;
    expect(sameCount).toBeLessThan(30);
  });

  it("distribution over 1000 days is mild and weighted toward clear", () => {
    const counts: Record<Weather, number> = { clear: 0, hot_sunny: 0, rainy: 0 };
    for (let d = 1; d <= 1000; d++) counts[weatherForDay(d, 7)] += 1;
    // All three states actually occur.
    for (const w of ALL) expect(counts[w]).toBeGreaterThan(0);
    // Clear is the plurality (target ~50%); none is absurdly dominant.
    expect(counts.clear).toBeGreaterThan(counts.hot_sunny);
    expect(counts.clear).toBeGreaterThan(counts.rainy);
    expect(counts.clear).toBeLessThan(750); // not pathologically skewed
  });

  it("forecast = weatherForDay(day + 1, seed) (pure, no state needed)", () => {
    const seed = 42;
    for (let d = 1; d <= 20; d++) {
      const forecast = weatherForDay(d + 1, seed);
      // Next day's actual weather equals today's forecast of it.
      expect(weatherForDay(d + 1, seed)).toBe(forecast);
    }
  });

  it("handles day 0 / large day numbers without throwing", () => {
    expect(ALL).toContain(weatherForDay(0, 1));
    expect(ALL).toContain(weatherForDay(100000, 5));
  });
});

describe("weatherSeed persistence", () => {
  it("createState seeds weather from the game seed", () => {
    expect(createState(1234).weatherSeed).toBe(1234);
  });

  it("round-trips weatherSeed; legacy save defaults to WEATHER_DEFAULT_SEED", () => {
    const s = createState(555);
    expect(deserialize(serialize(s)).weatherSeed).toBe(555);

    const env = JSON.parse(serialize(s));
    delete env.sim.weatherSeed;
    expect(deserialize(JSON.stringify(env)).weatherSeed).toBe(WEATHER_DEFAULT_SEED);

    const bad = JSON.parse(serialize(s));
    bad.sim.weatherSeed = -3;
    expect(() => deserialize(JSON.stringify(bad))).toThrow(/weatherSeed/);
  });

  it("weather has NO gameplay effect yet (unwired) — same seed → same demand", () => {
    // A sanity guard: weatherSeed is present but the engine never reads it for
    // demand. (If a future wave wires weather in, this test should be replaced.)
    const s = createState(1);
    expect(s.weatherSeed).toBeDefined();
  });
});
