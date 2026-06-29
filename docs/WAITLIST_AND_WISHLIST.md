# Waitlist & wishlist — discovery lanes (revenue sprint)

**Wave:** DM-W11 (`automation/wave-dm-w9-waitlist-docs`)  
**Status:** Docs-only — no accounts, no email capture in-game (CRIT-1)  
**Updated:** 2026-06-28

Three **owner-operated** intake lanes. None collect student PII in the game; educator export remains blocked per `docs/RISK_REGISTER.md` (CRIT-1).

---

## Lane map

| Lane | Who | Signup | Owner follow-up |
|------|-----|--------|-----------------|
| **Volunteer playtest** | Closed-beta testers | [PLAYTEST.md](https://github.com/subtiliorars-sys/DrivingMeNuts---Preview/blob/main/PLAYTEST.md) + [signup form](https://github.com/subtiliorars-sys/DrivingMeNuts---Preview/issues/new?template=playtest-signup) | GitHub invite or play URL |
| **Educator classroom pilot** | Teachers 13+ classrooms | Same signup form — note **“educator pilot”** in optional notes | `docs/EDUCATOR_GUIDE.md` + IT checklist; SME/allergy gates before scale |
| **Steam wishlist** | Future desktop buyers | *Not live yet* — see [Steam wishlist prep](#steam-wishlist-prep-owner-gated) | Owner creates store page when trademark + desktop build ready |

**HQ detail:** [`docs/PLAYTEST_ONBOARDING.md`](PLAYTEST_ONBOARDING.md) (clone steps, feedback templates, confidentiality text).

---

## Volunteer playtest (canonical path)

Share only the **Preview** links publicly (B5 allowlist):

1. **Read:** [PLAYTEST.md on DrivingMeNuts---Preview](https://github.com/subtiliorars-sys/DrivingMeNuts---Preview/blob/main/PLAYTEST.md)
2. **Sign:** [playtest-signup issue template](https://github.com/subtiliorars-sys/DrivingMeNuts---Preview/issues/new?template=playtest-signup) — creates a **public** GitHub issue (no private email in the form; contact via @mention).
3. **Play (after owner OK):** itch.io / GitHub Pages links in PLAYTEST.md, or `npm start` after private-repo invite.
4. **Feedback:** in-game **FEEDBACK** button (browser builds), or [playtest-feedback](https://github.com/subtiliorars-sys/DrivingMeNuts/issues/new?template=playtest-feedback) after HQ invite.

Cross-links already wired in `OFFICE_HOURS.md`, `START_HERE.md`, and `docs/ITCH_PASTE_READY.md`.

---

## Educator classroom pilot waitlist

**Goal:** A small set of teachers run a 40–45 min session using the shipped P1 build — feedback on learning value, not a data-collection product.

### How teachers join

1. Read [`docs/EDUCATOR_GUIDE.md`](EDUCATOR_GUIDE.md) (build status, privacy, lesson plan).
2. Submit the **[public playtest signup form](https://github.com/subtiliorars-sys/DrivingMeNuts---Preview/issues/new?template=playtest-signup)**.
3. In **Optional notes**, include:
   - `educator pilot`
   - Grade band (e.g. 8th economics, intro entrepreneurship)
   - Approx. class size and device situation (1:1 laptops vs pairs)
   - District/state (jurisdiction disclaimer — game is not location-specific legal advice)

### Owner intake checklist (per pilot)

| Step | Action |
|------|--------|
| 1 | Confirm P1 exit gates relevant to class use: SME checklist progress (`docs/SME_REVIEW_CHECKLIST.md`), allergy brief if allergy NPC content is shown |
| 2 | Send play link (itch / Pages) or classroom-safe offline load instructions — **no student accounts** |
| 3 | Point teacher to **Classroom Pilot Checklist** in `EDUCATOR_GUIDE.md` (offline verification, grouping, debrief) |
| 4 | Collect feedback verbally or via teacher’s own notes — **no gameplay transcript export** until CRIT-1 is re-tiered |
| 5 | Tag signup issue `educator-pilot` (manual label on Preview or HQ mirror) |

### What we do **not** do yet

- No roster upload, no student emails in GitHub issues
- No educator-export / session transcripts (`docs/ROADMAP.md` Phase 3 — owner decision)
- No procurement packet or FERPA attestation until legal review

### Play links for classrooms

| Channel | URL | Notes |
|---------|-----|-------|
| itch.io (browser) | https://subtiliorars.itch.io/jimmythehat-driving-me-nuts | Free; FEEDBACK button for teacher-only bug reports |
| GitHub Pages | https://subtiliorars-sys.github.io/DrivingMeNuts/ | Same build; confirm IT offline test in educator guide |

---

## Steam wishlist prep (owner-gated)

**Status:** No Steam store page yet. Browser + itch are the live discovery channels.

Use this checklist **before** publishing a Steam store page or asking for wishlists.

### Preconditions (resolve first)

| Gate | Doc | Status |
|------|-----|--------|
| Trademark / name clearance | `docs/RISK_REGISTER.md` B3 | Owner — blocked wave |
| AI content disclosure | B6 — disclose openly; `PROVENANCE.md` at public release | Ratified; ship with store page |
| Desktop build smoke | `npm run verify` + native shell QA when desktop PR lands | Owner |
| Economy leak posture | B5-ext — web/desktop JS exposes tuning constants | Owner accept/strip decision |

### Store page asset backlog

| Asset | Source / note |
|-------|----------------|
| Capsule (header) | `release/store-assets/` — regenerate via fleet script |
| Screenshots | Title, market loop, BOOKS panel, Settings/a11y |
| Short description | `docs/ITCH_PASTE_READY.md` — adapt for Steam character limits |
| Tags | cozy, simulation, pixel art, business, comedy — **lead with game, not edugame** (C1) |
| Price stance | Free browser on itch today; Steam may be PWYW or paid — **owner decision** |

### Wishlist launch day (when ready)

1. Owner creates Steamworks app + store page (draft).
2. Add **wishlist URL** to: Preview `PLAYTEST.md`, `docs/ITCH_PASTE_READY.md`, this doc.
3. itch.io full description: one line “Wishlist on Steam: \<url\>” — no FOMO timers (A4 / `docs/DARK_PATTERN_GATE.md`).
4. Optional: GitHub Pages footer link — deploy workflow is owner-gated.

### Related future work (not this wave)

- Full runbook may live in a future `docs/STEAM_RELEASE.md` when desktop packaging PR merges
- Steam Cloud / achievements — out of scope until save sync is designed (CRIT-1)

---

## Owner quick reference

| Share with… | Send them… |
|-------------|------------|
| Random volunteer | Preview PLAYTEST.md + signup form |
| Teacher | EDUCATOR_GUIDE + signup with “educator pilot” note |
| Press / fleet cross-promo | itch URL + PLAYTEST.md; Steam only after wishlist URL exists |

*Docs-only wave. Update when Steam store page or educator issue template ships.*
