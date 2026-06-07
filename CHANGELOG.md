# Changelog

All notable changes to Driving Me Nuts are documented here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

**Note:** Pre-1.0 versions (v0.x) are in active development; any feature may change or be removed during prototyping. Versions bump at PR merge; stable releases are announced separately.

## [Unreleased]

### Added
- Roaster/queue capital-investment mechanics (upgrade progression for throughput).
- Weekday demand variation (Monday spike, mid-week dip, Friday premium — teaching business cyclicality).
- Idea bank system (IB-001 Gusto character concept).

### In Progress
- Rescue-arc full UI flow (player cash-flow crisis mechanic).

## [v0.2.0-pre] — Wave 4 + PR #4 unreleased

### Added
- **Persistence v1:** Browser localStorage save/load with schema versioning. Game state auto-saved on exit; loads on boot with corruption-recovery UX.
- **Safe storage:** Fallback corruption handling (safeStorage pool pattern) per PERSISTENCE.md gate review.
- **Recipe + batch selection:** Mid-tier lore unlocks tied to recipe discovery; blended demand pool wired into tick simulation.
- **Legsy character:** Mascot placeholder + title screen integration.
- **First-run tutorial:** Guided onboarding (shop visit, first roast, sales reporting).
- **Synthesized audio:** Background music + event toasts (mute toggle in settings).
- **Upgrades + day factors:** Roaster capacity/speed investments; daily demand baseline tuning.

### Fixed
- safeStorage fallback for corrupted localStorage.
- Blended-pool recipe demand wired into deterministic tick (schema v2 update).
- Deserialization validation on load.
- Canon re-tiers + doc integrity (docs/RISK_REGISTER.md aligned with code).

### Governance
- Standing-trigger review logged (persistence v1 does not trigger CRIT-1 re-tier; Tier A retained).

## [v0.1.1] — Wave 2, PR #3

### Added
- **Legume Lore gag events:** 40 deterministic event variants (triggered by sim thresholds), speech-bubble toasts, lore counter (X/6).
- **CI verify gate:** `tsc --noEmit && vitest run && vite build` pre-commit check.
- **Wave-2 systems specs:** Persistence architecture (gate-§D-checked), recipe/batch UI layout, P2 districts model outline.
- **Educator guide seed:** Privacy-explicit draft (no telemetry, no educator export at P1).
- **Content:** Rescue-arc script (3 paths + diegetic payday warning), sound-design seed doc.
- **Assets:** ART_BIBLE iteration (Legsy ratified as primary mascot, Vida as secondary); sprite spec + mechanic palette.

### Fixed
- APR math rebuild (credit-cost curve re-derived from real interest tables).
- Rescue trigger threshold re-gated to canonical $25 (owner ruling 2026-06-07: moved to P1 EXIT).
- Educator-guide build-status honesty (removed fabricated feature list).
- Fleet patterns doc de-fabrication (removed speculative roadmap claims).
- Lore counter validation (6 event slots, deterministic pick).
- District demand curves (valid market-dynamics model, no fantasy numbers).

### Governance
- Owner rulings 2026-06-07: offline cap ($100/hr) ratified, AI-art disclosure stance (DISCLOSE OPENLY) locked in.

## [v0.1.0] — P1 Idle-Core Slice, PR #2

### Added
- **Deterministic idle simulation:** Game-loop engine (tick, day cycle, offline earnings cap at $100/hr).
- **Economy single-source:** `src/data/economy.ts` centralizes all prices, rates, multipliers; all UI derives from this file.
- **P1 playable slice:** Roast → Price → Sell → Day Report flow. GameScene + HUD integration.
- **Dark-pattern compliance gate:** Mechanic blacklist ratified (no FOMO timers, no streak punishment, no hard offline-cliff framing).
- **SME review pack:** 93 business-concept claims documented for accountant review (re-gated to P1 EXIT per owner ruling 2026-06-07).
- **Allergy mechanic canon:** Honest labeling + warm referral model (allergic customers redirected, not refused).
- **UI wireframes + integration test:** Day-report wired to sim core; edge-case tests for sim boundaries.
- **Sprite spec + ART_BIBLE:** Palette constraints, named character candidates, animation frame budget.
- **Phaser 3 + TypeScript + Vite scaffold:** Production-ready build pipeline with HMR dev server.
- **Vitest harness:** Unit tests for pure-logic sim layer (`src/sim/` Phaser-free).

### Fixed
- COGS-at-sale margin (cost of goods sold now applied on sale, not purchase).
- Interior profit peak (day-end summary now accurate for cash-flow projection).
- 60x timescale (1 in-game minute = 60ms wall-clock for responsive idle feel).
- End-of-day rescue trigger (applies only when cash goes negative, paired with credit-offer).
- Compliance pass: allergy canon in CONCEPT.md, rescue threshold $50, jurisdiction qualifiers ("varies by location"), license note (proprietary/all-rights-reserved, owner unnamed).

### Governance
- **P0 exit gate completed:** Engine PoC (Phaser 3) passed verification; cut-list locked (3 zones: Market Square, Rooftop, Residential; other 4 districts deferred); gag-variant cap at 40 Legume Lore entries (v0.x); mechanic blacklist ratified.
- **Risk register:** Standing review #1 (P1 exit gate) prepared; SME + allergy reviews re-gated to P1 EXIT; P1 build proceeds on stylized numbers.
- **License doctrine:** Proprietary / all-rights-reserved, owner name deliberately omitted (canon ruling 2026-06-07).

## [Initial Commit]

- Project scaffold + repo structure.
