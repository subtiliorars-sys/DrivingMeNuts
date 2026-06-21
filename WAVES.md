# DrivingMeNuts — Wave Registry

One wave = one PR. Workers: read `OFFICE_HOURS.md`. Verify: `npm run verify`.
Branch prefix: `automation/wave-*`. Never merge your own PR.

## Pickup rules
1. Open automation PR exists → stop (wave in flight).
2. Else → first `pending`/`active` non-`blocked` wave below.
3. Never ask owner to restart next iteration.

## Active queue

_(Queue idle — P1 exit gates owner-gated (`docs/ROADMAP.md`); P2 truck-movement gameplay blocked until signed. Next candidate when unblocked: **DM-P2-W2** truck movement prototype. P1.5 district sim + ROUTES UI already on `main` — see completed **DM-P2-W1**.)_

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
- **DM-W8 — Playtest volunteer docs cross-link** — merged PR #38 (2026-06-14)
- **DM-W9 — SYSTEMS_BACKLOG §2a auto-sell shipped sync** — merged PR #73 (2026-06-17)
- **DM-W10 — Itch playtest slice (in-game feedback)** — merged PR #74 (2026-06-17)
- **DM-P2-W1 — District registry + demand curves (P1.5)** — on `main` (DMN-1/2 sim + ROUTES UI)
- **DM-W11 — WAVES registry + Phase 2 prep sync** — this PR (2026-06-21)
