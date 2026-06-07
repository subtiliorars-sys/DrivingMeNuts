# P1 Sprite Specification — Driving Me Nuts

**Status:** Placeholder inventory for parallel art production.  
**Scope:** P1 idle-core slice (truck, roasting queue, customers, basic UI).  
**Updated:** 2026-06-06

---

## Overview

This document defines every sprite needed for P1 (16 total; 10 blocking). Each entry includes:
- **Canonical size & frame count** (per ART_BIBLE.md base: 32×32 px)
- **Animation spec** (fps, looping behavior)
- **Palette reference** (drawn from ART_BIBLE.md Palettes A/B/C)
- **Priority** (P1-blocking vs. nice-to-have)
- **Programmer-art interim color** (hex from palette, for colored-rect stand-in)

---

## Sprite Inventory

### 1. **Truck – Idle Bounce** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 96×64 px (truck is ~3 tiles wide) |
| **Frames** | 4 (up-down-up-idle) |
| **Animation** | 2 fps, looping, smooth ease |
| **Palette** | Palette A (Golden Market) — body #8B6F47, trim #F5DEB3, window #2C2416 |
| **Programmer art** | Bounding rect (body #8B6F47), trim bar (top #F5DEB3), window rect (dark #2C2416), wheels circles (dark #333), smoke wisps (light gray #CCC) |
| **Detail notes** | Truck idle bounce (2 px oscillation) conveys aliveness. Include visible serving window (small, shows roasting interior) + hood vent with smoke puff (animated separately, see #2). |

### 2. **Roasting Hood Smoke Wisps** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 48×48 px (floats above truck) |
| **Frames** | 4 (wisp drift up & fade) |
| **Animation** | 3 fps, looping, soft fade-out on last frame |
| **Palette** | Palette A — smoke #E8E8E8 (light gray), fade to sky #FFFFCC |
| **Programmer art** | 3–4 circles (decreasing opacity, gray #CCCCCC → #F5F5DC) stacked vertically, each offset slightly |
| **Detail notes** | Stack 2–3 wisps overlapping. Smoke intensity scales with active roasts (1 batch = 1 wisp, 3 batches = 3 wisps). Tied to roast timer progress. |

### 3. **Raw Peanut Sack (Supply Item)** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 24×28 px |
| **Frames** | 2 (full, half-depleted) |
| **Animation** | No animation (static swap based on inventory %) |
| **Palette** | Palette A — burlap tan #D2B48C, rope/tie #8B6F47, label #2C2416 (text "RAW") |
| **Programmer art** | Brown rect (burlap #D2B48C), dark band at top (tie #8B6F47), small dark label rect at bottom (text anchor) |
| **Detail notes** | 2-frame variant: full sack (25% wider) vs. depleted sack (slack). Used in inventory UI + queue display. |

### 4. **Roasted Peanut Bag (Product Item)** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 24×32 px |
| **Frames** | 3 (basic, premium/foil, sold-out dim) |
| **Animation** | No animation (static, frame chosen by flavor tier) |
| **Palette** | Palette A — bag paper #F5DEB3, roasted peanut cross-section visible #6B4423, premium foil #FFD700 (if present) |
| **Programmer art** | Cream rect (bag #F5DEB3), brown oval inset (peanut cross #6B4423, ≈12 px diameter, centered). Premium variant adds small golden circle overlay (top-right, #FFD700). |
| **Detail notes** | Flavor variants share base sprite; premium/standard/discount tiers change frame. No separate sprite per flavor (too many; tint/label in UI instead). |

### 5. **Coin/Cash Pop** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 16×16 px |
| **Frames** | 1 (static coin icon) + floating text label ("+$X", rendered via UI system) |
| **Animation** | Floats up 64 px over 1 sec, fades from white #FFFFFF → golden #FDB813 |
| **Palette** | Palette A/B — coin gold #FFD700, text white→golden |
| **Programmer art** | Small circle (gold #FFD700, 14 px diameter), dark outline (1 px, #8B6F47), '$' symbol or simple cross-hatch pattern |
| **Detail notes** | Spawns at sale location (truck or NPC position), parent to floating text "+$X". One instance at a time; queue if multiple sales in same frame (stagger spawns 200 ms). |

### 6. **Customer NPC – Archetype A: Legume Lecturer (Tall, Thin)** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 28×40 px |
| **Frames** | 4 walk frames (N/S/E/W cardinal 4-dir) + 2 idle poses (talk, listen) |
| **Animation** | Walk 4 fps, idle static |
| **Palette** | Palette A — skin tan #E8D4B0, shirt/jacket blue-gray #5A7A8A, pants dark #3C3C3C, glasses #666 |
| **Programmer art** | Head rect (tall-thin, tan #E8D4B0, 6 px wide × 10 px tall), two small dark dots (eyes), tiny dark line (glasses), rectangular body (shirt #5A7A8A, 8 px wide), tapered legs (dark #3C3C3C). |
| **Detail notes** | Walk cycle: stride left, center, stride right, center (bounces head down/up on stride). Idle pose: neutral stand. Variant (talk): mouth open (small dark line). Variant (listen): tilted head (–2 px shift). |

### 7. **Customer NPC – Archetype B: Concerned Parent (Short, Wide)** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 32×36 px |
| **Frames** | 4 walk frames (N/S/E/W) + 2 idle (protective stance, relaxed) |
| **Animation** | Walk 3 fps (slower), idle static |
| **Palette** | Palette A — skin tan #E8D4B0, dress/jacket red-brown #A0522D, shoes dark #2C2416 |
| **Programmer art** | Head circle (wider than A, 8 px diameter, tan #E8D4B0), eyes dark, body wider (dress #A0522D, 10 px wide × 16 px tall), short legs. Walk: wider stance, no vertical bounce. |
| **Detail notes** | Protective idle: arms slightly raised (small dark lines above shoulders). Relaxed idle: arms down. Slower walk reinforces "cautious" archetype. |

### 8. **Customer NPC – Archetype C: Office Worker (Narrow, Suit)** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 26×38 px |
| **Frames** | 4 walk frames (N/S/E/W) + 2 idle (hurried, impatient) |
| **Animation** | Walk 5 fps (fast), idle static |
| **Palette** | Palette A — skin tan #E8D4B0, suit navy #1C3A47, shirt white #FFFACD, tie dark red #8B0000 |
| **Programmer art** | Head small (6 px, tan #E8D4B0), narrow body (suit #1C3A47, 5 px wide), white vertical stripe (shirt), small red line (tie). Briefcase as separate 12×8 px rect (dark #2C2416), held at side. |
| **Detail notes** | Walk: fast, narrow stride, slight forward lean. Hurried idle: head tilted back (checking watch), arms at sides. Impatient idle: foot tap (alternates one leg raised, 2 px). |

### 9. **Owner/Player Portrait (Emote Variants)** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 32×40 px |
| **Frames** | 2 (neutral/determined, sigh/exasperated) |
| **Animation** | Static; frame chosen by dialogue/story context |
| **Palette** | Palette A — skin tan #E8D4B0, apron khaki #DAA520 (stained dark #6B4423), cap #5A7A8A |
| **Programmer art** | Head circle (8 px diameter, tan), eyes (small dark dots), mouth (neutral: horizontal line; sigh: curved V). Upper body: apron (khaki #DAA520, 12 px wide × 16 px tall), brown stain splotch (5 px × 3 px, #6B4423, offset). |
| **Detail notes** | Used in NPC dialogue UI bubbles above truck. Frame flips to sigh when Legume Gag triggers. Simple emotional range for P1. |

### 10. **District Backdrop (Farmers' Market Static)** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 480×270 px (full viewport, no parallax for P1) |
| **Frames** | 1 (static scene, no parallax) |
| **Animation** | None |
| **Palette** | Palette A (Golden Market) — sky #FFFFCC, grass #7CB342, market stalls (brown #8B6F47, awning #FF9800), tree silhouettes (dark #556B2F) |
| **Programmer art** | Flat color layers: sky rect (top 130 px, #FFFFCC), grass rect (bottom 140 px, #7CB342). Market stall outlines (brown rect 80×60 px, positioned mid-left; orange accent bar at top, #FF9800). Tree circles (dark green #556B2F, 24–40 px diameter, placed background). |
| **Detail notes** | No parallax or scrolling. Simple, readable silhouettes. Tree placement should leave room for truck at bottom-center. Awning and stall provide vertical anchor points for NPC pathfinding UI. |

### 11. **UI 9-Slice Panel (Rounded Corners)** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 8×8 px per corner (expandable center) |
| **Frames** | 1 (static panel) |
| **Animation** | None (drawn by UI layout engine; texture repeats) |
| **Palette** | Palette A — panel body light beige #F5DEB3, border dark brown #8B6F47, text dark #2C2416 |
| **Programmer art** | Four corner rects (8×8 px each, body #F5DEB3, 1 px dark border #8B6F47). Edge segments (horizontal/vertical, 1 px wide, 8 px long, borders #8B6F47). Center region fills with body color. Optional: soft shadow under-layer (dark #333, 2 px blur, opacity 30%). |
| **Detail notes** | Used for dialogue bubbles, inventory UI, upgrade menu, roast queue display. One sheet covers all 9-slice regions; UI engine assembles them. Corners are slightly rounded (beveled 1 px on outer edge). |

### 12. **Icon – Cash/Currency** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 16×16 px |
| **Frames** | 1 (static) |
| **Animation** | None (may animate to draw attention in UI) |
| **Palette** | Palette A/B — icon gold #FFD700, text dark #2C2416, background transparent |
| **Programmer art** | Circle (14 px diameter, gold #FFD700), dark outline (1 px, #8B6F47). '$' symbol or simple cross-hatched pattern. Placed next to currency totals in UI. |
| **Detail notes** | Appears in top-left HUD (cash balance) + sale notifications. Optional: 2-frame pulse animation (scale 90% → 100%, 0.5 sec) when money earned. |

### 13. **Icon – Queue Slot (Roasting Status)** [P1-BLOCKING]
| Property | Value |
|----------|-------|
| **Size** | 20×20 px |
| **Frames** | 3 (empty, roasting, complete) |
| **Animation** | Frame chosen by state (empty static, roasting pulsing, complete static) |
| **Palette** | Palette A — empty slot gray #CCCCCC, roasting active orange #FF9800, complete green #7CB342 |
| **Programmer art** | Rounded rect (18×18 px, corners beveled 1 px). Empty: gray bg #CCCCCC. Roasting: orange bg #FF9800 + 2-frame pulse (scale 90%–100%, 1 sec). Complete: green bg #7CB342, checkmark (small dark line, 1 px, diagonal ✓ shape). |
| **Detail notes** | Grid layout in roast queue UI (5 slots max, horizontally stacked). Each slot shows current batch state + roast timer (text overlay "5m 30s" etc.). |

### 14. **Icon – Timer (Roast Progress)** [NICE-TO-HAVE]
| Property | Value |
|----------|-------|
| **Size** | 16×16 px |
| **Frames** | 1 (clock icon, static; timer display is text) |
| **Animation** | None (animated as part of roast UI countdown) |
| **Palette** | Palette A — clock dark #2C2416, hands gold #FFD700, face cream #F5DEB3 |
| **Programmer art** | Circle (14 px, cream #F5DEB3, 1 px border #2C2416). Two thin lines inside (hands, #FFD700, 1 px, pointing 12 o'clock and 3 o'clock). Placed left of roast timer text. |
| **Detail notes** | Decorative. Real timer is text ("10m 30s" updating each frame). Could optionally animate hand positions to match remaining roast time (cosmetic). |

### 15. **Icon – Warning (Low Stock / Spoilage Alert)** [NICE-TO-HAVE]
| Property | Value |
|----------|-------|
| **Size** | 16×16 px |
| **Frames** | 2 (alert level 1 yellow, alert level 2 red) |
| **Animation** | Level 1 (spoilage > 60 days): pulse 1 Hz, yellow #FFB800. Level 2 (spoilage > 80 days): pulse 2 Hz, red #FF6B6B. |
| **Palette** | Palette A/B — warning yellow #FFB800 (level 1), urgent red #FF6B6B (level 2) |
| **Programmer art** | Exclamation mark (inverted triangle top + dot bottom, 12 px tall, centered). Level 1: yellow fill #FFB800, dark outline #8B6F47. Level 2: red fill #FF6B6B, dark outline #8B0000. Pulsing: scale 90%–110%, varies by alert level. |
| **Detail notes** | Appears in inventory UI above peanut sacks when spoilage risk is high. Nice-to-have: if cut for P1, revert to text label "⚠ Spoiling in 10 days". |

### 16. **Roaster Machine (Idle Visual, Truck Interior)** [NICE-TO-HAVE]
| Property | Value |
|----------|-------|
| **Size** | 48×48 px (visible through truck window) |
| **Frames** | 2 (idle cool, active hot) |
| **Animation** | Frame swaps based on active roasts (idle static, active glow pulse 0.5 Hz) |
| **Palette** | Palette A/B — roaster body dark #3C3C3C, heating coil red #FF7A00 (active), door handle silver #C0C0C0 |
| **Programmer art** | Boxy rect (roaster body, dark #3C3C3C, 40×40 px). Horizontal slit (door, 20 px wide, dark outline). Idle: door shows dark interior #1C1C1C. Active: door shows glowing red coil (#FF7A00, 2-frame pulse), interior darker. Handle small rect (silver #C0C0C0, 4×8 px, right side). |
| **Detail notes** | Visible through truck window when roasting active (part of truck sprite or layered on top). Optional texture detail (grid pattern on heating coil). Nice-to-have because roasting can be conveyed via UI + smoke wisps alone. |

---

## Sheet Layout & File Conventions

### Asset Organization
```
assets/sprites/
  ├── truck_bounce.png       (96×64, 4 frames, 384×64 horizontal sheet)
  ├── smoke_wisps.png        (48×48, 4 frames, 192×48 horizontal sheet)
  ├── peanut_sack_raw.png    (24×28, 2 frames, 48×28 horizontal sheet)
  ├── peanut_bag_roasted.png (24×32, 3 frames, 72×32 horizontal sheet)
  ├── coin_pop.png           (16×16, 1 frame, 16×16 single)
  ├── npc_lecturer.png       (28×40, 6 frames, 168×40 horizontal sheet)
  ├── npc_parent.png         (32×36, 6 frames, 192×36 horizontal sheet)
  ├── npc_worker.png         (26×38, 6 frames, 156×38 horizontal sheet)
  ├── owner_portrait.png     (32×40, 2 frames, 64×40 horizontal sheet)
  ├── backdrop_farmers_market.png (480×270, 1 frame, full-res single)
  ├── ui_panel_9slice.png    (8×8×9 grid, 72×72 spritesheet)
  ├── icon_cash.png          (16×16, 1 frame, single)
  ├── icon_queue.png         (20×20, 3 frames, 60×20 horizontal sheet)
  ├── icon_timer.png         (16×16, 1 frame, single)
  ├── icon_warning.png       (16×16, 2 frames, 32×16 horizontal sheet)
  └── roaster_machine.png    (48×48, 2 frames, 96×48 horizontal sheet)
```

### File Naming & Frame Order
- All multi-frame sheets: **horizontal layout** (frames left-to-right).
- Frame order documented in inline comments (e.g., `// Frames: [0] walk-left, [1] walk-center, [2] walk-right, [3] idle`).
- Single-frame sprites: 1×1 layout (no sheet).
- Max sheet size: **1024×1024 px** (fits GPU texture memory; none of our sheets exceed this).

### Provenance Tracking
All sprites registered in `assets/PROVENANCE.md`:
```markdown
| Sprite | Size | Frames | Status | Provenance |
|--------|------|--------|--------|------------|
| truck_bounce | 96×64 | 4 | Placeholder | Human-drawn design intent |
| smoke_wisps | 48×48 | 4 | Placeholder | Procedural circle study |
| peanut_sack_raw | 24×28 | 2 | Placeholder | Human-drawn reference |
| ... | ... | ... | ... | ... |
```

**Provenance values** (per RISK_REGISTER AI-provenance row):
- `Human-drawn design intent` — artist draws from design spec.
- `AI-gen+human-edited` — Midjourney/DALL-E as reference base, artist refines pixels.
- `AI-gen` — Generated directly, no human edit (rare, only UI icons if approved).

**Platform disclosure:** Owner has not yet decided whether to disclose AI-assisted assets in game credits/help. Leave `[TBD]` in provenance until Owner Decision made. Nothing in P1 forces disclosure yet.

---

## Programmer-Art Interim Standards

While awaiting final art:
1. All sprites drawn as **colored rectangles/circles** (using hex colors from ART_BIBLE palettes).
2. Details (eyes, outlines, stains) added as **1–2 px line overlays** in darker shades.
3. All interim art kept in a **separate branch** (`work/interim-art`) so final art can be swapped in without merge conflicts.
4. Interim sprites packaged identically to final sheets (same path, same frame order) — **no code changes needed** when art replaces programmer art.

---

## Summary

**Total Sprites:** 16  
**P1-Blocking:** 10 (all truck, customer NPCs, UI core, backdrop)  
**Nice-to-Have:** 6 (roaster visual, timer icon, warning icon, and variants)

**Sheet count:** 16 files  
**Total art surface:** ~1.2 MB (when finalized; interim programmer art is text-based geometry, < 100 KB)  

**Next steps:**
1. Artist: Begin with Archetypes A–C (walk cycles highest priority; NPC silhouettes must be readable at 28–32 px).
2. Art lead: Confirm truck idle-bounce and smoke-wisps animations timing with designer (2 fps truck → feels slow but deliberate; 3 fps smoke → wisps drift naturally).
3. Design: Finalize 9-slice panel corner style (beveled vs. sharp); confirm color blocking with Palettes A/B/C.
4. QA: Smoke wisps scale with active-roast count (1/2/3 wisps visible); test spawn/fade-out timing in-engine.
5. Backup: Interim programmer-art fallback ready if final art ships late; game is playable with colored rects on Day 1 of P1.

---

**Document version:** 1.0  
**Last updated:** 2026-06-06
