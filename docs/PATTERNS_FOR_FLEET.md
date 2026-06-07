# Reusable Patterns from Driving Me Nuts

This doc captures architectural and process patterns proved in Driving Me Nuts that are portable to sibling projects (TradeGame, DrivingMeNuts—all fleet edugames). Written for the Governor to broadcast and for agents to adopt.

---

## Pattern 1: Phaser-Free Deterministic Sim Core

### Problem
Educational games need fast iteration, deep testing, and confidence in economy mechanics. Phaser (the game engine) is tied to rendering and browser events—it's hard to:
- Unit-test game logic in isolation (requires browser environment or heavy mocking).
- Benchmark economy calculations (Phaser overhead masks real performance).
- Reuse logic across platforms (tight coupling to engine).
- Red-team mechanics without running the full game (no CLI test harness).

### Pattern: Sim Lives Separately

**Real DMN repo layout:**
```
src/data/        ← All economy constants (single source of truth)
  economy.ts     ← Prices, demand curve, offline cap, fixed costs, etc.
  lore.ts        ← Legume Lore dialogue set

src/sim/         ← Pure TypeScript, Phaser-free, fully unit-testable
  types.ts       ← SimState, DayReport, SimEvent interfaces
  engine.ts      ← tick(), endOfDay(), buyRaw(), startRoast(), setPrice()
  engine.test.ts
  edge_cases.test.ts
  integration.test.ts
  lore.test.ts
  smoke.test.ts

src/scenes/      ← Phaser-bound UI layer
  GameScene.ts   ← Calls sim, renders results
  BootScene.ts   ← Asset load / scene handoff
```

**Purity note:** `engine.ts` mutates `SimState` in place behind a small API
(`tick`, `endOfDay`, etc.). The contract is **determinism** (same inputs → same output)
and **Phaser-free** (no engine imports), not functional purity. Tests verify correctness
by inspecting the state and events after each call, not by comparing return values
from pure functions.

### Why It Works
1. **Testable:** `vitest` can run `import { tick } from '../sim/engine'` without a browser. Tests are instant, deterministic, can verify formulas and edge cases in isolation.
2. **Single source of truth:** All economy constants live in `src/data/economy.ts`. One edit fixes all references; no spreadsheet-to-code sync drift.
3. **Red-team safe:** Auditors can read one file (`economy.ts`) to verify all prices, margins, and demand curves. No hidden constants in UI code.
4. **Reusable:** TradeGame can import `src/sim/engine.ts` logic if both games share "set price, get demand curve" semantics. No Phaser baggage.
5. **Swarm-safe:** One agent can test demand formulas (`npm run test`) while another agent builds UI in `GameScene.ts` without blocking or colliding.

### Adoption Checklist
- [ ] Engine stays out of `/sim/` directory (no Phaser imports).
- [ ] All game constants in one file (`src/data/economy.ts` or equiv).
- [ ] State mutations are pure functions: `applyTickToState(state, deltaTime)` returns new state, no side effects.
- [ ] Tests run in Node (no browser required): `npm run test`.
- [ ] Commit message cites src/sim/ when the simulation changes; UI changes are separate.

---

## Pattern 2: DARK_PATTERN_GATE as Enforceable Checklist

### Problem
Edugames for 13+ audiences need to avoid predatory mechanics (FOMO timers, streak punishments, dark nudges). But when iterate, it's easy to drift: "Just a small offline-earnings cliff" or "streak counter to encourage daily logins." Drift is silent; it ships before anyone notices.

### Pattern: Explicit Blacklist in Risk Register
From RISK_REGISTER.md:
```
| A4 | Idle-retention dark-pattern drift | Mechanic blacklist (locked in P0): 
   no FOMO timers, no streak punishment, no hard offline-earnings cliff 
   framing as loss, no ads without Owner Decision. 
   P4 and P5 exit criteria: dark-pattern check. |
```

The blacklist is:
- **No FOMO timers:** Event passes at 11:59 pm (player fear missing deadline).
- **No streaks:** "200-day streak broken" or "streak reset on missed day."
- **No cliff framing:** Offline earnings cap is phrased as "truck rests after 24 hrs," not "earnings lost if you take a break."
- **No ads:** None, period, unless explicit owner decision (which gates it in the register too).

### Why It Works
1. **Atomic:** One checklist, locked in RISK_REGISTER, visible to all agents. No hidden design debt.
2. **Red-teamable:** A reviewer can scan code for timer-based unlocks or consequence framing. If found, it's a blocker.
3. **Auditable:** At P4 and P5, a dark-pattern pass is a *required* gate, not optional. It's on the critical path.
4. **Owner-backed:** Owner decides *once* (P0) what's on/off the blacklist; all subsequent changes are explicit decisions, not drift.

