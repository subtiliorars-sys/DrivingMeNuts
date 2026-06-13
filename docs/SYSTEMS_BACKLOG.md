# Systems Backlog — implementation-ready specs for deferred P1+ features

> **Purpose.** Three improvement candidates were *deferred* during the autonomous
> improvement loop (2026-06-07) because they either ripple through the economy
> test-suite + the GDD D2 walkthrough (weather, C4 upgrades) or need visual
> layout verification that can't be done headless (large-text). None are blocked
> on design — they're blocked on *careful, ideally attended* execution. This doc
> turns each into a ready-to-build spec with the exact integration points, the
> test-update plan, the determinism/dark-pattern checks, and the persistence
> shape, so an attended session (or a careful loop fire) can land them fast.
>
> Canon references: GDD §C3 (demand), §C4 (upgrades); `src/data/economy.ts`
> (single source of truth for constants); `src/sim/engine.ts` (`demandLbsPerHour`,
> `endOfDay`, `tick`); DARK_PATTERN_GATE; RISK_REGISTER A2/A4.

---

## 1. Weather demand modifier (GDD §C3) — ✅ DONE (2026-06-07, attended)

> **SHIPPED & WIRED.** Foundation (constants + pure `weatherForDay` + `weatherSeed`) merged as
> v0.8.1; demand wiring done attended (owner present): `weatherFactorFor(state)` multiplies live
> demand in `tick()` alongside the weekday factor; `projectedDemand` takes an optional weather
> factor so the HUD demand hint + roast-modal previews stay truthful; the HUD shows today's
> weather + a 1-day forecast. Non-breaking (all prior tests stayed green — most are supply-bound,
> so weather changes velocity not totals). Tests: `src/sim/weather_demand.test.ts`. Spec retained below.

**Goal.** A per-day weather state that nudges demand — rainy −20%, hot-sunny
+15% (GDD numbers) — teaching that some revenue drivers are *external and
uncontrollable*, only manageable by planning. Mirrors the already-shipped
weekday `DAY_FACTOR` mechanic (wave 4).

### Design
- **States + multipliers** (new in `economy.ts`):
  ```ts
  export type Weather = "clear" | "hot_sunny" | "rainy";
  export const WEATHER_FACTOR: Readonly<Record<Weather, number>> = {
    clear: 1.00, hot_sunny: 1.15, rainy: 0.80,   // GDD C3
  };
  ```
- **Determinism (critical).** Do NOT consume the live PRNG stream (`nextRand`)
  to roll weather — that shifts every existing demand draw and breaks
  determinism tests. Instead derive it *purely* from the day number + the save
  seed, exactly like `dayFactorFor(dayNumber)` is pure:
  ```ts
  export function weatherForDay(dayNumber: number, seed: number): Weather { /* pure hash → index */ }
  ```
  Store the seed on `SimState` (there's already `rngState`; add an immutable
  `weatherSeed` set in `createState`, additive-optional in persistence, default
  to a constant so legacy saves are deterministic). This also makes a **1-day
  forecast** trivial (`weatherForDay(dayNumber+1, seed)`) — show it on the report
  card so weather is *predictable, never a surprise* (DARK_PATTERN_GATE A.1: no
  "you missed sunny day" framing; it's shown ahead like the weekday factor).
- **Integration point.** `demandLbsPerHour(price, state, demandMult, dayFactor)`
  in `engine.ts` already multiplies `dayFactor`. Add `× WEATHER_FACTOR[weatherForDay(state.dayNumber, seed)]`
  in the same expression (and mirror it in `applyOffline`'s demand estimate and
  in `projectedDemand`/`optimumPrice` so the HUD hint and previews stay truthful —
  same surfaces the brand-campaign base-price shift already touches).

### Test-update plan (this is why it was deferred)
A demand multiplier changes sold-lbs in any multi-tick test. The fix is to make
**`clear` (×1.0) the default for the days existing tests run on**, so default
behavior is unchanged, then add weather-specific tests:
- Calibrate `weatherForDay` so **day 1 = clear** for the default seed → all
  single-day-1 tests (most of `engine.test.ts`, `edge_cases.test.ts`) are
  unaffected. Verify which days each multi-day test spans (grep
  `sellThroughDay`, `runDayToClose`, loops over `endOfDay`) and confirm the
  weather sequence for the default seed leaves their assertions intact, OR
  switch those tests to assert against `weatherForDay`-derived expected demand.
- The **GDD D2 walkthrough** (docs/GDD.md) assumes clear weather — add a
  one-line "assumes clear weather (×1.0)" note rather than re-deriving the prose.
- New tests (`src/sim/weather.test.ts`): `weatherForDay` determinism (same
  day+seed → same weather; distribution across 100 days is sane), the three
  multipliers applied to demand, forecast = next-day weather, and a
  save round-trip of `weatherSeed`.
- `wave7_integration.test.ts`: the 7-day loop will see varied weather — update
  its net/recap assertions to tolerate weather, or pin a seed whose week is
  all-clear for the deterministic-number assertions.

### Risk / gate
A2: numbers are GDD-sourced and shown (not fantasy). A4: predictable + forecast,
no FOMO. Persistence: `weatherSeed` additive-optional, no schema bump.

---

## 2. Unbuilt GDD §C4 upgrades

The roaster-tier and queue-slot upgrades shipped (wave 4). Three C4 rows remain.
All touch `endOfDay`/economy → same test-ripple caution as weather; all are
purchases gated on cash, so they're **additive and default-off** (a fresh save
never has them → existing tests unaffected until a test buys one).

