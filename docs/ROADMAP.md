# Roadmap — Driving Me Nuts

Phased build plan for a pixel-art RPG + idle game teaching small-business mechanics.
No calendar dates; each phase gates the next. Solo dev + AI agent swarms = bursty cadence.

---

## Phase 0: Design Lock & Engine Decision

**Goal:** Finalize all design docs, pick an engine, validate core feasibility.

**Scope:**
- Finish and review docs/GDD.md (loop interconnects), docs/BUSINESS_CURRICULUM.md (concept→mechanic map), docs/ART_BIBLE.md (sprite spec, palettes, asset count)
- Engine evaluation: recommend **Phaser 3** (web-based 2D, idle-friendly, TypeScript support, no build bloat) or **Godot web export** (full engine, heavier but mature) or **Kaplay.js** (lightweight, fast iteration). Evaluate: idle-loop support, pixel-art tooling, monetization hooks, deploy target (web first, native later?).
- Create docs/ENGINE_CHOICE.md (pros/cons, final pick, toolchain sketch)
- Risk register reviewed by owner; allergy-content guidelines locked in

**Exit criteria:**
- All design docs readable, internally consistent, no major gaps
- Engine chosen; hello-world project spun up
- Art Bible sprite spec complete (minimum pixel counts, palette, walk/idle cycles)
- Owner approves design direction and no "regret" concerns flagged

**Biggest risk:** design docs incomplete or conflicting; engine choice has regrets later (test a vertical slice in candidate before committing).

**Parallel swarm work:**
- Finish GDD, BUSINESS_CURRICULUM, ART_BIBLE (agent swarms, 0 blockers)
- Research pixel-art tools (Aseprite vs free alternatives; if free, validate animat workflow)
- Prototype legume-lecture NPC encounter (dialogue, tone check, allergy-sensitivity review)

---

## Phase 1: Idle-Core Vertical Slice

**Goal:** Build one playable district with the roast→price→sell loop, fake art, no RPG movement yet.

**Scope:**
- One market-stall location (no truck driving yet)
- Roasting: idle background task; player sets roast time/temp, receives finished product after delay
- Pricing UI: set price per unit; see demand curve (higher price = lower foot traffic)
- Selling: tap/click NPC customers, complete quick dialogue, collect payment
- Inventory: track peanuts (raw, roasted, sold); display cash, profit, COGS
- Metrics: profit/loss, per-unit margin, customer count (data visible for learning)
- Placeholder art: single sprite for vendor, market stall, peanuts in bowls

**Exit criteria:**
- 10 minutes of play reaches positive cash flow on plausible pricing
- Roasting visibly progresses (timer or animation)
- One legume-lecture encounter works (dialogue, tone, no allergy jokes)
- Player understands: cost → price → demand trade-off
- Game runs on target platform (web, no build friction)

**Biggest risk:** idle loop feels boring or too slow; pacing is hard to tune. Mitigate: test legume-lecture encounter for tone; confirm player feedback loop is readable.

**Parallel swarm work:**
- Asset creation: 6–8 sprite frames (vendor idle/walk, stall, peanut states)
- Create first NPC script (legume-lecture dialogue, tone guide)
- Implement roasting sim (heat curve, time/temp optimization hints)
- Write tutorial copy (concise, in-game prompts only)

---

## Phase 2: RPG Shell & Multi-Zone Navigation

**Goal:** Add truck movement, two districts, 3 NPCs with recurring personalities, deploy to playable web link.

**Scope:**
- Truck sprite and movement (arrow keys or tap to move between zones)
- Zone 2: residential neighborhood (different foot traffic, demand curve)
- 3 NPCs: one legume-lecture repeat, one allergy-aware customer, one mentor (hints at permits/strategy)
- Encounter trigger: approach NPC → dialogue → choice (listen/ignore/engage)
- Permit mechanic: unlock Zone 2 with a "license fee" (real but low friction)
- Pacing: roasting continues idle while truck travels; no stop-time

