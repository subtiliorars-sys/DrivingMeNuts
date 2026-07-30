# Playtest onboarding — Driving Me Nuts (HQ)

**Audience:** Closed-beta volunteers with repo or build access  
**Updated:** 2026-06-28  
**Public volunteer link (share this):** https://github.com/subtiliorars-sys/DrivingMeNuts---Preview/blob/main/PLAYTEST.md

**Educator pilots & Steam wishlist (owner lanes):** [`docs/WAITLIST_AND_WISHLIST.md`](WAITLIST_AND_WISHLIST.md)

**Signup form (creates GitHub issue):** https://github.com/subtiliorars-sys/DrivingMeNuts---Preview/issues/new?template=playtest-signup

**Private full record (after repo invite):** https://github.com/subtiliorars-sys/DrivingMeNuts/issues/new?template=playtest-signup

**Session feedback (private, after invite):** https://github.com/subtiliorars-sys/DrivingMeNuts/issues/new?template=playtest-feedback

**In-game (browser / itch):** tap **FEEDBACK** on the bottom HUD or in **Settings** — opens a pre-filled GitHub form (no URL copy-paste).

**Public play links (advertise these only):**
- itch.io: https://subtiliorars.itch.io/jimmythehat-driving-me-nuts
- GitHub Pages: https://subtiliorars-sys.github.io/DrivingMeNuts/

---

## Before you play

1. Read [PLAYTEST.md on the Preview repo](https://github.com/subtiliorars-sys/DrivingMeNuts---Preview/blob/main/PLAYTEST.md).
2. Submit the **[playtest signup form](https://github.com/subtiliorars-sys/DrivingMeNuts---Preview/issues/new?template=playtest-signup)** (creates a stored GitHub issue).
3. Wait for the owner to confirm and send **GitHub invite** or a **playable URL**.
4. Do **not** share screenshots, streams, or build files publicly unless the owner explicitly OKs it for that session.

---

## Playtest & Confidentiality Agreement

*(Template — not legal advice. Owner may adapt or run past counsel.)*

**Project:** Driving Me Nuts (pre-release game)  
**Playtester name:** __________________________  
**Email:** __________________________  
**Date:** __________________________  

I agree:

1. **Confidentiality.** The game, builds, art, dialogue, economy tuning, and any materials the owner shares are confidential. I will not copy, redistribute, leak, or publicly post them (including social media, streams, or screenshots) without **written OK** from the project owner.
2. **Access.** I will use access only to playtest and give feedback. I will not scrape, datamine for redistribution, or attempt to bypass access controls.
3. **Feedback.** I grant the project a perpetual, royalty-free license to use my playtest feedback, bug reports, and suggestions without obligation to credit or compensate me, unless we sign a separate paid contract.
4. **No employment.** I understand this is volunteer / beta playtesting unless a separate paid agreement says otherwise.
5. **Stop anytime.** I may stop participating at any time; confidentiality for materials I already received still applies.
6. **Education, not advice.** The game teaches small-business *concepts* in a fictional setting. It is **not** financial, legal, tax, or allergy/safety advice for real businesses or diets.
7. **Privacy.** The demo stores progress in **browser local storage only** (no account). I will use a test browser profile if asked and will not play on shared machines with sensitive data without clearing storage afterward.

**Signature (type full name):** __________________________  

**Send signed copy to:** *(owner fills in — e.g. playtest@yourdomain or DM channel)*

---

## How to run the build (after owner confirms access)

### Option A — Private HQ repo (full current build)

```bash
git clone https://github.com/subtiliorars-sys/DrivingMeNuts.git
cd DrivingMeNuts
npm install
npm start
```

Opens the game in your browser (port 3000). First-time only: `npm install`.

### Option B — Playable URL

*(Owner adds when GitHub Pages / deploy is live — check PLAYTEST.md on Preview for updates.)*

---

## What to play (first session ~30–45 min)

| Phase | Goal |
|-------|------|
| **Fresh start** | Clear save if prompted; complete the **3-step tutorial** (buy → roast slot → end day → read report). |
| **Days 2–3** | Try changing price, buying raw stock, one roast batch, end day again. |
| **Optional** | Open Upgrades, Books, or Goals once; note anything confusing. |

**Accessibility:** Browser zoom **Ctrl +** / **Ctrl −** works. In-game Settings includes reduced-motion and color-blind options if present in your build.

---

## Report back

Use this template (GitHub issue, email, or owner’s feedback form):

```
Environment: browser + OS + desktop/mobile
Build: git commit or date owner sent access
Session length: ~__ min

Blockers:
1.

Confusing / not fun:
1.

Wrong lesson (game taught something that felt incorrect about business):
1.

Bugs (steps to reproduce):
1.

Nits / polish:
1.
```

**Do not file issues for:** trademark decisions, marketing copy, deploy, or allergy policy changes — those stay on the owner queue (`docs/RISK_REGISTER.md`).

---

## References (HQ)

| Doc | Use |
|-----|-----|
| [`START_HERE.md`](../START_HERE.md) | Owner-facing quick start |
| [`docs/PLAYTEST-2026-06-13.md`](PLAYTEST-2026-06-13.md) | Example automated smoke scope |
| [`docs/DARK_PATTERN_GATE.md`](DARK_PATTERN_GATE.md) | What we refuse to ship (pressure/FOMO) |
| [`docs/ALLERGY_REVIEWER_BRIEF.md`](ALLERGY_REVIEWER_BRIEF.md) | Separate allergy review track |
| [`docs/WAITLIST_AND_WISHLIST.md`](WAITLIST_AND_WISHLIST.md) | Educator pilot waitlist + Steam wishlist prep |
