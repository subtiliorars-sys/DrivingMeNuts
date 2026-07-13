# Allergy copy audit — Driving Me Nuts

**Date:** 2026-07-13  
**Lane:** `dmn-2b-sprites` (docs-only; no sprite pass)  
**Kanban:** `drivingmenuts-dmn-2b-sprites-docs-allergy-copy-a`  
**Risk register:** A1 (allergy tone), A1-sub (reviewer brief)

## Scope

Static scan of player-facing copy for allergy jokes, dismissive tone, or false reassurance.
Does **not** replace external review in `docs/ALLERGY_REVIEWER_BRIEF.md`.

## Method

1. Grep `src/data/` (glossary, lore, comebacks, dialogue) for `allerg`, `joke`, `lol`.
2. Confirm automated test `a11y_pedagogy.test.ts` allergy gate still passes.
3. Spot-check Facebook group queue templates in `scripts/facebook-group/`.

## Findings

| Area | Status | Notes |
|------|--------|-------|
| `src/data/glossary.ts` — `allergy` entry | ✅ PASS | Serious tone; honest labeling + warm referral; explicit "never something to joke about" |
| `src/data/lore.ts` | ✅ PASS | Header comment: ZERO allergy references in lore strings |
| `src/data/comebacks.ts` | ✅ PASS | Comment rule: "Zero allergy jokes, ever." No allergy strings in file body |
| `src/sim/a11y_pedagogy.test.ts` | ✅ PASS | Test asserts non-jokey allergy glossary (RISK_REGISTER A1) |
| `docs/FACEBOOK_GROUP_SETUP.md` | ✅ PASS | Rule: no allergy jokes in group copy |
| `scripts/facebook-group/queue.json` | ✅ PASS | Rules block repeats "No allergy jokes" |

## Gaps / follow-ups

| Item | Owner |
|------|-------|
| NPC dialogue lines at runtime (not fully grep-scanned) | Re-run when legume-lecture encounter ships |
| External ALLERGY_REVIEWER_BRIEF sign-off | Mark / designated reviewer |

## Verdict

**Docs + data layer: PASS** — no allergy jokes found in audited paths; glossary and group rules align with RISK_REGISTER A1.

**Recommended next:** Keep sprite pass blocked until asset pipeline; no copy changes required from this audit.
