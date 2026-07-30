# Steam / Desktop Release Checklist — Driving Me Nuts

Status: **Desktop shell shipping-ready** (Electron wrapper builds, launches, and
renders the full game — verified headless via `desktop/` smoke test). This doc
is the runbook to take the build from "runs on my machine" to "live on Steam".

The game itself is fully offline — **zero network, zero data collection**
(RISK_REGISTER CRIT-1) — which keeps the store privacy section trivial and means
no backend to stand up.

---

## 1. Build pipeline

| Step | Command | Output |
|------|---------|--------|
| Build web game | `npm run build` (repo root) | `dist/` |
| Desktop deps | `cd desktop && npm install` | `desktop/node_modules` |
| Windows installer + portable | `npm run package:win` | `desktop/release/*.exe` |
| Steam depot (unpacked) | `npm run package:dir` | `desktop/release/win-unpacked/` |

CI: add a Windows runner job that runs the two build steps and uploads
`win-unpacked/` as the Steam build artifact. The existing `verify.yml` already
guards the game logic on every push.

## 2. Steamworks setup (one-time)

- [ ] Create the Steamworks partner account + app (App ID assigned).
- [ ] Pay the Steam Direct fee per app.
- [ ] Add the **Steamworks SDK** redistributables to the depot (`steam_api64.dll`
      etc.) if you integrate achievements/overlay; pure-offline launch needs none.
- [ ] (Optional) Map the 12 in-game achievements (see `src/data/achievements.ts`)
      to Steam achievements. **Local-only is intentional** for now — no public
      leaderboards/ranking (DARK_PATTERN_GATE A.7 + RISK_REGISTER CRIT-1). Steam
      achievements are private-progress, so they're compatible if desired.

## 3. Depot & build upload

- [ ] Configure depot to ship `desktop/release/win-unpacked/`.
- [ ] Launch executable: `Driving Me Nuts.exe`.
- [ ] Use `steamcmd` / ContentBuilder `app_build_*.vdf` to push to the `default`
      branch; promote to `public` when store page is approved.
- [ ] Set launch options (fullscreen optional — the game already FIT-scales and
      supports F11).

## 4. Store page assets (need art pass)

- [ ] Capsule images (header 460×215, small 231×87, main 616×353, library
      600×900 + hero/logo). Pull from the title screen art + truck.
- [ ] 5+ gameplay screenshots (1280×720 — the desktop smoke test can capture
      these via `DMN_SHOT`/`DMN_START`).
- [ ] 30–60s trailer (capture gameplay; show the legume gag, a day cycle, the
      roast loop, and an end-of-day report).
- [ ] Short + long description (lift the elevator pitch from `docs/CONCEPT.md`).
- [ ] Tags: Cozy, Casual, Simulation, Management, Pixel Graphics, Singleplayer,
      Funny, Economy, Education.
- [ ] System requirements (below).
- [ ] Content rating questionnaire (no violence; flag the **peanut-allergy**
      sensitivity per `docs/ALLERGY_REVIEWER_BRIEF.md` — treated seriously, never
      mocked).

## 5. System requirements (Windows desktop minimum)

- OS: Windows 10 64-bit or later
- CPU: any dual-core 2010+
- RAM: 2 GB (Electron + Phaser canvas; comfortable at 4 GB)
- GPU: any with WebGL2 (integrated is fine — verified rendering under software GL)
- Storage: ~250 MB
- Input: keyboard + mouse (full keyboard controls — see §6)

## 6. Player-facing controls (already implemented)

Mouse/touch for everything, plus keyboard:

| Key | Action |
|-----|--------|
| `S` | Buy raw peanuts (supply) |
| `R` | Open first roast slot |
| `U` | Upgrades |
| `B` | Books (bookkeeping) |
| `G` | Goals / achievements |
| `D` | Change district |
| `M` | Menu / settings |
| `Enter` | End the trading day |
| `Esc` | Back / close modal, or open the menu |
| `N` | Toggle sound (SFX) |
| `J` | Toggle music |
| `F11` | Fullscreen (desktop) |

## 7. Pre-ship QA gate

- [ ] `npm run verify` green (tsc + 450+ unit tests + boot smoke + build).
- [ ] Desktop launch smoke green (`DMN_SMOKE=1` exits 0; renderer loads).
- [ ] Full play session: fresh save → tutorial → first sales → end of day →
      offline return → rescue arc → achievements → reset save.
- [ ] Save/load survives app restart (localStorage persists in Electron).
- [ ] Audio: SFX + music play, mute + music toggles persist across restart.
- [ ] Window: resize, fullscreen toggle, alt-tab, second-launch focuses window.
- [ ] No console errors in the renderer on a clean run.

## 8. Polish backlog (post-launch candidates)

These are tracked in `docs/SYSTEMS_BACKLOG.md` / `docs/ROADMAP.md`; none block a
desktop launch but each raises the bar:

- Authored music/SFX to replace (or layer over) the procedural synth bed.
- The 3 cut-list districts (Waterfront / Downtown / Stadium) from the GDD.
- Controller/gamepad support (Steam Deck verification).
- Steam Cloud save sync (currently local file via Settings → Export/Import).
- Localization pass (strings are centralized enough to extract).
