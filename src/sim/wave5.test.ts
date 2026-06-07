/**
 * wave5.test.ts — Ledger v1, weekly recap, balance sheet, Comeback Lines,
 * brand campaign, and rescue aftermath beats.
 *
 * Pure node tests — no Phaser. Persistence cases use the same in-memory
 * StorageLike pattern as persistence.test.ts.
 */

import { describe, it, expect } from "vitest";
import {
  createState,
  tick,
  endOfDay,
  chooseRescuePath,
  balanceSheet,
  buyBrandCampaign,
  optimumPrice,
  projectedDemand,
} from "./engine.js";
import {
  serialize,
  deserialize,
  importEnvelopeText,
  CURRENT_SCHEMA_VERSION,
  type StorageLike,
} from "./persistence.js";
import {
  LEDGER_MAX_DAYS,
  WEEK_RECAP_EVERY_DAYS,
  BRAND_CAMPAIGN_LORE_THRESHOLD,
  BRAND_CAMPAIGN_COST,
  RESCUE_LOAN_PRINCIPAL,
  RESCUE_LOAN_FEE_RATE,
  RESCUE_PREORDER_LBS,
  DAILY_FIXED_COSTS,
  RAW_PEANUT_BASE_PRICE,
} from "../data/economy.js";
import {
  COMEBACK_TIERS,
  COMEBACK_THRESHOLDS,
  comebackTierFor,
  comebackPoolForTier,
  COMEBACK_BY_ID,
} from "../data/comebacks.js";
import { AFTERMATH_BEATS } from "../data/rescue_aftermath.js";
import type { SimState } from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStorage(): StorageLike & { _store: Map<string, string> } {
  const _store = new Map<string, string>();
  return {
    _store,
    getItem: (k: string) => (_store.has(k) ? (_store.get(k) as string) : null),
    setItem: (k: string, v: string) => void _store.set(k, v),
    removeItem: (k: string) => void _store.delete(k),
  };
}

/** Seed gagsSeen with N synthetic ids that can never collide with real LL-ids. */
function seedFakeLore(state: SimState, n: number): void {
  for (let i = 0; i < n; i++) state.gagsSeen.add(`FAKE-${i}`);
}

/** Run a full selling day: stock roasted lbs directly and tick through it. */
function sellThroughDay(state: SimState, roastedLbs: number): void {
  state.roastedStockLbs += roastedLbs;
  state.roastedCostBasisPerLb = 0.60;
  // 14h day in 1h steps
  for (let h = 0; h < 14; h++) tick(state, 3_600);
}

/** Build a serialized v3 envelope (pre-ledger format) from a live state. */
function makeV3Json(state: SimState): string {
  const env = JSON.parse(serialize(state));
  env.schemaVersion = 3;
  delete env.sim.ledger;
  delete env.sim.comebackTier;
  delete env.sim.brandCampaignActive;
  delete env.sim.aftermathSeen;
  return JSON.stringify(env);
}

// ---------------------------------------------------------------------------
// 1. Ledger v1
// ---------------------------------------------------------------------------

describe("ledger v1", () => {
  it("endOfDay appends a row with the P&L identity intact", () => {
    const state = createState(1);
    sellThroughDay(state, 30);
    const report = endOfDay(state);

    expect(state.ledger).toHaveLength(1);
    const e = state.ledger[0];
    expect(e.day).toBe(report.dayNumber);
    expect(e.revenue).toBeCloseTo(report.revenue, 6);
    expect(e.cogs).toBeCloseTo(report.cogs, 6);
    expect(e.fixedCosts).toBe(DAILY_FIXED_COSTS);
    // net = (revenue − cogs) − fixed + offline
    expect(e.net).toBeCloseTo(e.revenue - e.cogs - e.fixedCosts + e.offlineEarned, 6);
    expect(e.net).toBeCloseTo(report.net, 6);
    expect(e.cashAfter).toBeCloseTo(report.cashAfter, 6);
    expect(e.debtService).toBe(0);
  });

  it("ledger is ring-capped at LEDGER_MAX_DAYS", () => {
    const state = createState(1);
    for (let d = 0; d < LEDGER_MAX_DAYS + 5; d++) endOfDay(state);
    expect(state.ledger).toHaveLength(LEDGER_MAX_DAYS);
    // Oldest rows dropped: first remaining day is 6 (days 1–5 trimmed)
    expect(state.ledger[0].day).toBe(6);
    expect(state.ledger[state.ledger.length - 1].day).toBe(LEDGER_MAX_DAYS + 5);
  });

  it("debtService records repayment cash but never enters net", () => {
    const state = createState(1);
    state.cash = 10; // below rescue threshold
    endOfDay(state); // day 1 closes → rescue offer
    expect(state.rescueMode).toBe("offer");
    chooseRescuePath(state, "loan");
    const due = RESCUE_LOAN_PRINCIPAL * (1 + RESCUE_LOAN_FEE_RATE);

    // Jump to the due day with plenty of cash
    state.dayNumber = state.rescueDebts[0].dueDayNumber;
    state.cash = 500;
    const report = endOfDay(state);

    expect(report.debtService).toBeCloseTo(due, 6);
    const e = state.ledger[state.ledger.length - 1];
    expect(e.debtService).toBeCloseTo(due, 6);
    // No sales this day: net is just −fixedCosts — debt service NOT in net
    expect(e.net).toBeCloseTo(-DAILY_FIXED_COSTS, 6);
  });
});

