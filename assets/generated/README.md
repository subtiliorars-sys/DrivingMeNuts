# Generated pixel-art assets

Everything in this folder is **100% code-generated** by
`tools/art/build-assets.cjs` — a dependency-free procedural pixel-art pipeline
(palette + draw primitives + outline pass + nearest-neighbour upscale +
hand-rolled PNG encoder). No external assets, no third-party libraries, no
network. Regenerate any time:

```bash
node tools/art/build-assets.cjs
```

**Provenance / AI-disclosure** (stance: *disclose openly*, owner 2026-06-07):
these are deterministic, code-authored sprites — not sampled, traced, or model-
generated from third-party art. They carry no third-party license obligations.
Because they're reproducible from source, the PNGs themselves are git-ignored
(like `desktop/build/icon.png`); the *generator* is the source of truth.

## Current set (iteration 1)

| Sprite | Use |
|--------|-----|
| `roasted-peanut` | inventory / sale item |
| `peanut-mascot` | Legsy badge / UI accent |
| `coin` | cash / reward pops |
| `star` | ratings / achievements |
| `peanut-bag` | supply / stock |
| `shop-sign` | district / signage |

## Pipeline notes

The generator is the real deliverable — it's the "art tool". Adding a sprite is
a small function returning a `Px` buffer; the outline + upscale + export are
shared. This scales to the full sprite inventory in `docs/P1_SPRITE_SPEC.md`
without ever leaving the repo. Studio-grade output is an iteration count, not a
capability gap: more palette ramps, sub-pixel dithering, and animation frames
all live in the same file.
