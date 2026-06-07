# Engine Choice — P0 decision doc (owner decides; this is the comparison)

Constraint set: solo owner on Chromebook/Crostini (no heavy local tooling, no Docker),
AI-swarm-friendly codebase, pixel-art 2D, RPG layer + idle layer, must ship as a **web
build** first (GitHub Pages/Fly), mobile later is a nice-to-have.

## Candidates

| | Phaser 3/4 | Godot 4 (web export) | Kaplay (ex-Kaboom) |
|---|---|---|---|
| Language | JS/TS | GDScript (+ editor) | JS/TS |
| Pixel-art 2D fit | Excellent | Excellent | Good |
| Web build size/perf | Small, fast | Heavy (~30MB+ wasm), slower load | Smallest |
| Crostini dev story | Any text editor + browser | Needs Godot editor app | Editor-free |
| AI-swarm friendliness | High (plain TS files, huge corpus) | Medium (scene files + editor state hard for agents) | High |
| Idle-math/UI heavy game | Strong (DOM overlay possible) | Strong (built-in UI) | Weak UI tooling |
| RPG tilemaps/dialogue | Mature (Tiled support) | Best-in-class | Basic |
| Ecosystem/longevity | Very mature | Very mature | Younger, smaller |
| License | MIT | MIT | MIT |

## Recommendation: **Phaser + TypeScript**
- Editor-free, plain-text codebase = ideal for Crostini + AI swarm agents (every
  mechanic is a reviewable .ts file; no opaque editor scenes).
- Tiny web builds suit the P2 "playable web teaser" gate; DOM overlay handles the
  idle layer's number-heavy UI cheaply.
- Tiled for maps keeps the RPG layer's content pipeline file-based too.

Runner-up: Godot if the RPG layer outgrows Phaser's scene tooling — but the editor
dependency and wasm payload fight both the dev environment and the teaser-size goal.
Kaplay: great for jams; too thin for a two-loop game with heavy UI.

## Exit criterion (per ROADMAP P0)
Owner ratifies this choice (or overrides) → lock in repo CLAUDE.md → P1 vertical
slice starts in the chosen stack. Mitigates RISK_REGISTER "engine choice regret":
P1's slice is deliberately small enough to re-platform if the choice fails.

## Leak note (RISK_REGISTER B5-ext)
Whatever the engine, a client-side web build ships mechanics/economy as readable
code — the P2 leak check applies regardless of choice.
