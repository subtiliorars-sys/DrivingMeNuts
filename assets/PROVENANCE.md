# Asset Provenance — Driving Me Nuts

Every file committed to `assets/` gets a row in the table below.

**Columns:**
- **filename** — path relative to `assets/` (e.g. `sprites/truck_bounce.png`)
- **author/source** — artist name, tool name, or reference URL
- **method** — one of:
  - `human-drawn` — created entirely by a human artist
  - `AI-gen+human-edited` — AI-generated base (Midjourney, DALL-E, etc.) refined by a human at the pixel level
  - `AI-gen` — generated directly with no human pixel edits (rare; approved per-asset)
- **license/permission** — SPDX identifier, CC variant, or brief permission note (e.g. "owner work-for-hire")
- **date** — ISO 8601 (YYYY-MM-DD) of initial commit

**Note — programmer-art rects drawn in code:** colored-rectangle stand-ins that exist only in TypeScript/Phaser draw calls need no entry here. Only committed image/audio files are tracked.

**Platform AI-disclosure stance:** **OWNER-RATIFIED 2026-06-07: DISCLOSE OPENLY.** This PROVENANCE.md ships with the game; store pages and in-game credits state AI-assisted where applicable. Mark method honestly on every entry.

---

| filename | author/source | method | license/permission | date |
|----------|--------------|--------|--------------------|------|