### Adoption Checklist
- [ ] RISK_REGISTER has a "dark patterns" row with explicit mechanics blacklist.
- [ ] Blacklist is locked in P0 (owner signs off).
- [ ] Code-search automation (e.g., pre-commit hook or linter rule) flags patterns on the blacklist if they appear in UI or sim code.
- [ ] Dark-pattern audit is a named gate at P4 and P5 (not skippable).
- [ ] Any new mechanic that *might* be dark (e.g., daily login bonus) goes to owner as an explicit decision before coding.

---

## Pattern 3: Compliance → QA → Red-Team → Fix Wave Cadence

### Problem
Educational games must teach *correct* content and avoid harmful edge cases. Testing in sequence (design review, QA, then red-team) is slow. Parallel swarms are powerful but risk repeating the same mistakes.

### Pattern: Specialist Agents in Sequence, with Overlaps
```
Wave 1: Design (core loop scripted & tested in isolation)
  ↓ (Design agents ship a PR with new mechanic)
  
Wave 2: Compliance (privacy, allergy, accuracy red-team in parallel)
  - Privacy: Is any data collected? Is consent modeled?
  - Allergy: Is the tone insensitive? Does mechanic model safe practice?
  - Accuracy: Does BUSINESS_CURRICULUM.md back the numbers?
  ↓ (Compliance agents request fixes, link to RISK_REGISTER.md issues)
  
Wave 3: QA (gameplay balance, edge cases)
  - Does extreme pricing break demand curve?
  - Can player go negative cash? (Should trigger rescue arc, not game-over.)
  - If two customers buy simultaneously, is inventory deducted twice?
  ↓ (QA agents open issues tagged "P1-fix" or "P2-defer")
  
Wave 4: Red-Team (human testers + accessibility check)
  - Play through as a 13-year-old; does tone land?
  - Is the UI colorblind-accessible?
  - Does the game feel fair or punishing?
  ↓ (Red-team agents write writeups; owner makes calls)
  
Owner Gate: Owner reviews RISK_REGISTER, compliance findings, QA issues.
  - Approve merge & proceed to next phase, or
  - Request fixes & loop back to Wave 1.
```

### Why It Works
1. **Parallel efficiency:** Waves 2 and 3 can overlap (compliance checks design while QA plays the mechanic).
2. **Specialist focus:** Compliance agents know COPPA/allergy law; QA agents know game balance; red-teamers know accessibility and tone. No person is expert in all.
3. **Clear handoff:** Each wave is a PR or issue thread; findings are linked to RISK_REGISTER IDs. No ambiguity about what's left to fix.
4. **Prevents drift:** If a fix request is skipped, it's *logged* (in RISK_REGISTER), not forgotten.
5. **Repeatable:** Every phase (P1, P2, etc.) runs the same waves. Process becomes familiar.

### Adoption Checklist
- [ ] RISK_REGISTER.md is the handoff doc (all findings tied to a risk ID or issue).
- [ ] Compliance agents review *before* QA (avoids QA testing broken mechanics).
- [ ] QA and red-team *overlap* in schedule (design team ships PR on Mon, QA plays on Tue, red-team joins Wed).
- [ ] Owner gate is the last step; owners don't code fixes (agents do, per owner decision).
- [ ] Slack/Discord channel #dmn-wave or similar tracks which agents are in which wave.

---

## Pattern 4: Teaching-Integrity Red-Teaming via Mislabeled-Margin Bug Catches

### Problem
Educational games can teach *wrong lessons* by accident. A mechanic that *looks* sensible can hide a math error or an unintended dominant strategy that makes learning obsolete.

**Example:** If demand drops from 20 to 15 units when price rises $0.80, a player might discover "actually, just make junk and undercut forever" — the game accidentally teaches a bad strategy because the margin calculation is mislabeled or the demand curve is wrong.

### Pattern: Testable Teaching Assertions

Write tests that verify *learning outcomes*, not just mechanics:

```typescript
describe('Demand Curve Teaches Price Elasticity', () => {
  it('raising price above $1.90 decreases profit despite margin', () => {
    // At $1.90: profit peak. Above $1.90, profit falls even though margin rises.
    // This teaches: margin ≠ profit; you optimize *revenue × margin*, not margin alone.
    const demandAt190 = demandLbsPerHour(1.90);
    const profitAt190 = (1.90 - COGS) * demandAt190;
    
    const demandAt200 = demandLbsPerHour(2.00);
    const profitAt200 = (2.00 - COGS) * demandAt200;
    
    expect(profitAt200).toBeLessThan(profitAt190);
  });
});
```

**Real red-team catches from the DMN build** (not playtest anecdotes — these were
found by red-team review of the code and spec before any player testing):

1. **Mislabeled report-card margin:** An early version of the end-of-day report
   computed gross margin as COGS-at-production divided by sales revenue, producing a
   misleadingly low figure when production outpaced same-day sales. The correct
   formula is COGS-of-units-SOLD (cost basis recognized at sale, not production).
   Red-team caught this from the spec — the distinction is now explicit in `engine.ts`
   comments and tested in `engine.test.ts`.

