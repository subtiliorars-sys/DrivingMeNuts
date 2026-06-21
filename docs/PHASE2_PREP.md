# Phase 2 Prep — RPG Shell & Multi-Zone Navigation

**Wave:** DM-W6 (`automation/wave-dm-w6-phase2-prep`); refreshed DM-W11 (2026-06-21)  
**Status:** Planning doc — truck-movement gameplay blocked until P1 exit gates clear  
**Canon:** `docs/ROADMAP.md` Phase 2; `docs/GDD.md` world zones; `docs/P2_DISTRICTS_SPEC.md`

---

## Goal

Add a **navigation layer** (truck driving between districts) without breaking the idle roast→price→sell core. Phase 2 is not a second game — travel is short, roasting continues in the background, and encounters are optional teaching beats.

---

## Already on `main` (P1.5 — not blocked on P1 exit)

| Wave id | Shipped | Notes |
|---------|---------|-------|
| **DM-P2-W1** | ✅ | `DistrictId` registry, `currentDistrict` / `unlockedDistricts` persistence, per-district demand curves + lunch rush in `src/sim/` |
| **DM-P2-W3 (partial)** | ✅ | ROUTES modal: Office Quarter permit ($300), district switch, demand-curve readout, Derek consistency in Office Quarter |
| **Backdrop** | ✅ | Palette D office-quarter sky/ground swap (DMN-2) |

District switching today is **modal-based** (tap HUD banner), not map movement. Boardwalk / University / etc. remain data-only in `economy.ts` until P2 content waves.

---

## Vertical slice scope (first P2 gameplay PR stack)

| Item | Acceptance | Out of scope |
|------|------------|--------------|
| Truck movement | Arrow keys or tap between **Farmers' Market** and **Office Quarter** in <30s | Four zones, prestige |
| Zone demand | Already wired — movement picks `currentDistrict` | Weather + brand campaign rework |
| Permit gate | Office Quarter permit shipped; renewal calendar P2+ | Multi-step permit quests |
| 3 NPCs | Legume repeat, allergy-aware customer, mentor (hints only) | Full dialogue trees |
| Deploy | GitHub Pages / itch teaser (owner deploy gate) | Native / Steam |

---

## Engineering notes

- Reuse Phaser scene stack: `GameScene` stays idle hub; add `WorldScene` or sub-state for map navigation.
- **Persistence:** `currentDistrict` + `unlockedDistricts` already additive-optional — no new save fields for the movement slice.
- **Idle while traveling:** `tick()` continues during movement (GDD: no stop-time punishment).
- **A11y:** large-text pref must scale map HUD labels (reuse `scaledFont` / browser-zoom hint from DM-W2).

---

## Art / content dependencies

- Truck sprite + zone link art (placeholder rectangles OK for slice; `src/scenes/truck.ts` programmer-art exists)
- NPC bios: see `docs/GDD.md` legume-lecture tone guide
- Allergy NPC: cross-check `docs/SYSTEMS_BACKLOG.md` and educator allergy brief

---

## Risk reminders

- **B5-ext (ROADMAP):** web deploy exposes economy constants — document owner decision before public URL.
- **Pacing:** if travel >30s or encounters block selling, cut scope — navigation is garnish.
- **Dark patterns (DARK_PATTERN_GATE):** no FOMO on permit expiry; license is permanent once bought.

---

## Wave breakdown (workers)

| Id | Scope | Status |
|----|-------|--------|
| **DM-P2-W1** | Zone registry + save fields + demand curve hook | ✅ Shipped (P1.5) |
| **DM-P2-W2** | Truck movement prototype (placeholder art) | **Next** — blocked until P1 exit |
| **DM-P2-W3** | Permit purchase UI + zone gate | Partial (ROUTES modal); renewal calendar deferred |
| **DM-P2-W4** | One NPC encounter (legume repeat) | Pending |
| **DM-P2-W5** | Allergy-aware + mentor stubs; educator tone review flag | Pending |

---

*Update when Phase 1 exit checklist in `docs/ROADMAP.md` is owner-signed.*
