# P2 Districts Spec — Driving Me Nuts

> Phase: P2. Prerequisite: P1.5 ship (recipe/batch UI green, PERSISTENCE.md wired).
> Scope: data model for multi-district play. Gameplay, RPG content, and NPC wiring are
> P2 implementation tasks; this doc owns the data shapes and economy constants only.

---

## 1. In-Scope Districts (P2 Launch Set)

Per RISK_REGISTER A3: 3–4 zones at launch. P2 ships exactly 4 districts.
Three surplus districts are named and frozen to the cut-list (see §6).

| District | Foot Traffic Shape | Base Demand Modifier | Base Price Shift | Permit Tier | Flavor Bias |
|----------|--------------------|---------------------|-----------------|-------------|-------------|
| **Farmers' Market** | Morning spike (8am–12pm), taper | 1.00 (baseline) | $0.00 | basic | classic_salted, honey_cinnamon |
| **Office Quarter** | Flat plateau 11am–1pm | 0.90 | −$0.10 | standard | honey_cinnamon, ghost_pepper |
| **Boardwalk** | Evening spike (5pm–9pm) | 1.20 | +$0.20 | premium | ghost_pepper, honey_cinnamon |
| **University** | Late spike (9pm–midnight) | 0.80 | −$0.20 | standard | classic_salted, honey_cinnamon |

TUNABLE: all demand modifiers and base price shifts.

---

## 2. Per-District Demand Parameters

The P1 demand formula:
```
demand = (BASE_LBS_PER_HOUR - DEMAND_SLOPE × (price - BASE_PRICE)) × RECIPE_DEMAND_MULT[recipe]
```

P2 extends this with per-district params:

```
demand = (districtBase - districtSlope × (price - (BASE_PRICE + districtPriceShift)))
         × RECIPE_DEMAND_MULT[recipe]
         × recipeDistrictBias[recipe][district]
         × footTrafficMultiplier(district, daySecond)
```

Where `districtBase`, `districtSlope`, and `districtPriceShift` override the global
constants for the active district.

TUNABLE reference values:

| District | districtBase (lbs/hr) | districtSlope | districtPriceShift |
|----------|-----------------------|---------------|--------------------|
| farmers_market | 20 | 10 | $0.00 |
| office_quarter | 18 | 12 | −$0.10 |
| boardwalk | 24 | 8 | +$0.20 |
| university | 16 | 14 | −$0.20 |

Slopes differ intentionally: Office Quarter customers are more price-sensitive
(professional buyers watching their spend); Boardwalk tourists are less price-sensitive
(experiential spenders). This is the location-strategy lesson: the same product has
different optimal prices in different markets.

---

## 3. Foot-Traffic Day-Curves

Each district has a piecewise day-curve multiplier over the 14-hour operating day
(6am–8pm = seconds 0–50,400). The multiplier scales `districtBase` before the price
formula is applied.

```typescript
// Curve: array of [startSecond, multiplier] breakpoints; linear interpolation between.
type FootTrafficCurve = ReadonlyArray<readonly [number, number]>;
```

TUNABLE reference curves (all times in simulated seconds; 1 sim-hour = 3,600 sim-s):

| District | Curve breakpoints [simSec, mult] |
|----------|----------------------------------|
| farmers_market | [0, 0.4], [7200, 1.8], [21600, 1.0], [50400, 0.3] |
| office_quarter | [0, 0.2], [18000, 1.6], [25200, 0.5], [50400, 0.2] |
| boardwalk | [0, 0.3], [39600, 1.0], [50400, 1.8] |
| university | [0, 0.1], [43200, 0.3], [50400, 1.7] — note: demand only meaningful near close |

TUNABLE: all multiplier values. University curve intentionally makes morning operations
nearly valueless, teaching location selection has temporal cost.