### 2a. Auto-sell off-peak (GDD C4: "sell remaining batches at 10% discount EOD")
- **Mechanic.** Optional toggle/upgrade: at `endOfDay`, any unsold roasted stock
  is sold at `sellPrice × (1 − AUTO_SELL_DISCOUNT)` (10%), reducing spoilage/waste
  and freeing working capital. Teaches: clearance vs. holding cost.
- **Constants.** `AUTO_SELL_DISCOUNT = 0.10`, upgrade cost (GDD: L1 $3k / L3 $10k —
  scale to P1 economy; suggest one-time ~$1.5k given P1 cash scale, owner to confirm).
- **Integration.** New `endOfDay` step BEFORE the day-stats reset, AFTER sales:
  if `autoSellEnabled`, convert `roastedStockLbs` to revenue at the discounted
  price, recognize COGS at `roastedCostBasisPerLb` (consistent with RT6-1), add a
  `DayReport` line + ledger row contribution. Persisted flag `autoSellEnabled` (additive-optional).
- **Test plan.** New `auto_sell.test.ts`: discounted-revenue math, COGS recognized,
  ledger/report line present, equity-neutral-at-cost check. Existing tests
  unaffected (flag defaults false).
- **Dark-pattern.** Frame as "reduce waste," not "never lose a sale!" No FOMO.

### 2b. Refrigerated truck (GDD C4: extend spoilage window) — **BLOCKED on spoilage**
Spoilage itself is P2-deferred (owner-ratified). This upgrade is meaningless
without it. **Do not build until spoilage ships.** Listed for completeness;
keep in P2 column.

### 2c. Marketing-campaign tiers (GDD C4: General/Premium/Loyalty, +% sales 14 days)
- **Mechanic.** Purchasable temporary demand boosts (distinct from the permanent
  "Legumes. Not Nuts." brand campaign which shipped). E.g. General: +10% demand
  for 14 days for $X. Teaches: customer-acquisition cost, temporary vs. structural.
- **Caution.** This is a **timed** boost — must NOT become a FOMO/retention hook
  (A4). Frame as a deliberate spend with a clear end; no "re-up before it
  expires!" nagging. Owner Decision recommended before building (borderline A4).
- **Integration.** A `marketingActiveUntilDay` field; `demandLbsPerHour` adds the
  multiplier while `dayNumber <= marketingActiveUntilDay`. Additive-optional persist.
- **Test plan.** Boost applies within window, expires after; demand math; persist.
- **Status.** PARK as Owner Decision (A4 borderline) — logged to questions.md.

---

## 3. Large-text accessibility — ✅ SHIPPED (2026-06-13, PR #29)

**Goal.** Complete the accessibility trio (reduced-motion ✓, colour-blind ✓,
large-text). A `largeText` pref scaling font sizes for low-vision players.

### Shipped (DM-W2)
- `largeText` pref in Settings (same pattern as reduced-motion / colour-blind).
- `scaledFont()` helper + `txt()` wrapper apply scale in one place.
- `npm run verify` green; unit tests cover pref persistence.

### Owner follow-up (visual QA — not a code blocker)
Headless verify cannot catch panel overflow at FIT scale. Daniel: run
`npm run dev`, toggle Large text, eyeball Glossary / BOOKS / Settings / day-report.
Owner queue item: `agent-corps/fleet/owner-queue/items/20260613-1820-dmn-visual-check`.

### Status
**Code shipped.** Attended visual verification remains on the owner queue.

---

## Summary table

| Item | Safe unattended? | Blocker | Persistence |
|---|---|---|---|
| Weather modifier | With care (default-clear keeps tests green) | test-suite + GDD-walkthrough update | `weatherSeed` additive-optional |
| Auto-sell off-peak | Yes (default-off, additive) | owner confirm cost | `autoSellEnabled` additive-optional |
| Refrigerated truck | No | **spoilage (P2) not shipped** | — |
| Marketing tiers | No | **A4 Owner Decision** (timed boost) | additive-optional |
| Large-text | Shipped (DM-W2); owner visual QA queued | visual eyeball in owner queue | `largeText` pref |
