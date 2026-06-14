# Browser QA — Phaser / canvas games

Driving Me Nuts (and most Phaser prototypes) render to **`<canvas>`**, not DOM buttons.
`corps-browser snapshot -i` returns `(no interactive elements)` — that is expected, not a
pass.

## game-provost procedure (canvas)

1. `npm run dev` — note URL (this repo: **http://localhost:3000**, see `vite.config.ts`).
2. `corps-browser open <url>` — wait 3–5s for BootScene → GameScene.
3. Screenshot boot state: `corps-browser screenshot %USERPROFILE%\screenshots\<game>-boot.png`
4. Click using **game-native coordinates** (480×270) scaled to canvas CSS pixels (see
   `QA_CLICK_MAP.md`).
5. Re-screenshot after each action; assert visible change (modal, stock text, tutorial step).
6. `corps-browser close`

### Click helper (PowerShell)

From repo root:

```powershell
.\scripts\browser-qa.ps1 -Action boot-screenshot
.\scripts\browser-qa.ps1 -Action click -Target buy-raw
.\scripts\browser-qa.ps1 -Action click -Target roast-slot-0
```

Uses `corps-browser eval` to map game coords → canvas client coords and dispatch pointer
events.

## Tutorial audit (canvas)

Grep `GameScene.ts` (and copy) for imperatives: **tap, click, buy, select**.

| Tutorial step | Copy | Target key (`QA_CLICK_MAP`) |
|---------------|------|-----------------------------|
| 0 | Buy raw peanuts | `buy-raw` |
| 1 | Tap empty slot | `roast-slot-0` |
| 2 | Watch the report tonight | `end-day` (after playable slice) |

Each target must produce observable feedback when clicked via the script above.

## When DOM QA applies

HTML/React prototypes: use normal `snapshot -i` + `@eN` refs (`agent-browser skills get
dogfood`).

## Automated fallback (no browser)

`npm run test:boot` — headless Phaser smoke (scene boot, HUD, slot arrays, tutorial
interactables via pointerdown). Does **not** replace browser QA for full input paths.

## Dev QA bridge (recommended for automation)

When `npm run dev` is running:

- `window.__DMN_GAME__` — Phaser game instance
- `window.__DMN_QA__.flags()` — modal state + `dayNumber` + `inPostReportChain`
- `window.__DMN_QA__.click(target)` — invokes the same handlers as UI pointerdown:
  - `buy-raw` — opens supply modal (tutorial step 0)
  - `close-supply` — dismisses supply modal (needed before step 1 in smoke)
  - `roast-slot-0` — opens roast modal on empty slot (tutorial step 1)
  - `close-roast` — dismisses roast modal (needed before step 2)
  - `end-day` — opens end-of-day report (tutorial step 2)
  - `dismiss-report` — closes report / starts post-report chain

`npm run qa:browser` runs `tutorial-smoke` via this bridge. Synthetic canvas pointer
events from corps-browser do not reliably reach Phaser interactives; use the bridge for
CI-style gates and keep canvas coords in `QA_CLICK_MAP.md` for manual checks.
