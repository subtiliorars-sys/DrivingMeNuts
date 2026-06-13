# Phase 2 Prep — RPG Shell & Multi-Zone Navigation

**Wave:** DM-W5 (`automation/wave-dm-w5-phase2-prep`)  
**Status:** Planning doc only — no gameplay code until Phase 1 exit gates clear  
**Canon:** `docs/ROADMAP.md` Phase 2; `docs/GDD.md` world zones

---

## Goal

Add a **navigation layer** (truck + two districts) without breaking the idle roast→price→sell core. Phase 2 is not a second game — travel is short, roasting continues in the background, and encounters are optional teaching beats.

---

## Vertical slice scope (first P2 PR stack)

| Item | Acceptance | Out of scope |
|------|------------|--------------|
| Truck movement | Arrow keys or tap between **Market** and **Residential** in <30s | Four zones, prestige |
| Zone demand | Residential uses distinct `DAY_FACTOR` / foot-traffic curve | Weather + brand campaign rework |
| Permit gate | One-time license fee unlocks Zone 2 (cash sink, teaches permits) | Multi-step permit quests |
| 3 NPCs | Legume repeat, allergy-aware customer, mentor (hints only) | Full dialogue trees |
| Deploy | GitHub Pages teaser build (owner deploy gate) | Native / Steam |

---

## Engineering notes

- Reuse Phaser scene stack: `GameScene` stays idle hub; add `WorldScene` or sub-state for map navigation.
- **Persistence:** extend save schema with `zonesUnlocked: string[]`, `currentZoneId` — additive-optional like `weatherSeed`.
- **Idle while traveling:** `tick()` continues during movement (GDD: no stop-time punishment).
- **A11y:** large-text pref must scale map HUD labels (reuse `scaledFont` from DM-W2).

---

## Art / content dependencies

- Truck sprite + 2 zone backgrounds (placeholder rectangles OK for slice)
- NPC bios: see `docs/GDD.md` legume-lecture tone guide
- Allergy NPC: cross-check `docs/SYSTEMS_BACKLOG.md` and educator allergy brief (DM-W3)

---

## Risk reminders

- **B5-ext (ROADMAP):** web deploy exposes economy constants — document owner decision before public URL.
- **Pacing:** if travel >30s or encounters block selling, cut scope — navigation is garnish.
- **Dark patterns (DARK_PATTERN_GATE):** no FOMO on permit expiry; license is permanent once bought.

---

## Suggested wave breakdown (future workers)

1. **DM-P2-W1** — Zone registry + save fields + demand curve hook (tests only)
2. **DM-P2-W2** — Truck movement prototype (placeholder art)
3. **DM-P2-W3** — Permit purchase UI + zone gate
4. **DM-P2-W4** — One NPC encounter (legume repeat)
5. **DM-P2-W5** — Allergy-aware + mentor stubs; educator tone review flag

---

*Docs-only wave. Update when Phase 1 exit checklist in `docs/ROADMAP.md` is owner-signed.*
