# Changelog

All notable changes to Driving Me Nuts are documented here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

**Note:** Pre-1.0 versions (v0.x) are in active development; any feature may change or be removed during prototyping. Versions bump at PR merge; stable releases are announced separately.

## [Unreleased]

### Added — weather wired into demand (GDD C3; the foundation is now a real mechanic)
- The weather calendar (shipped inert as v0.8.1) now **affects demand**: rainy −20% / hot-sunny +15%, multiplied into live demand in `tick()` alongside the weekday factor. The HUD day line shows today's weather **+ a 1-day forecast** (predictable, no FOMO — DARK_PATTERN_GATE-clean); the demand hint + roast-modal previews are weather-aware so they stay truthful.
- **Non-breaking:** all prior tests stayed green — most are supply-bound (a 14h day clears its stock regardless of ±20% velocity), so weather changes *velocity*, not totals, when demand > supply. The §D2 walkthrough numbers assume clear weather (noted in the GDD). 6 new tests; 374 unit + 5 boot green.

### Added — weather foundation (GDD C3; foundation only, NOT wired into demand)
- `WEATHER_FACTOR {clear:1.0, hot_sunny:1.15, rainy:0.80}` + `WEATHER_LABEL` + a **pure, deterministic** `weatherForDay(dayNumber, seed)` (integer hash → ~50/25/25 buckets, no PRNG-stream consumption) + per-save `weatherSeed` (additive-optional persistence, default `WEATHER_DEFAULT_SEED` for legacy saves). **Zero gameplay effect** — weather is not read by the demand curve; this just makes the predictable, forecastable calendar available so the eventual demand-wiring + a forecast UI are a small, safe step (wiring deferred to an attended session per docs/SYSTEMS_BACKLOG.md §1, since it ripples the economy tests). Red-team PASS (inert + additive-safe confirmed). 9 new tests (determinism, distribution, forecast, persistence/crafted-save); 357 unit + 5 boot green.
### Added — auto-sell off-peak upgrade (GDD C4; owner-approved, $1,500)
- One-time **$1,500** upgrade: at end of day, leftover roasted stock is liquidated at **10% off** — AFTER the day's sales and AFTER fulfilling any Derek pre-order (never pre-empts the order). Recognized as same-day revenue, COGS at the roasted cost basis (RT6-1-consistent). Teaches clearance pricing / reducing waste / freeing working capital. **Default-off** — saves without it are unchanged (leftover stock still carries over).
- `endOfDay` P&L computation reordered to run *after* the rescue + auto-sell steps so auto-sold stock is in the day's figures (all 348 prior tests still green — default-off behaviour identical). Upgrades-modal buy row + a day-report "↳ auto-sold leftover" clarifier. Additive-optional persistence (`autoSellEnabled`, no schema bump). 7 new tests; 355 unit + 5 boot green.

### Consolidation — multi-day invariant soak test (no new scope)
- `src/sim/invariant_soak.test.ts`: a deterministic 30-day playthrough (buy/roast/sell/price-sweep/upgrade + a forced rescue crunch) asserting the core invariants hold after **every** day — cash ≥ 0 & finite, no NaN/Infinity anywhere, ledger P&L identity (`net = revenue − cogs − fixed + offline`), `lifetimeEarned` monotonic, balance-sheet identity (`equity = assets − liabilities`, inventories ≥ 0), and rescue-line consistency (debts finite, `rescueMode` matches outstanding lines). Plus a mid-soak save/load round-trip and a pathological all-mispriced run. Safety net for the now-intricate merged economy (ledger + supplier + brand + rescue escalation + preorder-default). Test-only; 350 unit + 5 boot green.

### Added — milestone celebration juice (stacks on Polish & Pedagogy)
- **Celebration overlay** for earned moments — the first achievement of a day and each comeback-tier unlock get a brief, non-blocking banner with a confetti burst (scale-pop in, auto-dismiss). Never gates input, never pauses the sim, no countdown/pressure (DARK_PATTERN_GATE-clean).
- **Respects reduced motion** (from the accessibility wave): static banner, no particle burst, no scale-pop when reduced-motion is on. UI-only — no sim/economy/persistence changes. 348 unit + 5 boot green.

### Added — Polish & Pedagogy (accessibility + in-game learning layer)
- **Settings panel** (⚙ MENU button) consolidating Sound + accessibility toggles + Glossary, replacing the lone mute button.
- **Accessibility:** **Reduced-motion** toggle (gates ambient smoke pulsing, NPC pacing, and the coin-pop float — steady visuals instead) and **colour-blind cues** (the colour-coded margin signal also carries a word — "healthy/tight/low" — per WCAG 1.4.1, never colour alone). Prefs persist to localStorage under their own keys (not the save schema; no schema bump, outside CRIT-1).
- **In-game Glossary** (`src/data/glossary.ts`): plain-language, 13+-pitched definitions of COGS, gross margin, profit-vs-cash, fixed costs, break-even, price/demand, bulk discount, supplier relationship, APR, deferred revenue, debt/credit, permit, and **peanut allergy**. Opt-in (C1 "broccoli" rule — learning is never mandatory). Satisfies the **A2** accuracy disclaimer (jurisdiction/"simplified" qualifier shown atop the glossary) and the **A1** allergy tooltip (serious, respectful, honest-labeling + warm-referral canon — the owner-sourced allergy reviewer remains the separate gate).
- New `src/scenes/prefs.ts` (Phaser-free prefs module, mirrors the audio mute pattern). 8 new tests (prefs persistence + glossary content integrity incl. allergy-seriousness + APR-honesty checks). 347 unit + 5 boot green.

