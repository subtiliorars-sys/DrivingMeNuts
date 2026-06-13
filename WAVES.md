# DrivingMeNuts — Wave Registry

One wave = one PR. Workers: read `OFFICE_HOURS.md`. Verify: `npm run verify`.
Branch prefix: `automation/wave-*`. Never merge your own PR.

## Pickup rules
1. Open automation PR exists → stop (wave in flight).
2. Else → first `pending`/`active` non-`blocked` wave below.
3. Never ask owner to restart next iteration.

## Active queue

### Wave DM-W5 — SYSTEMS_BACKLOG §3 sync (large-text shipped)
**Status:** `in_review`  
**Branch:** `automation/wave-dm-w5-backlog-sync`

**Acceptance:**
- [x] Mark large-text as shipped (PR #29); owner visual QA stays on owner queue
- [x] Docs only — no gameplay changes
- [x] `npm run verify` green (docs-only; unchanged)

---

## Blocked (queue owner — do not implement)
- Marketing campaign tiers (A4) — owner decision
- Refrigerated truck — needs spoilage (P2)
- Trademark / TESS — owner

## Completed
- P1 idle core + extensions shipped (see `docs/ROADMAP.md` Phase 1 status)
- Weather modifier shipped
- **DM-W1 — Auto-sell off-peak (GDD C4)** — merged on `main` (owner-approved $1,500 upgrade; default-off; `auto_sell.test.ts` + upgrades modal + day-report line; dark-pattern framing: "less waste / frees cash")
- **DM-W2 — Large-text accessibility** — PR https://github.com/subtiliorars-sys/DrivingMeNuts/pull/29 (2026-06-13)
- **DM-W3 — P1-EXIT prep docs** — PR https://github.com/subtiliorars-sys/DrivingMeNuts/pull/30 (2026-06-13)
- **DM-W4 — EDUCATOR_GUIDE build-status sync** — PR https://github.com/subtiliorars-sys/DrivingMeNuts/pull/31 (2026-06-13)
