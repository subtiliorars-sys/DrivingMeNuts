# PLAYTEST NOTE - 2026-07-15 - GAME-AUTO-06

**Scope:** serve -> quip -> response flow timing for the Legume Lore gag.

## Timing observation

- **Serve / sale:** when a sale crosses a `GAG_EVERY_N_LBS_SOLD` bucket, the sim emits a `gag` event in the same tick as the sale.
- **Customer quip:** `GameScene.showGagBubble()` displays the customer line immediately above the truck serving window.
- **Owner response:** the owner reply appears after **1.8 seconds**.
- **Dismissal:** the whole bubble auto-dismisses at **4.0 seconds total** and never blocks input.

## Playtest read

The current cadence gives the customer enough time to land the "well-actually" beat before the owner comeback appears. Watch the longest comeback lines during large-text visual QA: the bubble grows vertically, but the owner response still only has about 2.2 seconds before dismissal.

## Follow-up check

If testers miss the punchline, try a slightly longer total hold for comeback-tier replies only. Keep the first beat at 1.8 seconds so the serve -> quip rhythm stays snappy.
