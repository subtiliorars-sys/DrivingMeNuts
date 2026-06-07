# Risk Register — Driving Me Nuts

> **Single source of truth for project risks.** Re-read at every phase gate. Owner Decisions are logged here; agents do not resolve them unilaterally.

| ID | Risk | L | I | Mitigation | Owner Decision? |
|---|---|---|---|---|---|
| **CRIT-1** | **Player data / child privacy (COPPA, GDPR-K, student-privacy law):** The roadmap's educator export (play-session transcripts), any leaderboard, ads, or analytics all collect data from likely-minors. Even "anonymous" telemetry may be regulated when the audience is 13+. | H | H | **NO** analytics, ads, leaderboards, or educator export until a privacy design review is complete. The moment ANY player data is collected, re-tier repo governance to A+B per CLAUDE.md tripwire. Each such feature is an explicit Owner Decision — none ship without one. The leaderboard concept in GDD G3 is a cut-list candidate until this is resolved. | Y — owner must approve any data-touching feature individually before implementation starts |
| **A1** | **Peanut allergy content insensitivity**: Comedy game about peanuts lands poorly with allergy community; tone-deaf jokes create PR backlash or exclude vulnerable players. | H | H | **Concrete rules:** (1) Zero allergy jokes ever; never punch down at allergic players. (2) In-game allergy mechanic: the truck is a peanut operation — everything contacts peanuts. The model is **honest labeling + warm referral**: the owner is upfront that no item on the truck is allergen-safe; they respectfully direct allergic customers to a nearby allergen-free cart, earning reputation and trust. This is NOT a refusal to serve — it is accurate information and a helpful redirect. (3) The allergy mechanic design is reviewed by an allergy-aware reviewer on substance, not just dialogue tone — cross-contamination framing, "peanut-free from a peanut-roasting truck" implication, and any service-refusal framing are all in scope. **Owner sources this reviewer.** This review **blocks first public content (P0→P1 gate).** (4) Glossary term: "Peanut allergy" gets a serious, respectful tooltip (severity, cross-contamination). (5) Public FAQ: "Is this insensitive to allergies?" answered plainly. | Y — owner confirms tone lock and sources allergy-aware reviewer before P1 ship |
| **A1-sub** | **Allergy mechanic models unsafe or discriminatory practice**: Selling "peanut-free" items from a peanut-roasting truck implies cross-contamination is acceptable. Blanket refusal of service to allergic customers has discrimination optics. | M | H | The canonical in-game model is **honest labeling + warm referral** (see A1 mitigation). The mechanic must be designed and reviewed on this basis. The allergy-aware reviewer (owner-sourced) reviews the **mechanic design**, not just surface dialogue. This check **blocks first public content.** | Y — mechanic design must be approved before any allergy NPC is coded |
| **A2** | **Business accuracy failure**: Game teaches wrong small-business info (e.g., permits don't work that way, margins are fantasy); players learn misconceptions; educator interest dies. | H | H | **"Simplified but never wrong" rule.** (1) **Single source of truth:** docs/BUSINESS_CURRICULUM.md owns all real-world economy numbers. GDD in-game values are stylized derivatives and must either cite BUSINESS_CURRICULUM.md or be explicitly marked "stylized." Any claim about real-world fees/laws must carry the qualifier: *"varies by jurisdiction — simplified."* (2) SME review: owner hires one small-business accountant (2–4 hours) for mechanics design review. **Owner ruling 2026-06-07: P1 build proceeds in parallel with stylized numbers; SME review re-gated to block P1 EXIT (owner review of the slice), not P1 start.** Owner sources the SME. (3) Jurisdiction-generic language: "your local permit fee" instead of hard numbers, so it stays future-proof. (4) In-game disclaimer: "This game is simplified; real permits vary by location. Consult your local SBA office." (5) Educator guide: docs/EDUCATOR_GUIDE.md explains simplifications and where to send students for real rules. | Y — owner hires SME before P0 exit; owner approves all hard numbers in curriculum |
| **A3** | **Scope creep — two full genres + curriculum**: RPG + idle + learning outcomes is a lot for solo dev on a hobby project. Feature bloat delays launch, kills motivation. | H | M | (1) Idle core first, RPG content gated: ship P1 (roasting loop) as playable slice before adding truck. (2) **Named cut-list (locked in P0):** pre-identify surplus districts — the GDD lists 7; the CONCEPT scope guard is 3–4 zones at launch. Cut-list candidates: **Waterfront Park**, **Downtown Historic**, and **Stadium District** are post-launch. Gag variants: cap hand-written Legume Lore entries at **30–50** until a procedural-splice system is designed; the GDD's "100+" target is a post-launch goal contingent on that system decision. (3) Curriculum is optional path, not mandatory gatekeep. (4) Bursty cadence + swarm delegation: design docs and art go to agent swarms; owner codes core loops only. (5) Milestone check at end of P1: owner assesses motivation before committing to P2. | Y — owner picks final cut-list and gag-variant cap before P0 end |
| **A4** | **Idle-retention dark-pattern drift**: Offline-earnings caps, streak meters, prestige multipliers can drift into FOMO / retention pressure, directly contradicting the "respect the player's time" design pillar. A FOMO-laden 13+ edu game is a reputational kill-shot. | M | H | **Mechanic blacklist (locked in P0):** no FOMO timers, no streak punishment, no hard offline-earnings cliff framing as loss, no ads without an explicit Owner Decision. Offline cap is a *soft* design choice, not a punishment mechanic. P4 and P5 exit criteria each include a **dark-pattern check** (owner or delegated reviewer scans for FOMO hooks before phase advances). | Y — owner ratifies blacklist in P0; dark-pattern check is a hard gate at P4 and P5 |
| **B1** | **Pixel-art asset volume**: Hand-drawn 32×32 sprites for 12+ NPCs, 4 zones, seasonal overlays = 200+ unique frames. Asset pipeline bottleneck. | H | M | (1) Art Bible locks sprite spec upfront. (2) Procedural/kit-based art: tile-based backgrounds, base sprite kit + swaps. Reduces bespoke art 30–40%. (3) Swarm delegation: agent creates initial sprite batches from spec; owner curates. (4) Aseprite + export pipeline: if free tools slow animation, allocate one swarm task to build a Python sprite-sheet exporter. (5) P2 gate: ship with placeholder art if needed; full art pass in P4. | Y — owner approves art-kit approach in P0 |
| **B2** | **Engine choice regret**: Pick wrong engine (too slow for idle loop, poor web export, monetization hooks missing); rewrite later. Sunk cost. | M | H | (1) Vertical-slice PoC before P0 exit in top-2 candidate engines (Phaser + Godot web export). Test: idle-task progress, NPC dialogue trigger, price input. (2) Evaluation criteria locked: responsiveness, build size, deploy speed, TypeScript ease, monetization readiness. (3) Godot fallback plan ready. (4) docs/ENGINE_CHOICE.md explains final decision; owner signs off. | Y — owner approves engine after PoC test |
| **B3** | **Trademark/name collision**: "Driving Me Nuts" conflicts with existing IP; cease-and-desist risk. | M | H | (1) **USPTO TESS search is free and instant** — run it now, before P1 code. A professional attorney clearance search runs ~$300–2,000 if the owner wants full assurance. (2) Google + YouTube search: ensure no major existing game or brand. (3) Name fallback ready: "Roasted" or "The Nut Truck." (4) **License doctrine conflict:** the CLAUDE.md repo note says "MIT license" but the canonical doctrine for all repos is proprietary/all-rights-reserved. This conflict is escalated to the owner as an open Owner Decision — do not assume MIT is correct. | Y — owner runs TESS search in P0 or commits to risk acceptance; owner resolves license doctrine conflict |
| **B4** | **Motivation/cadence on solo hobby project**: Without structure, work stalls mid-phase. Burnout or scope creep. | M | M | (1) Phase gates as commitment points: owner signs off on exit criteria before advancing. (2) Swarm task backlog: discrete, time-boxed swarm work. (3) **Phase-progress review at each phase gate** (not on calendar dates — the roadmap is intentionally dateless). (4) "Fun first" rule: if a phase stops being fun, pause and redesign. (5) Celebrate milestones: P1 gets a write-up; P2 deploy gets a teaser release. | Y — owner commits to phase-gate reviews |
| **B5** | **Public-repo leak of HQ content (repo channel)**: Confidential design details (business math, full curriculum, sensitive NPC dialogue) accidentally pushed to DrivingMeNuts---Preview. | M | M | (1) Mirror rule: design docs (GDD, ART_BIBLE, CURRICULUM, RISK_REGISTER) stay HQ-only. Preview gets **teaser summary + screenshots only — no design-doc dumps, no sanitized GDD.** (2) **Pre-publish audit:** before any Preview push, verify the changeset against an allowlist of public files (README, teaser media). The docs/ directory is never in that allowlist. (3) Docs/ is NOT gitignored in HQ (it must be version-controlled there); the guard is the commit/push discipline, not gitignore. (4) Agent discipline: tag content as HQ or Preview in header. | Y — owner creates allowlist before P2 public push |
| **B5-ext** | **Public-repo leak (build channel)**: A playable client-side web build ships mechanics and business math in readable JS. The leak channel is builds, not just the repo. | M | M | At P2 'playable web teaser' exit: explicitly decide whether to strip/obfuscate economy constants in the build or consciously accept the exposure. Document the decision per RISK_REGISTER. This is not automatically safe because docs/ is HQ-only. | Y — owner makes a conscious accept/strip decision at P2 build exit |
| **B6** | **AI-generated content provenance**: AI-generated assets may be uncopyrightable (weakens IP enforcement); Steam requires AI content disclosure; the cozy-pixel community is notably hostile to undisclosed AI art. | M | H | (1) Human-author/curation policy per asset class: define which asset classes are human-authored, AI-assisted, or AI-generated with human curation. (2) Provenance log: track origin of each asset at creation time. (3) Platform-disclosure stance: whether to disclose AI involvement on Steam and itch.io is an **Owner Decision** — must be resolved before any public release. (4) Community-tone risk: even disclosed AI art may draw backlash in cozy-game communities; owner decides how to position. **RESOLVED 2026-06-07: DISCLOSE OPENLY (owner-ratified; PROVENANCE.md ships with any public release).** | Y — owner decides disclosure stance before any public content release |
| **C1** | **"Broccoli" stigma on edu games**: Educational framing kills fun; players avoid it as homework. | M | M | (1) Lead with "cozy game," not "edugame." (2) Learning is optional: tooltips brief and never mandatory. (3) "By-product, not primary" framing in team comms. (4) Beta test with 5+ casual non-educator players; if tone feels preachy, rewrite before P2. | Y — owner approves marketing framing in P0 |
| **C2** | **Public disclosure of pending features tempts scope creep**: Preview repo shows future features → community demands them sooner. | L | M | (1) No roadmap in Preview repo: only current and shipped features visible. (2) Teaser is minimal: first public push is 3–4 screenshots + short concept; no feature list. (3) Owner controls narrative. (4) Post-launch planning: owner decides on public roadmap after ship. | N — mitigated by process |
| **C3** | **Title's mental-health slang reading**: "Driving Me Nuts" = colloquial for going insane; possible educator/procurement objection in school contexts. | L | M | Include the title in the sensitivity review pass. Name fallbacks ("Roasted", "The Nut Truck") are pre-recorded and available without commitment. | N — include in sensitivity pass; escalate to Owner Decision if an educator flags it |
| **C4** | **Owner-identity leak via git metadata**: Public Preview repo commits carry a personal email address in git metadata, linking the pseudonymous project to a real identity. | L | M | Use GitHub noreply email for all public-repo (Preview) commits going forward. History rewrite on any already-pushed personal-email commits = **Owner Decision** (question logged to owner). | Y — owner decides on history rewrite; noreply email is the default going forward |

---

## Standing Review Triggers

Re-review this register when:

1. **P1 exit gate (owner ruling 2026-06-07 moved SME + allergy reviews here; P1 build runs on stylized numbers):** SME accuracy review done? Allergy-sensitive mechanic review done? Engine PoC passed? Cut-list and gag-variant cap locked? Mechanic blacklist ratified? → Update A1, A1-sub, A2, A3, A4, B2.
2. **First public content (P2 forward):** Preview repo receives screenshots or teaser. Recheck A1 (tone), B5 / B5-ext (leak), C1 (framing) with fresh eyes. Run allowlist check.
3. **Engine chosen:** B2 closes (or escalates if PoC failed).
4. **Any feature that touches player data:** CRIT-1 re-evaluated; re-tier governance to A+B if any data collection begins. This trigger is mandatory, not optional.
5. **First external contributor or educator:** A2 (SME review), C1 (edu-game tone) may need adjustment.
6. **Closed beta starts (P5):** A1 and C1 are live-tested. Dark-pattern check required at this gate (A4).
7. **Post-launch planning:** Reassess A3 (scope/cut-list), B4 (cadence). Which cut-list items resurface as high-demand?

---

## Top Risks by Severity

1. **CRIT-1 — Player data / child privacy (H×H = Critical):** Any data collection from a 13+ audience triggers federal/international law. Default position: collect nothing. Re-tier the moment that changes.

2. **A1 — Peanut allergy content insensitivity (H×H = Critical):** Comedy + peanuts is a sensitive intersection. Single insensitive mechanic or dialogue can tank public perception. **Owner action required:** lock allergy-sensitive style guide and honest-labeling mechanic before P1; source external allergy-aware reviewer.

3. **A2 — Business accuracy failure (H×H = High):** Teaching wrong business concepts breaks educational credibility. **Owner action required:** hire SME for 2–4 hour mechanics design review; per owner ruling 2026-06-07 this blocks P1 EXIT (not P1 start).

4. **A3 — Scope creep (H×M = High):** Solo hobby project + two genres + curriculum. **Owner action required:** name the cut-list and gag-variant cap in P0.

5. **A4 — Dark-pattern drift (M×H = High):** Idle mechanics drift toward FOMO. **Owner action required:** ratify mechanic blacklist in P0.

---

## Risk Ownership

- **Owner:** CRIT-1, A1/A1-sub (tone/mechanic approval + reviewer sourcing), A3 (scope/cuts), A4 (blacklist ratification), B4 (cadence), B3 (trademark + license decision), B5/B5-ext (audit/build decision), B6 (disclosure stance), C4 (history rewrite)
- **Delegable to swarms:** B1 (art pipeline), B2 (PoC test), C1 (beta feedback collection)
- **Shared:** A2 (design + SME input)

---

*Last reviewed: 2026-06-06 (red-team pass applied)*

---

## Standing-trigger review 2026-06-07 — persistence v1

**Trigger:** "Any feature that touches player data" (trigger #4, Standing Review Triggers section).

**What shipped:** Browser localStorage save of game state (save/load on exit/boot, schema-versioned for forward compat). No accounts, no server, no analytics, no network egress. Red-team grep of `src/` confirms no telemetry, no cloud sync, no educator export, no leaderboard. Offline earnings cap ($100/hr) + pause-on-blur + uncompressed JSON (human-readable, owner-auditable).

**CRIT-1 re-tier evaluation:** CRIT-1 row mandates re-tier to A+B the moment ANY player data is collected. **Verdict: Tier A retained.** Rationale:
- Data never leaves the device (localStorage is browser-local, no HTTP egress).
- No PII collected (save file contains only game state: inventory, money, elapsed time, recipe picks, day count — no names, emails, IP, identifiers).
- No collection by the developer (owner has zero access to player saves; no telemetry endpoint, no analytics, no cloud storage).
- CRIT-1's own criteria are "data from likely-minors" + "regulated collection" — neither applies. Local-only, developer-blind save is the safest possible data posture.

**Re-trigger conditions:** CRIT-1 moves to active re-tier (A+B governance, Owner Decision gate) if any of these ship:
1. Cloud sync (e.g., Firebase, AWS save-slot backend).
2. Telemetry (session length, feature usage, play time, crash reports).
3. Educator export (teachers accessing student play transcripts).
4. Leaderboards (global or peer ranking, even pseudonymous).
5. Analytics (Mixpanel, Plausible, Sentry).

Each is an explicit Owner Decision per CRIT-1 mitigation; none ship without owner approval and legal/privacy review first.

**Verdict:** Tier A retained. No governance re-tier required. CRIT-1 remains a standing alert; any data-touching feature re-evaluates this register before implementation.

---

## Standing-trigger review 2026-06-07 — waves 5–7 (ledger, comebacks, brand campaign, rescue aftermath, achievements, supplier relationship)

**Triggers checked:** #4 "Any feature that touches player data" (the save schema grew) and #6/A4 "dark-pattern check" (idle/retention mechanics were added).

**What shipped (waves 5–6, PRs #7/#8):**
- *Ledger v1 + balance sheet + weekly recap* — derived from local save state; no new collection surface.
- *Comeback Lines, brand campaign, rescue aftermath beats* — content/economy; persisted locally (schema v4).
- *Achievements* — milestone ids persisted locally; **no mechanical reward** (markers only).
- *Supplier relationship* — economy discount; persisted as a cumulative-lbs counter.
- New save fields: ledger rows, comebackTier, brandCampaignActive, aftermathSeen/pendingAftermath, achievementsUnlocked, supplierLbsPurchased, rawCostBasisPerLb. All local, all game-state, **no PII**.

**CRIT-1 (player data) — Tier A retained.** The save grew but the posture is unchanged: localStorage-only, no network egress, no telemetry, no accounts, no educator export, no leaderboard. Red-team greps of `src/` across both waves confirmed no new egress/analytics. The save still contains only game state (now with a P&L ledger and milestone ids — still no names/emails/identifiers). None of the five CRIT-1 re-trigger conditions (cloud sync, telemetry, educator export, leaderboards, analytics) shipped.

**A4 (dark-pattern drift) — clean.** Each retention-adjacent mechanic was checked against the mechanic blacklist:
- *Weekly recap* — factual totals only; no streaks, no "don't break it", no countdown.
- *Achievements* — grant **no in-game bonus** (verified by test: earning all of them mutates no cash/stock/price); goals panel carries an explicit "they grant no in-game boost" footnote. No "complete to unlock power" pressure.
- *Brand campaign* — one-time, permanent, **no timer/expiry/FOMO**; the unlock waits forever once earned.
- *Comeback unlocks / supplier level-ups* — earned, celebratory, factual; no pressure framing.
- *Offline cap* unchanged ($100/hr, non-punitive). Rescue aftermath is closure-only; **re-entry escalation remains owner-gated (RT-1)**.

**A2 (business accuracy) — hardened this wave.** RT6-1 fixed a "simplified but never wrong" violation (discounts were creating phantom balance-sheet equity); inventory is now valued at actual cost and discounts flow to COGS at sale. The cash-flow `cashSpentOnProduction` line intentionally stays at standard cost (documented in BOOKKEEPING.md §4 as a P2 dual-ledger reconciliation item, not an error). **SME walk of the 93-claim pack remains owner-gated — no claim is marked verified here.**

**Verdict:** Tier A retained; no governance re-tier. Dark-pattern gate passed for all waves-5/6 mechanics. CRIT-1 re-trigger conditions remain the tripwire for any future data-collection feature.
