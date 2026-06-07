# Driving Me Nuts — Art Bible (SEED/DRAFT)

**Status:** Seed document; final direction to be refined after concept sign-off and early prototyping.

## Pixel-art foundation

| Property | Target |
|----------|--------|
| **Sprite scale** | 32×32 px base (NPCs, items, truck parts) |
| **Canvas/viewport** | 480×270 px (16:9 window, ~15 tiles wide) |
| **Palette depth** | 16–32 colors per scene (tile set, characters, UI) |
| **Style** | Chunky, readable silhouettes; slightly rounded corners; soft anti-alias on text only |
| **Reference aesthetic** | Stardew Valley, A Short Hike, Dinkum (warm, forgiving, hand-drawn feel in pixels) |

**Rationale:** 32×32 is readable at screen scale; 480×270 is framebuffer-friendly and gives 15 tiles of breathing room. Silhouettes trump detail so that NPCs are recognizable at a glance.

## The truck: "Driving Me Nuts"

**Form factor:** classic food-truck shape (boxy, side-mounted serving window, wheels). Livery tells the story.

### Truck design
- **Body:** warm peanut-shell brown (#8B6F47) base with cream trim (#F5DEB3)
- **Livery:** large peanut graphic on the side (stylized, cute, not anatomical)—could be the mascot (see below) or a simple icon
- **Details:**
  - Small window (player visible inside, roasting)
  - Serving counter with metal hood vent puffing roast smoke (animated)
  - Visible supplies piled on top (burlap sacks, umbrella for market days)
  - Chipped paint / dents = upgrade-to-repair feedback (pristine when new, degrades over play)
- **Personality:** front bumper has a hand-painted "Legumes ≠ Nuts" sticker (referential; humorous, not preachy)

### Truck animations
- **Idle bounce:** gentle 4-frame bounce when parked (2px up/down, slow rhythm) → conveys aliveness
- **Roast smoke:** 3–4 frame wisps drifting up from the hood vent; intensity scales with active roasts
- **Repair damage:** visual cracks/rust patches appear as truck health drops; disappear after repair

## Character design

### Owner/Player character
- **Name (suggestion):** TBD or player-named
- **Frame:** standing next to truck, slightly tired but determined expression
- **Outfit:** apron with roasted-peanut stain, practical shoes, maybe a cap with a legume logo
- **Animation:** walks with a slight shuffle (lazy confidence), spreads hands when pitching ("hey, they're *legumes*, but... know what? Doesn't matter")
- **Emotes:** nod (confirming order), sigh (after legume lecture), smile (sale made)

### Mascot mascot (optional/future)
**Concept:** anthropomorphic peanut character (Mr. Legume / Nutmeg / Shelley / Peatrice).

**If implemented:**
- **Form:** plump legume-pod silhouette, two eyes, small arms/legs, cheerful expression
- **Palette:** golden-brown (#D2B48C) with cream highlight, rosy cheek circles
- **Role:** appears in tutorials, celebrates milestones, can be patted/clicked for small XP bonus
- **Pun-name ideas:** Shelley (shell), Nutkin, Peat (a play on "Pete"), Leggy, Pod

**Sensitivity note:** if the mascot is used in allergy-adjacent scenarios, always frame it supportively (e.g., mascot warns player about customer allergy, not making light of it).

## Sprites & assets

### Peanut products
- **Roasted peanuts (bagged):** 24×24 icon, simple paper bag with a visible peanut cross-section, warm brown gradient
- **Premium roasted:** same bag, with a gold foil label and a small "★" badge
- **Raw peanuts (supplier truck):** similar bag, lighter tan, labeled "RAW"
- **Variety items (future):** honey-roasted (golden), salted (sparkle), chocolate-drizzle (dark accent)

### NPCs & silhouettes
Aim for ~12 distinct silhouettes (different heights, body shapes, accessories). Each should be recognizable in motion.

- **Legume Lecturer A (Dr. Pedant):** tall, thin, glasses accessory, walks with nose up
- **Legume Lecturer B (Concerned Parent):** shorter, wider stance, briefcase or bag, protective body language
- **Office Worker (suit):** narrow shoulders, briefcase, hurried walk
- **Market Vendor:** apron, wider base, relaxed stance
- **Student:** short, backpack, bouncy gait
- **Senior (kindly):** walking cane, slower pace, gentle smile
- **Tourist (lost):** hat, camera, looking around
- **Chef (enthusiast):** tall hat, chef's jacket, animated hands

Each has 2–3 walk frames and a conversation idle pose. Frame count: ~40–50 sprites for all NPCs + player.

## Palettes

### Palette A: "Golden Market" (daytime)
| Element | Hex | Swatch use |
|---------|-----|-----------|
| Sky | #FFFFCC | Clear background |
| Shadow | #99663D | Under vehicles, trees |
| Truck body | #8B6F47 | Brown base |
| Truck trim | #F5DEB3 | Cream accent |
| Roasted brown | #6B4423 | Peanut bodies, roasted detail |
| Grass | #7CB342 | Park/field areas |
| Market awning | #FF9800 | Food stall accent, attention draw |
| Text/UI | #2C2416 | Dark brown on light |

### Palette B: "Market Dusk" (evening, seasonal)
| Element | Hex | Swatch use |
|---------|-----|-----------|
| Sky | #2B2851 | Deep purple twilight |
| Accent light | #FDB813 | Lamplight, fireflies, excitement |
| Truck body | #5A4939 | Muted, shadowed |
| Truck trim | #E8D7C3 | Warm in low light |
| Grass | #556B2F | Olive, moody |
| Market awning | #C0392B | Deep red, warm glow |
| Text/UI | #FDB813 | Light on dark |
| Roast glow | #FF7A00 | Oven/grill glow (animate) |

### Palette C: "Early morning rest" (quiet/respawn)
| Element | Hex | Swatch use |
|---------|-----|-----------|
| Sky | #E8DEC9 | Pale warm dawn |
| Truck body | #9D8678 | Soft, muted |
| Grass | #A4AC86 | Muted sage |
| Market awning | #D4AF37 | Muted gold |
| Text/UI | #5C5A52 | Warm gray |

**Note:** Palette swaps happen at zone change or time-of-day event; no per-frame recoloring. Accent color (#FF9800 / #FDB813 / #D4AF37) is the "look at me" signal for active UI and loot pops.

## UI & animation priorities

### High priority
1. **Coin/currency pops:** when you earn money, a "+$X" label floats up and fades, turning from white to golden
2. **Truck bounce:** idle animation signals the vehicle is alive and ready
3. **Roast smoke:** visual cue that food is cooking and time is passing
4. **NPC emotion bubbles:** simple icons above NPC heads (speech bubble, exclamation, confused face)

### Medium priority
5. **Price/demand feedback:** UI flashes red (too expensive) or green (good deal) as you adjust pricing
6. **Location-zone transitions:** smooth fade or slide when moving between areas; map scrolls to new zone
7. **Upgrade/unlock animations:** pulsing glow on unlocked items; brief celebration sprite when purchased

### Low priority (v1.1+)
- Detailed roasting-process animation (flames, bubbling)
- Customer walk cycles beyond north/south/east/west
- Parallax scrolling backgrounds

## Visual references (no copy, inspiration only)

- **Stardew Valley:** readability, warm palette, cozy NPC interactions
- **A Short Hike:** soft, inviting world; character charm without anime
- **Dinkum:** Australian outback charm and critter-care; animal silhouettes
- **Overcooked:** bright, chunky UI; clear action-feedback; cooperative chaos energy
- **FTL: Faster Than Light:** room-based management; warm lighting; tight visual feedback

## Next steps
1. Prototype truck sprite in context (truck + 480×270 scene)
2. Build one NPC walk-cycle to confirm silhouette readability
3. Test Palette A in-game; refine accent colors if text/UI feels muddy
4. Collect reference screenshots for "warm pixel charm" (existing published games) and share for consensus

---

**Draft note:** This seed is meant for rough direction and conversation. Exact pixel counts, animation timings, and tile-map scales will be finalized during pre-production sprint.