2. **Dominant max-price strategy:** With `DEMAND_SLOPE = 6` (the first draft value),
   the profit curve peaked at $2.57/lb — above the $2.50 UI price cap. This made "set
   price to max, idle" the dominant strategy: no pricing decision was needed, defeating
   the lesson. Red-team identified the problem by computing `dπ/dp = 0`. Slope was
   retuned to `DEMAND_SLOPE = 10`, which places the profit peak at $1.90 — strictly
   interior to the slider range, forcing a real optimization choice.

Neither catch came from a "$500→$2k roaster" anecdote or player playthrough; both were
found analytically by reviewing the demand formula against the GDD's teaching intent.
That is the pattern: red-team tests the *economics*, not just the mechanics.

### Why It Works
1. **Automated:** Tests can verify "profit peaks at $X" or "raising price by $0.50 always decreases daily profit by >$5" without human playtest.
2. **Catches edge cases:** A formula works at $1.50 but breaks at $0.75 or $2.50. Tests find it.
3. **Documentation:** The test *is* the spec: "This is what students should learn." If the test fails, the lesson is broken.
4. **Red-team focus:** Human testers play to find *wrong lessons* (dominant strategies, nonsensical mechanics), not just bugs. Automated tests handle math verification.

### Adoption Checklist
- [ ] For each "learning outcome" in BUSINESS_CURRICULUM.md, write a corresponding test.
- [ ] Test names include "Teaches [Concept]" (e.g., `it('Teaches break-even logic by clamping demand', ...)`).
- [ ] Red-team writeup includes a section: "Did the game accidentally teach a *wrong* lesson?" (e.g., undercutting as dominant strategy).
- [ ] If red-team finds a wrong lesson, it's a blocker to ship. Design change required, then re-test.
- [ ] Keep a "teaching bugs" doc (separate from regular bugs) to track lessons that nearly broke.

---

## Pattern 5: Consensus-Building via Shared CLAUDE.md

### Problem
Fleet projects (DMN, TradeGame, future games) have overlapping concerns (privacy, business accuracy, dark patterns, accessibility). Without a shared playbook, each project reinvents the wheel—or inconsistently applies rules.

### Pattern: Repo-Specific CLAUDE.md References Unified Doctrine
Each repo has:
```
# CLAUDE.md — ProjectName

Repo-specifics only; unified doctrine cascades from:
  ~/CLAUDE.md (working agreement)
  ~/agent-corps/GOVERNANCE_ROLLOUT_PLAN.md (governance tiers)
  ~/agent-corps/CLAUDE_GLOBAL.md (canon practices)

## What this repo is
[1-sentence elevator pitch]

## Canon (do not drift)
[3–5 non-negotiable facts about the game/project]

## Governance
[Tier assignment + tier-specific constraints]

## Standing Rules
[Repo-specific enforcement + tools]
```

TradeGame can adopt the same CLAUDE.md template, ref same tier, same RISK_REGISTER columns.

### Why It Works
1. **Consistency:** All fleet projects agree on "no dark patterns," "privacy-first," "teaching integrity."
2. **Onboarding:** A new agent reads one CLAUDE.md template; they understand this repo's contract immediately.
3. **Escalation:** If a project wants to deviate (e.g., "can we add ads?"), it's explicit (new CLAUDE.md line) and owner-approves, not silent drift.
4. **Reuse:** Common patterns (DARK_PATTERN_GATE, RISK_REGISTER, SME review) are names agents recognize across all fleet projects.

### Adoption Checklist
- [ ] Each repo has a CLAUDE.md at the root.
- [ ] CLAUDE.md opens with "Repo-specifics only; unified doctrine cascades from ~/CLAUDE.md + ~/agent-corps/…"
- [ ] Canon section lists 3–5 non-negotiable facts (e.g., "The truck sells roasted peanuts" for DMN).
- [ ] Governance section states the tier (A, A+B, B, etc.) per GOVERNANCE_ROLLOUT_PLAN.md.
- [ ] Standing Rules section includes tools + repo-specific build/lint commands.
- [ ] Owner reviews CLAUDE.md at repo bootstrap; any deviations from unified doctrine are logged as owner decisions.

---

## Summary: Portable Checklist

| Pattern | Key Artifact | Where It Appears | Adoption Ease |
|---------|---|---|---|
| 1. Phaser-Free Sim Core | `src/sim/` directory + `src/data/economy.ts` | Codebase | High — copy structure from DMN |
| 2. DARK_PATTERN_GATE | Risk Register row + pre-commit linter rule | Risk docs + tooling | Medium — needs linter setup |
| 3. Compliance → QA → Red-Team → Fix Waves | Phase gates + swarm task backlog | Process + GitHub project | Medium — requires discipline |
| 4. Teaching-Integrity Red-Teaming | Test file: `*.teaching.test.ts` | Test suite | High — write tests from CURRICULUM |
| 5. Consensus CLAUDE.md | Repo root `CLAUDE.md` | Governance docs | High — template-based |

All patterns are **opt-in per project**; adopt what fits. The unified doctrine (`~/CLAUDE.md`, governance tier, RISK_REGISTER format) is the north star.
