# Desktop build — Driving Me Nuts

This folder packages the web game (`../dist`, built by Vite) into a native
desktop application with **Electron**, so it can ship on **Steam** and to
**Windows desktops** (macOS / Linux targets are configured too).

It is intentionally self-contained: the web `npm run verify` gate in the repo
root never depends on Electron, and Electron's heavy binaries live only here.

## How it works

- `main.cjs` — Electron main process. Owns the window, native menu (F11
  fullscreen), single-instance lock, and security hardening
  (`contextIsolation`, `sandbox`, no `nodeIntegration`, external links open in
  the OS browser). It loads the exact same game that runs in the browser.
- `preload.cjs` — minimal isolated bridge; exposes only a read-only
  `window.DMN_DESKTOP` marker. The game needs no privileged APIs (it's fully
  offline — zero network, zero data collection, per CRIT-1).
- `scripts/copy-dist.cjs` — copies `../dist` → `./dist` so it can be bundled.
- `scripts/make-icon.cjs` — regenerates `build/icon.png` (a code-drawn roasted
  peanut, no external asset). electron-builder derives the Windows `.ico`.
- `scripts/dev.cjs` — launches Electron against the Vite dev server for HMR.

## Build & run

All commands run **from this `desktop/` folder** unless noted.

```bash
# one-time
npm install

# 1) build the web game (from the REPO ROOT)
cd .. && npm run build && cd desktop

# 2a) run the packaged-style app locally
npm start                  # copies dist, launches Electron

# 2b) live-reload dev (run `npm run dev` in repo root first)
npm run electron:dev

# 3) produce installers
npm run package:win        # → release/  (NSIS installer + portable .exe)
npm run package:dir        # → unpacked app folder (what Steam depots want)
npm run package:linux      # → AppImage
npm run package:mac        # → dmg   (must run on macOS)
```

> Building the **Windows** target from macOS/Linux requires Wine; build on
> Windows or a Windows CI runner for a clean signed result.

## Smoke test (headless)

The shell self-tests under a virtual display — proves the renderer loads the
game and exits non-zero on failure:

```bash
DMN_SMOKE=1 xvfb-run -a ./node_modules/.bin/electron . --no-sandbox
# add DMN_SHOT=/tmp/shot.png            to capture the title screen
# add DMN_START=1 alongside DMN_SHOT    to capture live gameplay
```

## Steam packaging

For Steam you typically ship the **unpacked** build (`npm run package:dir` →
`release/win-unpacked/`) and let Steam's `steamcmd` build the depot; Steam
provides its own installer/updater, so the NSIS installer is for non-Steam
direct distribution. See `../docs/STEAM_RELEASE.md` for the full checklist
(depot layout, Steamworks SDK, store assets, build upload).
