# Allergy Copy Audit — 2026-07-13

**Lane:** `dmn-2b-sprites` (docs-only)  
**Kanban:** `drivingmenuts-dmn-2b-sprites-docs-allergy-copy-a`  
**Brief:** [`ALLERGY_REVIEWER_BRIEF.md`](ALLERGY_REVIEWER_BRIEF.md)  
**Risk register:** A1, A1-sub

## Scope & method

Static grep of `src/` and `docs/` for allergy-related copy vs. the reviewer brief pass criteria. Does **not** replace external reviewer sign-off (A1 exit gate).

**Patterns searched:** `allerg`, `anaphyla`, `cross-contamin`, `cross-contact`, `lol allergic`, `allergy joke`, `peanut-free`, `allergen-free`, `joke.*allerg`

**Automated gate:** `src/sim/a11y_pedagogy.test.ts` — allergy glossary non-jokey assertion (RISK_REGISTER A1).

---

## Pass/fail table (vs ALLERGY_REVIEWER_BRIEF)

| # | Brief criterion | Location(s) checked | Result | Notes |
|---|-----------------|---------------------|--------|-------|
| 1 | **Honest-labeling mechanic** — no sale; upfront that nothing is safe | `src/data/glossary.ts` (`allergy.inGame`); `docs/CONCEPT.md`; `docs/RISK_REGISTER.md` A1 | **PASS (copy)** | Glossary + canon docs state shared equipment; no false safety. **NPC runtime dialogue not shipped** — re-audit when allergy encounter lands. |
| 2 | **Warm-referral mechanic** — points to nearby allergen-free cart; builds trust | `src/data/glossary.ts`; `docs/CONCEPT.md` §canon joke | **PASS (copy)** | Referral framing present in glossary; reputation boost mechanic **not yet in gameplay code**. |
| 3 | **Cross-contamination framing** — severity, cross-contact, shared equipment/air | `src/data/glossary.ts` `allergy.definition` | **PASS** | Matches brief quoted text; uses preferred term "cross-contact". |
| 4 | **Glossary entry** — accurate, serious, complete, no trivializing language | `src/data/glossary.ts`; `a11y_pedagogy.test.ts` | **PASS** | Test guards against `funny`/`lol`/`haha`; includes "never something to joke about". |
| 5 | **No allergy jokes anywhere** | `src/data/lore.ts`, `comebacks.ts`, `glossary.ts`; full `src/` grep | **PASS** | Lore header: "ZERO allergy references." Comebacks rule: "Zero allergy jokes, ever." No allergy strings in lore/comebacks bodies. |
| 6 | **Legume joke separate from allergy** | `src/data/lore.ts`, `comebacks.ts`; `docs/LEGUME_LORE.md` | **PASS** | Legume pedantry only; no intersection with allergy content in shipped data. |
| 7 | **No false-safe implication** | `src/` grep; `docs/ITCH_PASTE_READY.md`; `docs/EDUCATOR_GUIDE.md` | **PASS** | Store copy: "Allergen honesty — peanuts everywhere, pointed to safe alternatives." No partial-safety claims found. |
| 8 | **Docs/community rules align** | `docs/FACEBOOK_GROUP_SETUP.md`; `docs/BUSINESS_CURRICULUM.md` Rule 6; `docs/ALLERGY_REVIEWER_BRIEF.md` | **PASS** | Group rules ban allergy jokes. Curriculum states allergy = safety, joke = botany only. |
| 9 | **Planned NPC dialogue (future)** | `docs/BUSINESS_CURRICULUM.md` ("I'm allergic, so this is a hard pass"); `docs/PHASE2_PREP.md` | **CONDITIONAL** | Proposed line is respectful refusal, not a joke — **must re-check tone when coded**. |
| 10 | **External reviewer sign-off** | `docs/ALLERGY_REVIEWER_BRIEF.md` §Submit | **FAIL (process)** | Owner-sourced reviewer not yet scheduled; blocks P1 public exit per RISK_REGISTER. |

---

## `src/` file scan

| File | Allergy hits | Verdict |
|------|--------------|---------|
| `src/data/glossary.ts` | `allergy` entry (canonical) | PASS |
| `src/data/lore.ts` | Comment only ("ZERO allergy references") | PASS |
| `src/data/comebacks.ts` | Comment rule only | PASS |
| `src/sim/a11y_pedagogy.test.ts` | Test gate | PASS |
| `src/scenes/GameScene.ts` | No allergy strings (peanut product copy only) | PASS |
| Other `src/sim/*`, `src/scenes/*` | No allergy dialogue strings | PASS (no NPC allergy encounter shipped) |

---

## `docs/` file scan (allergy-touched)

| File | Verdict | Notes |
|------|---------|-------|
| `ALLERGY_REVIEWER_BRIEF.md` | PASS | Source of truth for external review |
| `RISK_REGISTER.md` A1/A1-sub | PASS | Policy locked |
| `CONCEPT.md` | PASS | Honest labeling + warm referral canon |
| `FACEBOOK_GROUP_SETUP.md` | PASS | Explicit "No allergy jokes" rule |
| `EDUCATOR_GUIDE.md` | PASS | Points to serious glossary entry |
| `BUSINESS_CURRICULUM.md` Rule 6 | PASS | Sensitivity rule documented |
| `LEGUME_LORE.md` | PASS | "ZERO allergy references or jokes" |
| `RESCUE_ARC_SCRIPT.md` | PASS | "Zero allergy content" |
| `RECIPE_BATCH_UI.md` | N/A | Open question on Ghost Pepper tooltip tone — not allergy joke |

---

## Overall verdict

| Layer | Verdict |
|-------|---------|
| **Shipped copy (`src/data` + audited docs)** | **PASS** — zero allergy jokes; glossary and canon align with brief |
| **Mechanic completeness** | **CONDITIONAL** — honest-labeling + warm-referral not yet playable; copy-only pass |
| **P1 exit gate (A1)** | **FAIL (process)** — external allergy-aware reviewer still required |

**Recommended next:** No copy edits from this audit. Schedule external reviewer per `ALLERGY_REVIEWER_BRIEF.md` before scaling educator pilot or new allergy NPC dialogue.

---

*Docs-only wave · Does not touch `games/` or Phaser sprint lock*
