# Persistence Design — Driving Me Nuts P2

> Scope: save/load + offline wiring for P2. LOCAL-ONLY by design (see CRIT-1 tripwire).
>
> CRIT-1 guard: any server-side player data forces governance re-tier + Owner Decision
> before any implementation starts. This design must not need it. If cloud sync is ever
> proposed, that is a distinct Owner Decision; this doc does not pre-approve it.

---

## 1. Storage Backend Choice

**Primary:** `localStorage` (serialized JSON string under one key: `dmn_save_v1`).

**Rationale:** SimState is small (< 10 KB at P2 scope). `localStorage` is synchronous,
available in all target browsers and Electron wrappers, and requires no async/Promise
plumbing in the hot path. `IndexedDB` is reserved as a P3 upgrade path if save size
grows beyond the 5 MB `localStorage` ceiling (e.g., long event log, district history).

---

## 2. Save Schema

```typescript
interface SaveEnvelope {
  schemaVersion: number;        // bumped on every breaking change; currently 1
  savedAt: number;              // Date.now() at time of save (wall-clock ms)
  sim: SerializedSimState;      // SimState with Set fields converted to arrays
  meta: SaveMeta;
}

/**
 * Wire format for SimState. Identical to SimState except:
 *   - gagsSeen: string[]   (JSON.stringify cannot serialize a Set — serialise as array)
 * Load path must revive: state.gagsSeen = new Set(envelope.sim.gagsSeen)
 */
type SerializedSimState = Omit<SimState, "gagsSeen"> & { gagsSeen: string[] };

interface SaveMeta {
  totalPlaytimeSeconds: number; // cumulative on-screen seconds (excludes offline)
  // NOTE: offlineBankMs was removed. Offline elapsed time is derived from
  // (Date.now() - envelope.savedAt) on load; one mechanism only (§6). Do not
  // add it back without deleting the §6 computation to avoid double-counting.
}
```

**Serialization note:** `SimState` has `gagsSeen: Set<string>`. `JSON.stringify` silently
converts a `Set` to `{}` (empty object) — NOT lossless. The envelope must serialize
`gagsSeen` as `string[]` (via `[...state.gagsSeen]`) and the load path must revive it:
`new Set(envelope.sim.gagsSeen)`. `RoastSlot.recipe` is a `RecipeId` string — round-trips safely.
All other fields are plain numbers, booleans, or string-keyed objects and are lossless.

TUNABLE: `schemaVersion` = 1 at P2 ship. Bump to 2 at first breaking schema change.

---

## 3. Save Triggers (What and When)

| Trigger | When | Notes |
|---------|------|-------|
| End-of-day | `endOfDay()` returns a `DayReport` | Primary save point; state is fully consistent post-`endOfDay` |
| `visibilitychange` → hidden | Browser tab hidden or window minimized | Covers "close tab" on mobile; fires before `unload` in most browsers |
| Explicit "close truck" UI action | Player taps end-day button | Redundant with end-of-day; belt-and-suspenders |

**NEVER save mid-tick.** `tick()` mutates multiple fields atomically (roast timers, stock,
cash, dayStats). Saving between fields yields an inconsistent snapshot. The save path is
only called from the two triggers above, after `tick()` has fully returned.

---

## 4. Load Path

On `createScene()` (Phaser scene `create()`):

1. Read `localStorage.getItem('dmn_save_v1')`.
2. If null or parse throws: call `createState()` for a fresh game. Show apology toast
   (see §7). Log the error with `console.warn` — never silent wipe.
3. If parsed envelope `schemaVersion` < current: run migration (see §5).
4. Validate minimal sanity:
   - `cash >= 0`
   - `dayNumber >= 1`
   - `roastSlots.length >= 1`
   - `Array.isArray(envelope.sim.gagsSeen)` (must be an array, not `{}` from an
     old/corrupt save that serialized the Set incorrectly)
   - `typeof unitsSoldLifetime === "number" && unitsSoldLifetime >= 0`
   On any failure: same fallback as step 2.
