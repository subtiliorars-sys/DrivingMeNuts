# CLAUDE.md — DrivingMeNuts (private HQ)

Repo-specifics only; unified doctrine cascades from `~/CLAUDE.md`.

## What this repo is
Private HQ for **Driving Me Nuts**: pixel-art RPG + idle game about a roasted-peanut
food truck that teaches real small-business concepts. Public twin =
`DrivingMeNuts---Preview` (sanitized teaser only — nothing confidential ever lands there).

## Canon (do not drift)
- The truck is named **Driving Me Nuts** and sells **roasted peanuts**.
- The running gag is canon: customers say "peanuts aren't nuts, they're legumes" →
  owner: "I know, I know — it's driving me nuts!" It is a mechanic, not just flavor.
- The game teaches **real** small-business concepts (see docs/BUSINESS_CURRICULUM.md);
  business numbers in mechanics should be plausible, not fantasy.

## Governance
- **Tier A (Universal)** per `~/agent-corps/GOVERNANCE_ROLLOUT_PLAN.md` — docs/design
  repo: no user data (B n/a), not recovery-adjacent (C n/a), not agentic (D n/a).
  Re-tier to A+B the moment the game collects any player data.
- No deploy automation here yet; if any is added, copy `.githooks/` + the git-guards
  CLAUDE.md block from MeniscusMaximus first.
- License: proprietary / all rights reserved, owner deliberately unnamed (canon ruling 2026-06-07) — never add a personal name.

## Working notes
- Branch per task (`work/<topic>`); stage only files you created/changed.
- Sensitivity flag: peanut **allergy** is a real-world safety topic — see
  docs/RISK_REGISTER.md before writing any content that jokes about allergies.

## Build & dev loop (P1)

**Engine lock (owner-ratified 2026-06-07):** Phaser 3 + TypeScript + Vite. Do not
swap or add competing game frameworks without owner sign-off.

**npm scripts:**
- `npm run dev` — Vite dev server (port 3000, HMR)
- `npm run build` — production bundle to `dist/`
- `npm run preview` — serve the production bundle locally
- `npm run test` — vitest run (node environment, pure-logic tests)
- `npm run verify` — full gate: `tsc --noEmit && vitest run && vite build`
  Run `verify` before every commit; it must stay green.

**Architecture rules:**
- `src/sim/` must stay **Phaser-free** — pure TypeScript, no Phaser imports, fully
  unit-testable in a node environment. The idle simulation logic lives here.
- All economy constants live in `src/data/economy.ts` (**single source of truth**).
  Do not hardcode prices, rates, or multipliers anywhere else; reference this file.