**Exit criteria:**
- Player can drive truck between two zones in <30 seconds
- Each zone has distinct foot traffic/pricing pressure (demo price elasticity)
- One NPC repeats encounters; player recognizes personality
- Allergy-alert NPC teaches respect model (no sale if allergy at risk)
- Legume-lecture tone holds; no insensitivity creep
- Deployable to playable web teaser (GitHub Pages or Fly)
- **Leak check (build channel):** a client-side web build ships game mechanics and economy constants in readable JS — before deploying, owner consciously decides: strip/obfuscate those values, or accept the exposure. Document the decision per RISK_REGISTER B5-ext.

**Biggest risk:** adding RPG routing breaks idle-loop pacing; game becomes two mediocre games instead of one good one. Mitigate: RPG is navigation layer only; idle loop is the core reward. Keep travel time tight.

**Parallel swarm work:**
- Finish all zone sprites (stall, truck, zone-specific backgrounds)
- Write 3 NPC character bios and full dialogue scripts
- Design Zone 2 demand curve (e.g., higher prices but lower volume than market)
- Implement permit UI (visual gate, cost, one-time unlock)
- Prepare teaser trailer clip (30 sec, legume joke + gameplay loop)

---

## Phase 3: Curriculum Instrumentation & Learning Check

**Goal:** Wire up gameplay to small-business learning outcomes; confirm the game teaches what it claims.

**Scope:**
- Add learning-milestones tracker (player completes intro → unlocks "Pricing 101" hint; hit 20% profit margin → "Scaling" tip)
- In-game glossary: tap on "COGS," "margin," "cash flow," "demand elasticity" → tooltip + example from the game
- Quiz mechanic (optional, low-friction): at milestones, one question (e.g., "Why is demand down?" → player picks answer tied to their recent price change). No wrong answers; corrective hint only.
- Curriculum map docs/CURRICULUM_ENGAGEMENT.md: which learning goal maps to which game event
- Educator export: teacher gets play-session transcript (no PII; shows player pricing decisions, profit trajectory, NPC encounters) to review learning

**Exit criteria:**
- At least 5 business concepts have triggering conditions and in-game explanations
- A new player can reach cash-flow-positive state and know why (not luck)
- One beta educator gives feedback on learning value (off-the-record)
- No quiz gates progress; learning is optional but visible

**Biggest risk:** "edu game" stigma kills fun; players disengage if it feels preachy. Mitigate: tooltips are short; quiz is framing, not gatekeeping; keep narrative tone light and character-driven.

**Parallel swarm work:**
- Draft all 8–10 upgrade paths and their ROI teaching value (truck capacity, roaster, quality tier, etc.)
- Create learning-milestone decision tree (what triggers "Pricing 101"? hitting breakeven or raising price over X?)
- Design educator export format
- Test quiz tone with two non-educator players (is it fun or preachy?)

---

## Phase 4: Content Build-Out & Polish

**Goal:** Flesh out all 4 zones, 8+ NPCs, seasonal events, prestige loop, first public content push.

**Scope:**
- Zones: residential, market, office park, park (each with 2–3 unique NPCs, demand curves, seasonal twists)
- NPCs: 8–12 characters with repeating routes, dialogue variation, story arcs (mentor teaches permits → expansion unlock; allergy customer becomes regular → loyalty mechanic)
- Seasonal events: summer fair (spike in foot traffic), winter holiday market (premium prices), mid-year supplier shortage (teach inventory risk)
- Prestige loop (NG+): restart with 10% faster roasting, keep one upgrade; unlock harder difficulty
- Quality tier: "standard" vs "premium" peanuts (higher COGS, higher price, snob customers only)
- First updates to DrivingMeNuts---Preview: teaser screenshots, concept, no full game yet

**Exit criteria:**
- 4 zones feel distinct; player has 15–20 hours of content
- Every NPC has at least 3 unique encounters; one has a 5-beat story arc
- One seasonal event is live and teaches real business risk (shortage, demand spike)
- Prestige is reachable (10–15 hour first run)
- Public repo receives teaser summary + screenshots per the RISK_REGISTER leak checklist (no design-doc dumps, no sanitized GDD)
- Zero new allergy-insensitivity reports in beta feedback

