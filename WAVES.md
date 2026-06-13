# DrivingMeNuts — Wave Registry

One wave = one PR. Workers: read `OFFICE_HOURS.md`. Verify: `npm run verify`.
Branch prefix: `automation/wave-*`. Never merge your own PR.

## Pickup rules
1. Open automation PR exists → stop (wave in flight).
2. Else → first `pending`/`active` non-`blocked` wave below.
3. Never ask owner to restart next iteration.

## Active queue

### Wave DM-W1 — Auto-sell off-peak (GDD C4)
**Status:** `active`  
**Spec:** `docs/SYSTEMS_BACKLOG.md` §2a  
**Branch:** `automation/wave-dm-w1-auto-sell`

**Acceptance:**
- [ ] Optional EOD auto-sell at discount (default off)
- [ ] Tests in `auto_sell.test.ts`; existing tests green
- [ ] Dark-pattern gate: "reduce waste" framing only
- [ ] `npm run verify` green

### Wave DM-W2 — Large-text accessibility
**Status:** `pending`  
**Spec:** `docs/SYSTEMS_BACKLOG.md` §3  
**Branch:** `automation/wave-dm-w2-large-text`

**Acceptance:**
- [ ] `largeText` pref + scaled font helper
- [ ] PR body includes **owner visual check** steps (panels to eyeball)
- [ ] `npm run verify` green

### Wave DM-W3 — P1-EXIT prep docs
**Status:** `pending`  
**Branch:** `automation/wave-dm-w3-p1-exit-docs`

**Acceptance:**
- [ ] SME checklist + allergy reviewer brief cross-linked in START_HERE
- [ ] Docs only — no gameplay promises
- [ ] `npm run verify` green

## Blocked (queue owner — do not implement)
- Marketing campaign tiers (A4) — owner decision
- Refrigerated truck — needs spoilage (P2)
- Trademark / TESS — owner

## Completed
- P1 idle core + extensions shipped (see `docs/ROADMAP.md` Phase 1 status)
- Weather modifier shipped