### Added — rescue re-entry escalation (owner-approved 2026-06-07; the RT-1 deferral)
- The rescue arc now **escalates on repeat**. The one-concurrent-crisis gate from RT-1 still holds (a new offer only appears once the prior crisis is fully resolved — no debt-stacking pump), but a *repeat* crisis gets harsher terms: Old Joe's loan fee **5% → 7%**, Derek's pre-order scales **100 lbs/$110 → 200 lbs/$220** (bigger infusion + delivery challenge, ≤ $250 P2 cap). Marta's credit and QuickNut are unchanged (Marta gets a relationship note in dialogue; QuickNut is already the cautionary option). Old Joe's dialogue varies ("I see you're in it again…") — never shaming.
- New `SimState.rescueEntryCount` (additive-optional, no schema bump) tracks paths taken; escalation makes repeat borrowing **costlier, never a pump**.

### Fixed (re-entry red-team, FIX-FIRST)
- **RT-1b (HIGH, cash pump):** defaulting on Derek's pre-order was free money — the upfront cash for undelivered lbs had no mechanical cost (no clawback, no reputation system), so the arc could be farmed for unbounded cash (my escalation would have doubled the rate). Fixed: a short/zero delivery now converts the **unearned cash into a `preorder_default` debt** owed back (gentle — no hard cash-yank, honoring the script's "trust dented, not reversed"). Net wealth from a defaulted order is now ~0. New debt kind threads through summary/HUD/persistence; pump-closure regression-tested.
- **F3 (MED, A2 accuracy):** Old Joe's loan APR was shown ~6× too low (≈20%/yr via a fictional "4 seasons" basis). Now annualized on the real 14-day term (≈130%/yr at 5%, ≈183% at 7%) — the same simple-APR basis as QuickNut's 391%. Still clearly the cheaper friend-loan; just truthful.
- 13 new/expanded tests; 336 unit + 5 boot green.

### Consolidation (wave 7, PR #9 — stacks on PR #8; no new scope)
- **Cross-system integration test** (`src/sim/wave7_integration.test.ts`): a 7-day trading loop exercising buy→roast→sell→close with a mid-week save/load round-trip, asserting ledger P&L identity, weekly-recap timing, supplier leveling, achievement unlocks, and RT6-1 no-phantom-equity all compose end-to-end.
- **RISK_REGISTER standing-trigger review** for waves 5–6 (triggers #4 data + #6/A4 dark-pattern): Tier A retained (local-only, no PII, no egress); dark-pattern gate passed for recap/achievements/campaign; A2 accuracy hardened by RT6-1. SME 93-claim walk remains owner-gated.
- **Cleanup:** documented the intentional `cashSpentOnProduction` standard-cost simplification (RT6-1 follow-up; reconciliation deferred to the P2 dual-ledger per BOOKKEEPING.md §4). Dead-code/symbol audit clean; tsc strict clean.
- 326 unit + 5 boot green.

### Added (Goals & Mastery wave, PR #8 — stacks on PR #7)
- **Achievements (GDD F win-states, P1 subset):** 10 milestones (first sale, $1k/$10k/$100k lifetime, full menu, brand campaign, lore half/master, comeback master, survived-debt). Evaluated at day-close; one-time unlock toasts; **already-earned milestones derived silently on load** (no toast burst). Achievements grant **no mechanical bonus** — markers only, kept off the dark-pattern surface.
- **Goals panel (GOALS button):** achievements checklist + collection view (Legume Lore X/40 progress bar, comeback tiers unlocked, supplier level/discount + next-level requirement).
- **Supplier relationship (GDD C4):** loyalty discount earned by cumulative lbs ordered (Level 1/2/3 at 500/2,000/6,000 lbs → −3%/−8%/−15% on raw orders). Stacks multiplicatively with the bulk discount (never reaches zero); shown live in the supply modal with an accurate cost preview; level-up toast. Teaches working capital + repeat-business terms.
- Additive-optional persistence (no schema bump; v4 and earlier saves load with supplier 0 + achievements re-derived). Sanity-checked + revived defensively.

### Fixed (wave-6 red-team, FIX-FIRST)
- **RT6-1 (MED, educational-correctness — phantom equity):** discounts (bulk + supplier) were valued into balance-sheet equity at purchase instead of flowing to COGS. Introduced `rawCostBasisPerLb` (weighted-avg price actually paid); raw inventory is now valued at cost paid and the discount carries through the roast into COGS at sale — buying inventory is equity-neutral, and the discount correctly shows as lower COGS / higher margin. Default (no-discount) numbers unchanged.
- **RT6-3 (LOW):** `deserialize` now dedupes `achievementsUnlocked`.
- **RT6-4 (LOW):** Goals-panel rows advance by measured height so a wrapped locked-achievement line can't overlap the CLOSE button.
- **RT6-5 (LOW):** removed an unused `supplier_level_up` event-kind (level-ups ride on the `supply_purchased` event detail).
- RT6-2 (supplier "$1k (time)" → cumulative-lbs model) accepted + documented in the GDD live-source note (not a silent change).
- 24 new tests total; 324 unit + 5 boot green; verify gate passes.

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
