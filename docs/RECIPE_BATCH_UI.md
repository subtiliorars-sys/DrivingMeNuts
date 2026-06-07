# Recipe & Batch UI — P1.5 Spec

> Phase: P1.5 (between P1 idle-core ship and P2 districts).
> Scope: roast-slot click modal, recipe selection, batch sizing, teaching surface.
> Prerequisite: P1 verify gate green. Builds on existing `startRoast(state, slotIndex, recipe, lbs)`.

---

## 1. Current State (P1 baseline)

`economy.ts` already defines all three recipes:

| RecipeId | ingredientCostPerLb | roastSecondsPerLbTinPan | Total COGS/lb |
|----------|---------------------|--------------------------|---------------|
| `classic_salted` | $0.20 | 60 s | $0.60 |
| `honey_cinnamon` | $0.30 | 72 s | $0.70 |
| `ghost_pepper` | $0.50 | 90 s | $0.90 |

`honey_cinnamon` and `ghost_pepper` are fully wired in `engine.ts` (`cogsPerLb`, `roastDurationSeconds`, `startRoast`). They are locked behind unlock gates (§3) in P1.5 — the engine is ready; only UI gates and demand params are new work.

---

## 2. Slot-Click Modal

**Trigger:** Player clicks/taps any roast slot with status `"empty"`.

**Modal layout (single screen, no sub-pages):**

```
┌─────────────────────────────────────────────┐
│  ROAST SLOT 1                         [×]   │
│─────────────────────────────────────────────│
│  RECIPE                                     │
│  ○ Classic Salted   COGS $0.60/lb  [unlocked]│
│  ○ Honey Cinnamon   COGS $0.70/lb  [unlocked at $500]│
│  ○ Ghost Pepper     COGS $0.90/lb  [unlocked at $1 200]│
│─────────────────────────────────────────────│
│  BATCH SIZE                                 │
│  [10 lbs] [25 lbs] [50 lbs] [custom ▲▼]    │
│─────────────────────────────────────────────│
│  PREVIEW (selected: Honey Cinnamon, 25 lbs) │
│  COGS total:        $17.50                  │
│  Roast time:        30 min                  │
│  At $1.50/lb sell:  Revenue $37.50          │
│                     Gross margin  53%       │
│  At $1.90/lb sell:  Revenue $47.50          │
│                     Gross margin  63%       │
│─────────────────────────────────────────────│
│              [START ROAST]                  │
└─────────────────────────────────────────────┘
```

Rules:
- Locked recipes show the unlock milestone text in muted color; they are not selectable.
- Batch size quick-picks: 10 / 25 / 50 lbs. Custom spinner: `BATCH_MIN_LBS` (1) to
  `min(BATCH_MAX_LBS, state.rawStockLbs)` — never exceeds available raw stock.
- Preview recalculates on every recipe or size change (no confirm step before preview).
- "At $1.90/lb" second price row uses `projectedDemand()` to display demand hint:
  "~25 lbs/hr demand at this price" — the teaching hook (see §5).
- [START ROAST] calls `startRoast(state, slotIndex, recipe, lbs)`. If it returns null
  (insufficient cash for ingredients), show inline error: "Not enough cash for
  ingredients ($X.XX needed)." Do not close the modal.

---

## 3. Unlock Gating

Unlocks are cash-milestone based, NOT time-gated or streak-gated (gate-compliant per
DARK_PATTERN_GATE A.1 and A.2).

| Recipe | Unlock Condition | TUNABLE |
|--------|-----------------|---------|
| `classic_salted` | Available from game start | — |
| `honey_cinnamon` | Cumulative lifetime cash earned >= $500 | TUNABLE: $500 |
| `ghost_pepper` | Cumulative lifetime cash earned >= $1,200 | TUNABLE: $1,200 |

**Tracking field:** add `lifetimeEarned: number` to `SimState` (default 0; incremented
in `endOfDay` by `revenue` before resetting `dayStats`). This is the single unlock
counter — no separate achievement system needed in P1.5.

**Unlock event:** first time threshold is crossed, emit a `recipe_unlocked` SimEvent
(new `SimEventKind` entry: `"recipe_unlocked"`). The Phaser scene shows a toast:
"New recipe unlocked: Honey Cinnamon! Higher COGS, higher ceiling — try it."

---

## 4. Recipe Demand Multipliers

Each recipe has a distinct demand modifier on top of the base demand curve.
This is the teaching surface: different recipes serve different willingness-to-pay
segments, so gross margin math alone does not tell the whole story — velocity matters.

**Formula:**
```
demandLbsPerHour(recipe, price) = baseDemand(price) × RECIPE_DEMAND_MULT[recipe]
```

Where `baseDemand(price)` is the existing linear formula from `engine.ts`.

**Constants to add to `economy.ts`:**

