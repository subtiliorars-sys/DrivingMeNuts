# Changelog

All notable changes to Driving Me Nuts are documented here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

**Note:** Pre-1.0 versions (v0.x) are in active development; any feature may change or be removed during prototyping. Versions bump at PR merge; stable releases are announced separately.

## [Unreleased]

### Added (Goals & Mastery wave, PR #8 — stacks on PR #7)
- **Achievements (GDD F win-states, P1 subset):** 10 milestones (first sale, $1k/$10k/$100k lifetime, full menu, brand campaign, lore half/master, comeback master, survived-debt). Evaluated at day-close; one-time unlock toasts; **already-earned milestones derived silently on load** (no toast burst). Achievements grant **no mechanical bonus** — markers only, kept off the dark-pattern surface.
- **Goals panel (GOALS button):** achievements checklist + collection view (Legume Lore X/40 progress bar, comeback tiers unlocked, supplier level/discount + next-level requirement).
- **Supplier relationship (GDD C4):** loyalty discount earned by cumulative lbs ordered (Level 1/2/3 at 500/2,000/6,000 lbs → −3%/−8%/−15% on raw orders). Stacks multiplicatively with the bulk discount (never reaches zero); shown live in the supply modal with an accurate cost preview; level-up toast. Teaches working capital + repeat-business terms.
- Additive-optional persistence (no schema bump; v4 and earlier saves load with supplier 0 + achievements re-derived). Sanity-checked + revived defensively. 16 new tests (318 unit + 5 boot green).

### Added (ledger/lore wave, PR #7)
- **Ledger v1 (schema v4):** per-day P&L rows (revenue/COGS/fixed/net + debt-service + cash) ring-capped at 30 days; "BOOKS" panel with live balance sheet (assets = liabilities + equity; inventory at cost; preorder cash as deferred revenue) and last-7-day table. Teaching through-line: profit ≠ cash — debt payments shown as cash-out, never as expense.
- **Weekly recap:** every 7th day's report card adds factual week totals (revenue, net, margin, best day). No streak framing (DARK_PATTERN_GATE-checked).
- **Comeback Lines (GDD B4):** Nut Facts thresholds at 10/20/30/40 unique lore entries unlock owner comeback tiers (15 hand-written lines, sigh → dad-joke → scholar → philosopher); gag bubbles show earned replies; one-time unlock toasts.
- **"Legumes. Not Nuts." brand campaign (GDD B4):** unlocks at 25 unique lore entries; one-time $250 purchase; permanent +5% price tolerance (demand base-price shift, optimum-price preview updates). No timer/expiry — earned unlock waits forever.
- **Rescue aftermath beats:** one-time post-resolution dialogue per path (Old Joe/Marta/Derek/QuickNut) reinforcing each lesson; fires after the report card, before any new offer. Closure only — re-entry escalation remains owner-gated (RT-1).
- **Docs:** `docs/BOOKKEEPING.md` (as-built + P2 dual-ledger seed).

### Persistence
- Schema v3→v4 migration: empty ledger (honest default), `comebackTier` derived from collected lore, campaign/aftermath defaults. Crafted-save hardening: non-finite ledger numbers, invalid tiers, bad types rejected; oversized ledgers capped; unknown aftermath paths dropped. Import/autosave regression-tested (26 new tests; 300 unit + 5 boot green).

## [v0.3.0] — Wave 4, PRs #5/#6 (merged to main 2026-06-07)

### Added
- Roaster/queue capital-investment mechanics (upgrade progression for throughput).
- Weekday demand variation (Monday spike, mid-week dip, Friday premium — teaching business cyclicality).
- Idea bank system (IB-001 Gusto character concept).
- **Rescue-arc UI v1:** trigger → Old Joe modal → 4 paths + decline (loan / Marta's credit / Derek's preorder / QuickNut payday with cautionary APR math), debts persisted (schema v3), end-of-day repayment/rollover/extension processing, debt summary on the report card.
- **Periodic autosave:** save on every `batch_ready` event — closes the crash-loss window between roast completion and end-of-day save.
- **Save export/import:** local file download/upload (zero-server, CRIT-1 compliant).
- **Day-summary sparkline:** last-14-days net history (local only).
- **Optimum-price preview** per recipe in the roast modal.

### Fixed (wave-4 red-team, FIX-FIRST)
- **RT-1 (HIGH, exploit):** rescue offer no longer re-fires while a rescue line is active — closed an infinite loan-stacking cash pump (repeat-crisis escalation per script §Re-Entry deferred to a later wave).
- **RT-2 (HIGH, crash):** importing a save with a different queue-slot count than the live scene crashed `updateHUD` (black screen); slot UI now reconciles via `syncSlotUI()`.
- **RT-3 (MED, data loss):** import overwrote the existing save irrecoverably; the previous save is now preserved at `IMPORT_BACKUP_KEY` before overwrite.
- **RT-4 (MED, validation):** save sanity checks hardened — null rescue-debt entries no longer throw raw TypeErrors, and non-finite debt/preorder day numbers and `1e999`/Infinity preorder quantities (a never-expiring obligation that would silently eat all roasted stock every day) are rejected.

### Housekeeping
- Removed stale `phaser_probe*` excludes from tsconfig/vitest configs (spike leftovers); dead `shutdown()` removed in favor of Phaser's SHUTDOWN event.

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