**Biggest risk:** scope balloons; asset creation bogs down solo dev. Mitigate: pre-define cut-list (5 NPCs cut if needed; 1–2 zones deferred to post-launch patch); use agent swarms for art and NPC script writing.

**Parallel swarm work:**
- Generate all zone background art and tileset
- Write full NPC scripts and dialogue trees (12 characters × 5 encounters × 3 variations = heavy writing, delegation-friendly)
- Design seasonal event triggers and demand curves
- Create prestige UI and NG+ progression tracker
- Prepare public teaser (update README, add screenshots, review for confidentiality)

---

## Phase 5: Launch & Public Iteration

**Goal:** Release closed alpha/beta to small group, gather feedback, iterate, plan post-launch roadmap.

**Scope:**
- Closed beta: 10–20 players (educators, small-biz curious, cozy-game fans); two-week feedback window
- Prioritize feedback: pacing (too slow?), learn-ability (did they grasp the concepts?), allergy tone (any concerns?), bugs
- Create docs/FEEDBACK_SYNTHESIS.md (what we heard, what we're fixing, what's deferred)
- Beta 2: address critical feedback (pacing, allergy review pass, one NPC dialogue rewrite)
- Soft launch to wider public (web link, GitHub Pages, possible itch.io)
- Update DrivingMeNuts---Preview monthly with teaser summary + screenshots per the RISK_REGISTER leak checklist (no design-doc dumps), dev diary, new teaser art

**Exit criteria:**
- Closed beta completes; zero allergy-insensitivity reports
- 80%+ of beta testers reach prestige
- At least one educator reports using a segment in their class
- Public repo updated with teaser and launch announcement
- Post-launch roadmap drafted (cosmetics, employee hiring, advanced strategy, native ports)

**Biggest risk:** public feedback breaks design intent (e.g., "make it more grindy to extend playtime"); unclear what to prioritize. Mitigate: owner decides: learning > monetization. Stick to cozy, respectful tone.

**Parallel swarm work:**
- Prepare private beta coordination (access, feedback form, discord or email loop)
- Design feedback-synthesis workflow and survey
- Plan post-launch content (cosmetics, new NPC, prestige-2 loop)
- Research itch.io monetization (free game + optional donation, or free with cosmetic DLC later)

---

## Dependencies & Critical Path

- **P0 is blocking:** engine choice must be done before P1 code starts
- **P1 feeds P2:** RPG layer reuses idle-loop code; validate loop stability before adding movement
- **P2 feeds P3:** curriculum instrumentation requires live gameplay data; can't be done in isolation
- **P3 feeds P4:** learning design informs which NPCs get story arcs (e.g., mentor NPC teaches permits → unlock story)
- **P4 feeds P5:** content complete before beta; expect 1–2 rewrite cycles based on feedback

---

## Parallel Swarm Windows

These can start before phase gates:
- **During P0:** GDD, BUSINESS_CURRICULUM, ART_BIBLE writing (no code blocker)
- **During P1:** finish all zone art, write full NPC scripts for P2 (no blocker; UI will integrate later)
- **During P2:** design seasonal events and prestige UX (code-independent design)
- **During P3:** draft educator export format and curriculum mapping (design, no code dependency)
- **During P4:** plan post-launch cosmetics and DLC ideas (creative work, low priority)

---

## Success Measures

- **Playability:** new player reaches cash-flow-positive state in <20 min without tutorial
- **Learning:** player can name 3 business concepts they discovered by playing
- **Tone:** zero reports of allergy insensitivity in closed beta; legume-lecture NPC is "funny and kind"
- **Scope:** shipped without major cuts to core loops; prestige is reachable in 15 hours
- **Public adoption:** 1+ educator uses it; 100+ public plays in first month; 4.0+ star rating if rated
