# DrivingMeNuts — Wave Registry

One wave = one PR. Workers: read `OFFICE_HOURS.md`. Verify: `npm run verify`.
Branch prefix: `automation/wave-*`. Never merge your own PR.

## Pickup rules
1. Open automation PR exists → stop (wave in flight).
2. Else → first `pending`/`active` non-`blocked` wave below.
3. Never ask owner to restart next iteration.

## Active queue

### Wave DM-W8 — Playtest volunteer docs cross-link
**Status:** `active`  
**Branch:** `automation/wave-dm-w8-playtest-docs`

**Acceptance:**
- [ ] `START_HERE.md` links public signup form + PLAYTEST.md
- [ ] `OFFICE_HOURS.md` documents volunteer intake + `npm run qa:browser` gate
- [ ] `WAVES.md` marks DM-W8 done with PR link on merge
- [ ] Docs only — `npm run verify` green

---

_(Phase 2 prep: `docs/PHASE2_PREP.md` — gameplay waves blocked until P1 exit.)_

## Blocked (queue owner — do not implement)
- Marketing campaign tiers (A4) — owner decision
- Refrigerated truck — needs spoilage (P2)
- Trademark / TESS — owner

## Completed
- P1 idle core + extensions shipped (see `docs/ROADMAP.md` Phase 1 status)
- Weather modifier shipped
- **DM-W1 — Auto-sell off-peak (GDD C4)** — merged on `main`
- **DM-W2 — Large-text accessibility** — PR #29 (2026-06-13)
- **DM-W3 — P1-EXIT prep docs** — PR #30 (2026-06-13)
- **DM-W4 — EDUCATOR_GUIDE build-status sync** — PR #31 (2026-06-13)
- **DM-W5 — SYSTEMS_BACKLOG §3 sync** — PR #32 (2026-06-13)
- **DM-W6 — Phase 2 RPG shell prep** — `docs/PHASE2_PREP.md` on `main`
- **DM-W7 — WAVES registry sync** — merged PR #35 (2026-06-14)