5. Deserialize `sim` back into `SimState`. Restore `meta`.
6. Call `applyOffline(state, elapsedHours)` — see §6.
7. Resume game loop.

---

## 5. Schema Versioning and Migration

Each breaking change bumps `schemaVersion`. A migration table maps version N → N+1:

```typescript
// src/persistence/migrations.ts
type Migrator = (raw: unknown) => SaveEnvelope;
const MIGRATIONS: Record<number, Migrator> = {
  // example: v1 → v2 would add district field introduced in P2
};
```

Migration runs sequentially: v1 → v2 → v3... until current version is reached.
Unknown future fields are dropped (forward-compat: safe to ignore new keys on older builds).
If migration throws at any step: fall back to fresh state + apology toast (never corrupt cash).

TUNABLE: migration chain is empty at P2 ship (only v1 exists). Add entries only on
breaking schema changes.

**Round-trip test (required before P2 ships):** A save/load cycle must pass this
invariant test:

```typescript
// src/persistence/persistence.test.ts  (P2 task — do NOT ship without this)
it("save/load round-trip preserves gagsSeen and unitsSoldLifetime", () => {
  const state = createState(1);
  // Seed some gag data
  state.gagsSeen = new Set(["LL-001", "LL-003"]);
  state.unitsSoldLifetime = 250;

  const saved = serialize(state);          // returns JSON string
  const loaded = deserialize(saved);       // returns SimState

  expect(loaded.gagsSeen).toBeInstanceOf(Set);
  expect(loaded.gagsSeen.has("LL-001")).toBe(true);
  expect(loaded.gagsSeen.has("LL-003")).toBe(true);
  expect(loaded.gagsSeen.size).toBe(2);
  expect(loaded.unitsSoldLifetime).toBe(250);
});
```

This test is a spec requirement, not optional. If implementing persistence without this
test is the plan, that is a blocker — add the test before merging the persistence PR.

---

## 6. Offline Wiring: applyOffline on Load

After load (step 6 in §4):

```
elapsedMs   = Date.now() - envelope.savedAt
elapsedHours = min(elapsedMs / 3_600_000, OFFLINE_CAP_HOURS)
```

Call `applyOffline(state, elapsedHours)`. The existing engine implementation handles
capping and framing correctly (see `engine.ts` lines 382–425).

**F13 fix — offline earnings must NOT blend into dayStats.**

The current `applyOffline` writes `state.dayStats.revenue += actualEarned` (engine.ts
line 412). This is a red-team flag (F13): the day-end report card then shows inflated
`revenue` and `unitsSold=0`, which breaks the unit-economics lesson (the insight line
sees a revenue spike with no sold units, producing a misleading gross margin of 100%).

**Specified fix for P2:**

1. Add `offlineEarned: number` field to `DayStats` (default 0).
2. In `applyOffline`: write to `state.dayStats.offlineEarned += actualEarned` only —
   do NOT add to `dayStats.revenue` or `dayStats.unitsSold`.
3. In `endOfDay`: include `offlineEarned` in the `DayReport` as a separate line item
   (`offlineEarned: number`). Keep `revenue` = on-screen sales only.
4. HUD report card adds one row: "Offline rest earnings: $X.XX" — distinct from the
   trading day line, so the player sees both figures and the margin math stays clean.
5. Net calculation: `net = grossProfit - fixedCosts + offlineEarned` (offline earnings
   are pure cash credit, post-COGS; they do not carry a COGS entry since the stock
   consumed was already costed at its `roastedCostBasisPerLb`).

TUNABLE: whether offline earnings are counted before or after the daily fixed-cost
deduction affects rescue-arc incentives. Current spec: included in net (post-fixed-cost).
Revisit if offline earnings are trivially covering fixed costs (undermines the lesson).

---

## 7. Corruption Handling

If load fails at any step (parse error, schema violation, migration throw):

