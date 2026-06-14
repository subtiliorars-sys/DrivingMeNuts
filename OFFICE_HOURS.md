# DrivingMeNuts — Office hours

**Cloud worker:** every 2h, 9–5 weekdays (cron offset :20).  
**Verify:** `npm run verify` (sim + boot smoke + build)  
**Browser QA:** `npm run qa:browser` (tutorial smoke; needs dev server on :3000 — use `scripts/dev-single.ps1`)  
**Playtest:** `npm start` (2–5 min on UI waves)

## Volunteer playtest (owner shares with testers)

| Link | Purpose |
|------|---------|
| [Signup form](https://github.com/subtiliorars-sys/DrivingMeNuts---Preview/issues/new?template=playtest-signup) | Agreement + intake (public GitHub issue) |
| [PLAYTEST.md](https://github.com/subtiliorars-sys/DrivingMeNuts---Preview/blob/main/PLAYTEST.md) | Full onboarding guide |
| HQ `docs/PLAYTEST_ONBOARDING.md` | Private-repo clone + feedback templates |

## 5-min PR checklist
1. CI **verify** job green  
2. One wave scope only (`WAVES.md`)  
3. UI wave → play roast/sell loop briefly  
4. Merge same day → next wave auto-picks up  

Sensitive (manual merge): `docs/RISK_REGISTER.md`, legal, deploy workflow changes.