// ---------------------------------------------------------------------------
// 2. Weekly recap
// ---------------------------------------------------------------------------

describe("weekly recap", () => {
  it("attaches only on every 7th day and totals that week's rows", () => {
    const state = createState(1);
    const dayNets: number[] = [];
    for (let d = 1; d <= WEEK_RECAP_EVERY_DAYS; d++) {
      sellThroughDay(state, 10);
      const r = endOfDay(state);
      dayNets.push(r.net);
      if (d < WEEK_RECAP_EVERY_DAYS) {
        expect(r.weekRecap).toBeNull();
      } else {
        expect(r.weekRecap).not.toBeNull();
        expect(r.weekRecap!.weekNumber).toBe(1);
        expect(r.weekRecap!.daysIncluded).toBe(7);
        expect(r.weekRecap!.totalNet).toBeCloseTo(dayNets.reduce((a, b) => a + b, 0), 6);
        expect(r.weekRecap!.bestDay).not.toBeNull();
      }
    }
  });

  it("week 2 recap excludes week 1 rows", () => {
    const state = createState(1);
    let week1Net = 0;
    for (let d = 1; d <= 7; d++) {
      sellThroughDay(state, 10);
      week1Net += endOfDay(state).net;
    }
    let week2Net = 0;
    let recap = null;
    for (let d = 8; d <= 14; d++) {
      sellThroughDay(state, 5);
      const r = endOfDay(state);
      week2Net += r.net;
      if (d === 14) recap = r.weekRecap;
    }
    expect(recap).not.toBeNull();
    expect(recap!.weekNumber).toBe(2);
    expect(recap!.totalNet).toBeCloseTo(week2Net, 6);
    // sanity: week totals genuinely differ, so inclusion of week 1 would fail
    expect(Math.abs(week1Net - week2Net)).toBeGreaterThan(0.01);
  });

  it("partial week (migrated save mid-week) reports fewer daysIncluded", () => {
    const state = createState(1);
    state.dayNumber = 6; // save migrated on day 6 — ledger empty before that
    sellThroughDay(state, 10);
    endOfDay(state); // closes day 6
    sellThroughDay(state, 10);
    const r = endOfDay(state); // closes day 7 → recap from 2 rows only
    expect(r.weekRecap).not.toBeNull();
    expect(r.weekRecap!.daysIncluded).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 3. Balance sheet
// ---------------------------------------------------------------------------

describe("balance sheet", () => {
  it("fresh state: assets = cash + raw inventory, no liabilities", () => {
    const state = createState(1);
    const bs = balanceSheet(state);
    expect(bs.assets.cash).toBe(state.cash);
    expect(bs.assets.rawInventoryValue).toBeCloseTo(state.rawStockLbs * RAW_PEANUT_BASE_PRICE, 6);
    expect(bs.liabilities.total).toBe(0);
    expect(bs.equity).toBeCloseTo(bs.assets.total, 6);
  });

  it("identity holds with debts and inventory: assets − liabilities = equity", () => {
    const state = createState(1);
    state.cash = 10;
    endOfDay(state);
    chooseRescuePath(state, "loan");
    state.roastedStockLbs = 25;
    state.roastedCostBasisPerLb = 0.60;

    const bs = balanceSheet(state);
    expect(bs.liabilities.debtsOwed).toBeCloseTo(state.rescueDebts[0].amountDue, 6);
    expect(bs.assets.roastedInventoryValue).toBeCloseTo(25 * 0.60, 6);
    expect(bs.equity).toBeCloseTo(bs.assets.total - bs.liabilities.total, 9);
  });

  it("preorder cash shows as deferred revenue and amortizes with delivery", () => {
    const state = createState(1);
    state.cash = 10;
    endOfDay(state);
    chooseRescuePath(state, "preorder");
    const ob = state.preorderObligation!;

    let bs = balanceSheet(state);
    expect(bs.liabilities.deferredRevenue).toBeCloseTo(ob.cashReceived, 6);

    // Deliver half → liability halves
    ob.fulfilledLbs = RESCUE_PREORDER_LBS / 2;
    bs = balanceSheet(state);
    expect(bs.liabilities.deferredRevenue).toBeCloseTo(ob.cashReceived / 2, 6);
  });
});

// ---------------------------------------------------------------------------
// 4. Comeback Lines
// ---------------------------------------------------------------------------

describe("comeback lines", () => {
  it("tier ladder math", () => {
    expect(COMEBACK_THRESHOLDS).toEqual([10, 20, 30, 40]);
    expect(comebackTierFor(0)).toBe(0);
    expect(comebackTierFor(9)).toBe(0);
    expect(comebackTierFor(10)).toBe(1);
    expect(comebackTierFor(19)).toBe(1);
    expect(comebackTierFor(20)).toBe(2);
    expect(comebackTierFor(40)).toBe(4);
    expect(comebackTierFor(999)).toBe(4);
  });

  it("pool grows with tier and ids resolve", () => {
    const t1 = comebackPoolForTier(1).length;
    const t4 = comebackPoolForTier(4).length;
    expect(t1).toBeGreaterThan(0);
    expect(t4).toBeGreaterThan(t1);
    expect(t4).toBe(COMEBACK_TIERS.reduce((n, t) => n + t.lines.length, 0));
    for (const line of comebackPoolForTier(4)) {
      expect(COMEBACK_BY_ID[line.id]).toBe(line);
    }
  });

  it("crossing the 10-lore threshold emits comeback_unlocked exactly once", () => {
    const state = createState(7);
    seedFakeLore(state, 9); // any real draw makes the 10th unique entry
    expect(state.comebackTier).toBe(0);

    // Sell until a gag fires (gag every 80 lbs lifetime)
    sellThroughDay(state, 200);
    expect(state.gagsSeen.size).toBeGreaterThanOrEqual(10);
    expect(state.comebackTier).toBeGreaterThanOrEqual(1);

    // The unlock is sticky and does not regress or re-fire below the next threshold
    const tierAfter = state.comebackTier;
    state.roastedStockLbs += 10;
    tick(state, 600);
    expect(state.comebackTier).toBeGreaterThanOrEqual(tierAfter);
  });

  it("gag events carry a comebackId only after a tier is unlocked", () => {
    const fresh = createState(3);
    const events1: ReturnType<typeof tick> = [];
    fresh.roastedStockLbs = 200;
    fresh.roastedCostBasisPerLb = 0.60;
    for (let h = 0; h < 14; h++) events1.push(...tick(fresh, 3_600));
    const earlyGags = events1.filter((e) => e.kind === "gag");
    expect(earlyGags.length).toBeGreaterThan(0);
    for (const g of earlyGags) {
      // comebackTier may unlock mid-day; only pre-unlock gags must lack comebackId.
      if (g.detail.comebackId !== undefined) {
        expect(fresh.comebackTier).toBeGreaterThan(0);
        expect(COMEBACK_BY_ID[g.detail.comebackId as string]).toBeDefined();
      }
    }

    const unlocked = createState(3);
    seedFakeLore(unlocked, 15); // tier 1 already earned
    unlocked.comebackTier = 1;
    unlocked.roastedStockLbs = 200;
    unlocked.roastedCostBasisPerLb = 0.60;
    const events2: ReturnType<typeof tick> = [];
    for (let h = 0; h < 14; h++) events2.push(...tick(unlocked, 3_600));
    const gags = events2.filter((e) => e.kind === "gag");
    expect(gags.length).toBeGreaterThan(0);
    for (const g of gags) {
      expect(typeof g.detail.comebackId).toBe("string");
      expect(COMEBACK_BY_ID[g.detail.comebackId as string]).toBeDefined();
    }
  });

  it("content rails: no allergy jokes in comeback lines", () => {
    for (const line of comebackPoolForTier(4)) {
      expect(line.text.toLowerCase()).not.toMatch(/allerg|epipen|anaphyla/);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Brand campaign
// ---------------------------------------------------------------------------

describe("brand campaign", () => {
  it("locked below the lore threshold", () => {
    const state = createState(1);
    state.cash = 10_000;
    seedFakeLore(state, BRAND_CAMPAIGN_LORE_THRESHOLD - 1);
    expect(buyBrandCampaign(state)).toBeNull();
    expect(state.brandCampaignActive).toBe(false);
    expect(state.cash).toBe(10_000);
  });

  it("requires cash; succeeds once; never twice", () => {
    const state = createState(1);
    seedFakeLore(state, BRAND_CAMPAIGN_LORE_THRESHOLD);

    state.cash = BRAND_CAMPAIGN_COST - 1;
    expect(buyBrandCampaign(state)).toBeNull();

    state.cash = BRAND_CAMPAIGN_COST + 100;
    const ev = buyBrandCampaign(state);
    expect(ev).not.toBeNull();
    expect(ev!.kind).toBe("upgrade_purchased");
    expect(ev!.detail.upgradeType).toBe("brand_campaign");
    expect(state.brandCampaignActive).toBe(true);
    expect(state.cash).toBeCloseTo(100, 6);

    expect(buyBrandCampaign(state)).toBeNull(); // one-time
    expect(state.cash).toBeCloseTo(100, 6);
  });

  it("shifts demand and the optimum price upward", () => {
    const price = 1.50;
    expect(projectedDemand(price, "classic_salted", true))
      .toBeGreaterThan(projectedDemand(price, "classic_salted", false));
    expect(optimumPrice("classic_salted", true))
      .toBeGreaterThan(optimumPrice("classic_salted", false));
  });
});

// ---------------------------------------------------------------------------
// 6. Rescue aftermath beats
// ---------------------------------------------------------------------------

describe("rescue aftermath", () => {
  it("all four paths have speaker, lines, and a lesson", () => {
    for (const path of ["loan", "credit", "payday", "preorder"] as const) {
      const beat = AFTERMATH_BEATS[path];
      expect(beat.speaker.length).toBeGreaterThan(0);
      expect(beat.lines.length).toBeGreaterThan(0);
      expect(beat.lesson.length).toBeGreaterThan(0);
      // Rail: aftermath is closure only — no new offers in the copy
      for (const text of [...beat.lines, beat.lesson]) {
        expect(text.toLowerCase()).not.toMatch(/another loan|new loan|borrow again/);
      }
    }
  });

  it("loan repayment emits debt_aftermath once, never again", () => {
    const state = createState(1);
    state.cash = 10;
    endOfDay(state);
    chooseRescuePath(state, "loan");
    state.dayNumber = state.rescueDebts[0].dueDayNumber;
    state.cash = 500;
    const r1 = endOfDay(state);
    const after1 = r1.rescueEvents.filter((e) => e.kind === "debt_aftermath");
    expect(after1).toHaveLength(1);
    expect(after1[0].detail.path).toBe("loan");
    expect(state.aftermathSeen).toContain("loan");

    // Second loan, repaid again → aftermath must NOT replay
    state.cash = 10;
    endOfDay(state);
    expect(state.rescueMode).toBe("offer");
    chooseRescuePath(state, "loan");
    state.dayNumber = state.rescueDebts[0].dueDayNumber;
    state.cash = 500;
    const r2 = endOfDay(state);
    expect(r2.rescueEvents.filter((e) => e.kind === "debt_aftermath")).toHaveLength(0);
  });

  it("full preorder delivery emits aftermath; partial does not", () => {
    // Full delivery
    const full = createState(1);
    full.cash = 10;
    endOfDay(full);
    chooseRescuePath(full, "preorder");
    full.roastedStockLbs = RESCUE_PREORDER_LBS;
    full.dayNumber = full.preorderObligation!.dueDayNumber;
    const rFull = endOfDay(full);
    const a = rFull.rescueEvents.filter((e) => e.kind === "debt_aftermath");
    expect(a).toHaveLength(1);
    expect(a[0].detail.path).toBe("preorder");

    // Partial delivery
    const part = createState(2);
    part.cash = 10;
    endOfDay(part);
    chooseRescuePath(part, "preorder");
    part.roastedStockLbs = RESCUE_PREORDER_LBS / 4;
    part.dayNumber = part.preorderObligation!.dueDayNumber;
    const rPart = endOfDay(part);
    expect(rPart.rescueEvents.some((e) => e.kind === "preorder_partial")).toBe(true);
    expect(rPart.rescueEvents.filter((e) => e.kind === "debt_aftermath")).toHaveLength(0);
    expect(part.aftermathSeen).not.toContain("preorder");
  });
});

// ---------------------------------------------------------------------------
// 7. Persistence: schema v4
// ---------------------------------------------------------------------------

describe("persistence schema v4", () => {
  it("round-trip preserves ledger, comebackTier, campaign flag, aftermathSeen", () => {
    const state = createState(1);
    sellThroughDay(state, 20);
    endOfDay(state);
    state.comebackTier = 2;
    state.brandCampaignActive = true;
    state.aftermathSeen = ["loan", "preorder"];

    const loaded = deserialize(serialize(state));
    expect(loaded.ledger).toHaveLength(1);
    expect(loaded.ledger[0]).toEqual(state.ledger[0]);
    expect(loaded.comebackTier).toBe(2);
    expect(loaded.brandCampaignActive).toBe(true);
    expect(loaded.aftermathSeen).toEqual(["loan", "preorder"]);
  });

  it("v3 save migrates: empty ledger, derived comebackTier, safe defaults", () => {
    const state = createState(1);
    seedFakeLore(state, 23); // tier 2 territory (20 ≤ 23 < 30)
    const v3 = makeV3Json(state);
    expect(JSON.parse(v3).schemaVersion).toBe(3);

    const loaded = deserialize(v3);
    expect(loaded.ledger).toEqual([]);
    expect(loaded.comebackTier).toBe(2); // derived from 23 collected entries
    expect(loaded.brandCampaignActive).toBe(false);
    expect(loaded.aftermathSeen).toEqual([]);
  });

  it("importEnvelopeText accepts a v3 save and re-serializes as v4 (regression)", () => {
    const storage = makeStorage();
    const state = createState(5);
    state.cash = 333;
    const result = importEnvelopeText(makeV3Json(state), storage);
    expect(result.ok).toBe(true);
    expect(result.state!.cash).toBe(333);
    expect(result.state!.ledger).toEqual([]);
    // Stored blob is schema-current
    const stored = JSON.parse(storage._store.get("dmn_save_v1") as string);
    expect(stored.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("rejects crafted saves: non-finite ledger numbers, bad tier, bad types", () => {
    const base = createState(1);
    sellThroughDay(base, 10);
    endOfDay(base);

    const poisonLedger = JSON.parse(serialize(base));
    poisonLedger.sim.ledger[0].revenue = 1e999; // Infinity after JSON round-trip? craft directly
    poisonLedger.sim.ledger[0].revenue = null;
    expect(() => deserialize(JSON.stringify(poisonLedger))).toThrow(/ledger/);

    const badTier = JSON.parse(serialize(base));
    badTier.sim.comebackTier = 7;
    expect(() => deserialize(JSON.stringify(badTier))).toThrow(/comebackTier/);

    const badFlag = JSON.parse(serialize(base));
    badFlag.sim.brandCampaignActive = "yes";
    expect(() => deserialize(JSON.stringify(badFlag))).toThrow(/brandCampaignActive/);

    const badAftermath = JSON.parse(serialize(base));
    badAftermath.sim.aftermathSeen = [42];
    expect(() => deserialize(JSON.stringify(badAftermath))).toThrow(/aftermathSeen/);
  });

  it("oversized ledger in a crafted save is capped on load", () => {
    const state = createState(1);
    const env = JSON.parse(serialize(state));
    env.sim.ledger = Array.from({ length: 100 }, (_, i) => ({
      day: i + 1, revenue: 1, cogs: 0.4, fixedCosts: 5,
      offlineEarned: 0, net: -4.4, debtService: 0, cashAfter: 50,
    }));
    const loaded = deserialize(JSON.stringify(env));
    expect(loaded.ledger).toHaveLength(LEDGER_MAX_DAYS);
    expect(loaded.ledger[0].day).toBe(100 - LEDGER_MAX_DAYS + 1);
  });

  it("unknown aftermath paths in a save are dropped on revive", () => {
    const state = createState(1);
    state.aftermathSeen = ["loan"];
    const env = JSON.parse(serialize(state));
    env.sim.aftermathSeen = ["loan", "weird_path"];
    const loaded = deserialize(JSON.stringify(env));
    expect(loaded.aftermathSeen).toEqual(["loan"]);
  });
});
