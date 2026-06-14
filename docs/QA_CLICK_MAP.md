# QA click map — native game coordinates (480×270)

Used by `scripts/browser-qa.ps1` and game-provost canvas clicks. Origin top-left.

| Key | x | y | Expected feedback |
|-----|---|---|-------------------|
| `boot-start` | 240 | 149 | BootScene → GameScene |
| `buy-raw` | 402 | 121 | Supply modal opens OR tutorial step 0 advances |
| `roast-slot-0` | 80 | 42 | Roast modal OR start roast on empty slot |
| `price-minus` | 346 | 55 | Price decreases |
| `price-plus` | 376 | 55 | Price increases |
| `upgrades` | 402 | 145 | Upgrades modal |
| `end-day` | 430 | 255 | End-of-day flow (if button visible) |

Coordinates are centers of interactive rectangles in `GameScene.create()`.

## Dev QA bridge (automation)

When `npm run dev` is running:

| Target | Handler | Expected flags |
|--------|---------|----------------|
| `buy-raw` | `qaClickBuyRaw()` | `supplyModalOpen: true` |
| `close-supply` | `qaCloseSupplyModal()` | `supplyModalOpen: false` |
| `roast-slot-0` | `qaClickRoastSlot(0)` | `roastModalOpen: true` (supply must be closed) |
| `close-roast` | `qaCloseRoastModal()` | `roastModalOpen: false` |
| `end-day` | `qaClickEndDay()` | `reportOpen: true`, `dayNumber: 2` |
| `dismiss-report` | `qaCloseDayReport()` | `reportOpen: false` |

`npm run qa:browser` runs `tutorial-smoke` using this bridge. Canvas coords above remain for
manual provost checks.

## Adding targets

When adding a new tutorial imperative, add a row here **in the same PR** or game-provost
will FAIL the slice.