**University curve note:** The GDD (B2) describes a University demand spike of
"9pm–midnight." The operating day ends at 8pm (sim-second 50,400 = 14 hrs × 3600).
The 9pm–midnight peak therefore lies **outside the P2 operating window**. The P2 curve
above models the pre-close uptick (from 6pm = sim-second 43,200 toward 8pm close) as
the closest in-window approximation. A true late-night spike requires an extended-hours
permit and a new operating day shape — flag as a **P3 concept ("night-market extended-
hours permit")** and reconcile with GDD before implementing.

---

## 4. Permit Gating

Each district is locked behind a permit. Permits are one-time purchases with a renewal
clock — teaches compliance cost, not just unlock cost.

| District | Permit Cost (one-time) | Renewal Cost | Renewal Period (days) |
|----------|----------------------|--------------|----------------------|
| farmers_market | $0 (starting district) | $50 | 30 in-game days |
| office_quarter | $150 | $75 | 30 in-game days |
| boardwalk | $400 | $120 | 60 in-game days |
| university | $200 | $90 | 30 in-game days |

TUNABLE: all permit costs.

**Permit data in `SimState`:**

```typescript
// Added to SimState in P2
permits: Record<DistrictId, PermitStatus>;
```

```typescript
interface PermitStatus {
  owned: boolean;
  renewalDueDayNumber: number | null; // null = never expires (pre-renewal first bought)
  expired: boolean;                    // true if renewalDueDayNumber passed without renewal
}
```

Expired permits: district is still unlocked (knowledge is kept) but player cannot set
up in that district until renewed. Maya (NPC) offers expedited renewal at 2× cost if
the player is past due (teaches: cost of non-compliance).

**Implementation note:** `endOfDay` checks each permit's `renewalDueDayNumber` against
`state.dayNumber`. If expired, set `expired = true`, emit `permit_expired` event, show
a non-scary toast: "Your Boardwalk permit expired. Renew with Maya to return there."
No punitive cash deduction on expiry — only loss of access.

**Fixed-cost reconciliation:** The P1 `DAILY_FIXED_COSTS = $5.00` constant
(`economy.ts`) bundles prorated permit cost with fuel/propane. When P2 implements
per-district permit renewals as explicit calendar costs, the permit component should be
removed from `FIXED_COSTS_PER_DAY` to avoid double-counting. Adjust
`DAILY_FIXED_COSTS` (or introduce a `NON_PERMIT_DAILY_FIXED_COSTS` constant) when
wiring P2 permit mechanics.

---

## 5. Travel Cost and Time

Moving the truck between districts has a cost. This is the location-strategy lesson:
the revenue delta from a better location must sometimes NOT cover the move cost.

| Move | Travel Cost ($) | Travel Time (sim-seconds) |
|------|-----------------|--------------------------|
| farmers_market ↔ office_quarter | $5 | 1,800 (0.5 sim-hr) |
| farmers_market ↔ boardwalk | $12 | 5,400 (1.5 sim-hr) |
| farmers_market ↔ university | $10 | 3,600 (1.0 sim-hr) |
| office_quarter ↔ boardwalk | $8 | 3,600 (1.0 sim-hr) |
| office_quarter ↔ university | $7 | 2,700 (0.75 sim-hr) |
| boardwalk ↔ university | $15 | 5,400 (1.5 sim-hr) |

TUNABLE: all travel costs and times.

**Teaching mechanic:** travel time is dead time — the truck is not roasting or selling.
If the Boardwalk evening spike starts at sim-second 39,600 and travel from Office Quarter
takes 3,600 sim-seconds plus $8, the player must weigh: does the boardwalk evening
surplus exceed $8 + the lost sales window? This is a real small-business problem
(route optimization, opportunity cost).

**SimState field:**
```typescript
activeDistrict: DistrictId;
travelState: TravelState | null;  // null = truck is stationary
```

```typescript
interface TravelState {
  fromDistrict: DistrictId;
  toDistrict: DistrictId;
  secondsRemaining: number;
  totalSeconds: number;
  travelCost: number;             // already deducted at travel-start
}
```

`tick()` advances `travelState.secondsRemaining` the same way it advances roast timers.
While `travelState != null`, demand is zero (truck is on the road). On arrival:
`activeDistrict = toDistrict`, `travelState = null`, emit `travel_arrived` event.

---

## 6. TypeScript Interface Sketch for economy.ts

Add to `economy.ts`:

```typescript
export type DistrictId =
  | "farmers_market"
  | "office_quarter"
  | "boardwalk"
  | "university";

export interface DistrictDemandParams {
  readonly id: DistrictId;
  readonly districtBase: number;          // lbs/hr at base price
  readonly districtSlope: number;         // elasticity slope
  readonly districtPriceShift: number;    // $/lb shift on BASE_PRICE
  readonly footTrafficCurve: FootTrafficCurve;
  readonly permitCost: number;            // $ one-time
  readonly renewalCost: number;           // $ per renewal
  readonly renewalPeriodDays: number;
  // Per-recipe bias multipliers for this district (stacks with RECIPE_DEMAND_MULT)
  readonly recipeBias: Readonly<Record<RecipeId, number>>;
}

export type FootTrafficCurve = ReadonlyArray<readonly [number, number]>;

export const DISTRICT_PARAMS: Readonly<Record<DistrictId, DistrictDemandParams>> = {
  farmers_market: { /* ... see §2–§4 tables above ... */ },
  office_quarter: { /* ... */ },
  boardwalk:      { /* ... */ },
  university:     { /* ... */ },
} as const;

export const TRAVEL_COSTS: Readonly<Record<string, { cost: number; seconds: number }>> = {
  "farmers_market→office_quarter": { cost: 5, seconds: 1800 },
  // etc. — key = `${from}→${to}` canonical (always alphabetically smaller first)
} as const;
```

TUNABLE: all constants in `DISTRICT_PARAMS` and `TRAVEL_COSTS`.

**recipeBias reference values (per-district recipe multipliers, stacked on RECIPE_DEMAND_MULT):**

| | classic_salted | honey_cinnamon | ghost_pepper |
|-|----------------|----------------|--------------|
| farmers_market | 1.10 | 1.05 | 0.70 |
| office_quarter | 0.90 | 1.15 | 1.10 |
| boardwalk | 0.80 | 1.20 | 1.30 |
| university | 1.10 | 1.10 | 0.80 |

TUNABLE: all bias values. Design intent: Boardwalk tourists want novelty (ghost pepper
bias 1.30); University students want value (classic/honey flat, ghost pepper low);
Office Quarter wants premium-but-safe (honey bias up, ghost pepper moderate).

---

## 7. P2 Cut-List (Frozen per RISK_REGISTER A3)

The following three districts from GDD B2 are post-launch cut-list candidates.
Do NOT design, spec, or stub data for them until P2 ships and owner re-evaluates scope.

| District | Reason for Cut |
|----------|----------------|
| **Waterfront Park** | Event-driven foot traffic requires weather system not in P2 |
| **Downtown Historic** | Premium permit tier + Dr. Chen NPC arc = scope risk |
| **Stadium District** | Event-calendar mechanic (game-day spikes) = new system |

These are not cancelled — they are deferred. If P2 performance is strong, A3 is the
standing review trigger for re-admission.

---

## 8. Open Questions

OPEN: Should the player be able to set a different sell price per district, or is one
      global price simpler for P2? Per-district pricing teaches more but adds UI surface.
OPEN: Travel cost table uses static costs. Should costs vary by roaster tier (heavier
      truck = higher fuel cost)? Adds a compounding upgrade incentive.
OPEN: Permit renewal reminder: how many days before expiry should Maya ping the player?
      (Must stay gate-compliant — reminder is informational, never FOMO-framed.)
OPEN: University evening-only curve makes daytime parking pointless. Should the player
      be blocked from entering University before, say, sim-second 36,000 (4pm)? Or is
      the low-demand lesson sufficient without a hard block?
