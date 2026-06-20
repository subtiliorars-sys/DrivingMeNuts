/**
 * weather_demand.test.ts — weather demand scaling.
 */

import { describe, it, expect } from "vitest";
import { createState, tick } from "./engine.js";

describe("live demand is weather-affected", () => {
  it("smoke check for weather effect", () => {
    const s = createState(1);
    s.roastedStockLbs = 1000;
    s.roastedCostBasisPerLb = 0.42;
    s.sellPrice = 1.50;
    tick(s, 3600);
    expect(s.dayStats.unitsSold).toBeGreaterThan(0);
  });
});
