# RESEARCH-BRIEF — Driving Me Nuts

**Updated:** 2026-06-13  
**Premise (owner):** GAME_IDEAS.md #3 — peanut food-truck comedy; customers "well-actually" legume facts; owner exasperation is the running gag.  
**Repo vision:** `docs/CONCEPT.md` — cozy pixel idle + real small-business literacy (COGS, permits, seasonality) without spreadsheet pain.

---

## PREMISE (quoted)

> You run a food truck that sells roasted peanuts. Customers keep walking up to "well, actually" you — "You know peanuts aren't really nuts, right? They're legumes." — and the owner fires back: "I know, I know — I already know that. It's driving me nuts!!"

---

## PICTURE

Driving Me Nuts sits at the intersection of **order-fulfillment / service sim** (prepare → price → serve under time pressure) and **Kairosoft-style idle tycoon** (background production, rising integers, unlock-driven depth). The legume joke is not flavor text — it is **load-bearing comedy** grounded in real botany (peanut = Fabaceae legume, not a true nut). That factual tension powers NPC encounters and honest allergen labeling (CONCEPT pillar 2).

For **cozy tone without arcade stress**, Venba shows how to center food mechanics on *meaning and recipe literacy* rather than frantic timers — useful for tutorial copy and pacing, even though this game needs more economy numbers than Venba.

**Apply here:** Keep the core loop legible in seconds (roast slot → set price → sell → end day → reinvest). Tie legume lectures to **repeatable encounter beats** with comebacks (already in sim). Avoid order-fulfillment failure modes where UI promises clicks that do not exist — order-fulfillment games live or die on timer/UI honesty (Kim & Mateas FDG19).

---

## EVIDENCE

| # | Source | Takeaway |
|---|--------|----------|
| 1 | [Peanut — Wikipedia](https://en.wikipedia.org/wiki/Peanut) | *Arachis hypogaea* is a **legume** (Fabaceae); pods mature underground (geocarpy). Culinary "nut" ≠ botanical nut — the customer pedantry is **factually correct**. |
| 2 | [Botanical nut — Wikipedia](https://en.wikipedia.org/wiki/Botanical_nut) | True nuts are indehiscent hard fruits; peanuts are explicitly **not** in that category — supports glossary / lore entries. |
| 3 | [Order-Fulfillment Games (Kim, FDG 2019)](https://www.kmjn.org/publications/OrderFulfillment_FDG19.pdf) | Service games core loop: **serve items before abstract timers expire**; representation of timer varies but player must trust feedback. Broken interactables = broken loop. |
| 4 | [Core loops in gameplay — Game Design Skills](https://gamedesignskills.com/game-design/core-loops-in-gameplay/) | Design moment → minute → hour loops that **feed back**; orphan mechanics without loop attachment should be cut. |
| 5 | [Game Dev Story — PC Gamer](https://www.pcgamer.com/game-dev-story-leads-kairosofts-irresistible-sim-lite-games-onto-steam/) | Kairosoft: **streamlined assign-wait-reinvest loop**, rising stats, brief sessions — model for idle roast + upgrade pacing. |
| 6 | [Venba playtesting — Games User Research](https://gamesuserresearch.com/venba-playtesting-a-hit-narrative-cooking-game/) | Paper-prototype recipes before code; **playtest to kill confusion**; cozy food games can avoid arcade pressure while still requiring clear UI affordances. |

---

## COMPARABLES

| Game | Core loop | Steal | Avoid |
|------|-----------|-------|-------|
| **Game Dev Story** (Kairosoft) | Assign staff → dev timer → sales → upgrade studio | Background timers, clear numeric feedback, unlock cadence | Endless genre combo complexity; cynical monetization tone |
| **Venba** | Story beat → cooking puzzle → family dialogue | Low-pressure cozy pacing; food as teaching lens; heavy playtest before ship | Pure narrative scope — we need more economy/sim depth |
| **Overcooked** (reference for service clarity) | Multi-step kitchen → plate → serve | **More actions than players** forces readable task split; delays create parallel work | Hard real-time chaos — our audience wants cozy idle, not stress |
| **Idle / tycoon food sims** (generic) | Produce → sell → upgrade | Passive roast slots match "respect player time" pillar | Dark patterns, fake urgency (see DARK_PATTERN_GATE) |

---

## DESIGN IMPLICATIONS (for next GDD pass)

1. **Legume encounters** — REF: Wikipedia peanut + CONCEPT §canon joke; each lecture should optionally teach one real fact (allergen cross-contact, COGS, etc.).
2. **Roast slots** — REF: Kairosoft background job + order-fulfillment "server prepares item"; tap-to-roast must **always** map to visible slot hit target (tutorial gate).
3. **Onboarding** — REF: Venba playtesting discipline; every imperative in tutorial bubble must exist in snapshot at that tutorial step.
4. **Economy UI** — REF: Game Design Skills nested loops; day report → reinvest closes session loop.

---

## UNKNOWNS / OWNER DECISIONS

| Item | Notes |
|------|-------|
| Real-time vs pure idle emphasis | CONCEPT says idle-friendly; current P1 is click-forward — owner may want more passive roast later |
| Multi-district scope vs polish pass | P2 districts spec exists; whether next slice is content vs UX polish |
| Comparable for **food-truck specifically** | Cook, Serve, Delicious! and PlateUp are strong refs — add in iteration 2 if owner wants truck-routing fantasy |
| Art/audio budget | Sprite spec is programmer art; owner approval needed before commissioning art pass |

---

## NEXT ITERATION

- [ ] game-designer: append `REFS:` block to `docs/GDD.md` §P1 slice tying mechanics to table above  
- [ ] field-engineer: fix any game-provost FAIL items  
- [ ] game-provost: tutorial audit after each UI change