- Generate fresh `SimState` via `createState()`.
- Show a one-time apology toast: "Couldn't load your save — starting fresh. Sorry for
  the reset." (Warm, not clinical. Not "corrupted save file.")
- Never silently wipe cash. If the player sees their save gone, they get an explanation.
- Log the raw error to `console.warn` for developer debugging.
- Do not offer "download broken save" in UI — out of scope for P2.

**Guarantee:** cash can only be 0 on corruption fallback because `createState()` sets
`STARTING_CASH`. No scenario leaves the player below 0 by load-path mechanics alone.

---

## 8. DARK_PATTERN_GATE §D Re-Check (Mandatory per Escalation Rule)

Offline save/load is a retention-touching mechanic. Gate §D requires re-evaluation of
the full checklist. Questions 1, 3, 8, and 9 are the live surfaces; verdicts follow.

### Q1 — FOMO Test (Cite: A.1)
Can a player miss any content or reward if they don't log in within 24 hours?

**PASS — YES (no content is missable).** Save/load carries all state forward intact.
No content expires. No reward is locked behind a login window. The 24-hour offline-
earnings cap means earnings stop accruing past 24 hours, but that cap is a soft ceiling
on a bonus, not a threat to any content. Nothing disappears.

### Q3 — Decay Test (Cite: A.3)
Do any player-earned stats automatically degrade during offline time?

**PASS — YES (none degrade).** The save envelope carries `SimState` verbatim. Cash,
NPC relationship counters, recipe unlocks, roaster tier, district permits — all persist
unchanged. Roasted stock consumed by `applyOffline` is an explicit, positively framed
resource transaction (the truck made sales while resting), not passive decay. Spoilage
(GDD C2) is separately a player-action mechanic, not offline-punishment.

### Q8 — Loss-Framing Test (Cite: A.8)
When a player returns, does the UI frame offline earnings positively?

**PASS — YES.** The `applyOffline` return event carries message: "Truck rested for
X.Xh. Earned $Y.YY." The HUD report card shows a distinct "Offline rest earnings"
row (positive figure). No UI element shows what the player "could have earned" or
"missed." The F13 fix (§6) ensures the offline line never contaminates the trading-day
gross margin display, which could otherwise accidentally imply the player under-performed.

### Q9 — Offline Soft-Cap Guardrail (Cite: B.2)
Is the offline-earnings rate 20% of peak or less, capped at $100/hr, with 24-hr cutoff?

**DIVERGENCE — OPEN ESCALATION.** Three constants are implemented and enforced:
- `OFFLINE_EARN_RATE_FRACTION = 0.20` (economy.ts) — fraction check: PASS
- `OFFLINE_CAP_DOLLARS_PER_HOUR = 100` (economy.ts) — code is $100/hr
- `OFFLINE_CAP_HOURS = 24` (economy.ts) — 24-hr cutoff: PASS

However: the gate text (DARK_PATTERN_GATE §D, GDD C5) cites "$100/min" as the cap;
the implemented constant is `$100/hr` — 60× stricter. The code is SAFE in direction
(stricter is not a dark pattern), but it diverges from the written spec.

**This is an OPEN owner decision per gate §D.** Do not mark as PASS without owner
ratification of which value ($100/min or $100/hr) is the intended canon. Once ratified,
update both the GDD and this cert, then mark PASS.

**Interim ruling:** implementation proceeds with $100/hr (conservative) until owner
decides. See economy.ts note on `OFFLINE_CAP_DOLLARS_PER_HOUR`.

**Gate result: Q1/Q3/Q8 PASS. Q9 OPEN (safe direction, awaiting owner ratification).**

---

## 9. Open Questions

OPEN: Should a "Save now" debug button be exposed in dev builds for manual testing?
OPEN: Mobile PWA — does `visibilitychange` fire reliably on iOS Safari? (Known bug;
      may need a `pagehide` fallback listener in the Phaser scene setup.)
OPEN: IndexedDB upgrade path: spec the migration path from `localStorage` if save size
      grows (e.g., district history log added in P3). Needs a one-time reader shim.