```typescript
export const RECIPE_DEMAND_MULT: Readonly<Record<RecipeId, number>> = {
  classic_salted: 1.00,   // baseline — broadest appeal
  honey_cinnamon: 0.75,   // 25% fewer buyers; sweet-niche segment
  ghost_pepper:   0.40,   // 60% fewer buyers; heat-seeking niche only
} as const;
```

TUNABLE: `honey_cinnamon` multiplier 0.75; `ghost_pepper` multiplier 0.40.

Rationale for values: at default sell price $1.50, classic_salted earns ~20 lbs/hr.
Honey Cinnamon at $1.90 (its price-optimal sweet spot post-COGS) earns ~15 × 0.75 = ~11
lbs/hr but at much higher margin — player must weigh velocity vs margin. Ghost Pepper
at $2.50 earns ~8 × 0.40 = ~3 lbs/hr, very high margin but slow burn; teaches niche
product positioning. These are P1-district numbers; district modifiers (P2) will layer
on top via `DISTRICT_DEMAND_PARAMS` (see P2_DISTRICTS_SPEC.md).

**Engine change:** `demandLbsPerHour` (currently private to `engine.ts`) must accept
`recipe: RecipeId` and multiply by `RECIPE_DEMAND_MULT[recipe]`. Callers (`tick`,
`applyOffline`, `projectedDemand`) all pass `state.sellPrice`; they also have access to
the current recipe context and must be updated.

COSTLY: `applyOffline` currently uses a single `baseDemandAtPrice` estimate without a
recipe context (because offline time spans multiple potential recipes). Resolution:
`applyOffline` uses the demand multiplier of the majority recipe in `roastedStockLbs`,
OR conservatively uses the lowest multiplier among active recipes. Spec: use
`classic_salted` multiplier (1.0) for offline demand — over-estimates are capped by
`maxEarnFromStock` anyway, and this is the safe/positively-framed direction.

---

## 5. Teaching Surface

The modal's preview section is the primary unit-economics teaching hook:

1. **COGS/lb** is shown per recipe — player sees immediately that Ghost Pepper costs
   50% more per lb to produce than Classic Salted.
2. **Gross margin** is shown at the current sell price. If the margin is below 45%, the
   preview row turns amber (matches the insight-line threshold in `engine.ts` line 464).
3. **Demand hint** from `projectedDemand(price) × RECIPE_DEMAND_MULT[recipe]` is shown
   as "~X lbs/hr at your price" — the velocity signal.
4. **Two price scenarios** in preview (current price + optimal price hint) let the
   player see the margin/volume tradeoff before committing to a batch.

No lecture. The numbers do the teaching.

---

## 6. Sim API Changes (Minimal, Exact)

### 6a. `startRoast` — no signature change required

Existing signature: `startRoast(state, slotIndex, recipe, lbs)` already accepts
`RecipeId`. The modal calls it as-is.

### 6b. `demandLbsPerHour` (private helper in engine.ts)

Change signature from:
```typescript
function demandLbsPerHour(price: number, state: SimState): number
```
to:
```typescript
function demandLbsPerHour(price: number, state: SimState, recipe: RecipeId = "classic_salted"): number
```
Body: multiply final result by `RECIPE_DEMAND_MULT[recipe]` before clamp.

Default `"classic_salted"` keeps backward compat with existing call sites that do not
yet pass a recipe (they behave identically to before).

### 6c. `projectedDemand` (exported utility, engine.ts)

Change signature from:
```typescript
export function projectedDemand(price: number): number
```
to:
```typescript
export function projectedDemand(price: number, recipe: RecipeId = "classic_salted"): number
```
Body: multiply by `RECIPE_DEMAND_MULT[recipe]`.

### 6d. `SimState` — add `lifetimeEarned: number`

Add to `types.ts` `SimState` interface:
```typescript
lifetimeEarned: number;  // cumulative revenue across all days (for recipe unlock gates)
```
Initialize to `0` in `createState()`. Increment in `endOfDay` before dayStats reset:
`state.lifetimeEarned += state.dayStats.revenue`.

### 6e. `SimEventKind` — add `"recipe_unlocked"`

In `types.ts`:
```typescript
| "recipe_unlocked"
```

### 6f. `economy.ts` — add `RECIPE_DEMAND_MULT`

Add the constant defined in §4 to `economy.ts`. Export it. Import in `engine.ts`.

---

## 7. Open Questions

OPEN: Should batch-size quick-picks be dynamic (based on raw stock on hand) or static
      (10/25/50 always shown, greyed when stock is insufficient)?
OPEN: Ghost Pepper — tooltip note about allergy framing? (RISK_REGISTER A1 requires
      honest labeling; this is an in-game item, not an allergen label, but check tone.)
OPEN: At P2 multi-district, each district gets per-recipe demand multipliers stacked on
      top of `RECIPE_DEMAND_MULT`. Does the modal preview district-specific demand, or
      show the flat average? Defer to P2 spec.
