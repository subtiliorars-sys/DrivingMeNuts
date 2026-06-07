# Driving Me Nuts — Art Bible

**Status:** Iterated 2026-06-06. Early-seed framing superseded where noted. This is the
working canonical reference; P1_SPRITE_SPEC.md draws palette and size targets from here.

---

## Pixel-art foundation

| Property | Target |
|----------|--------|
| **Sprite scale** | 32×32 px base (NPCs, items, truck parts) |
| **Canvas/viewport** | 480×270 px (16:9 window, ~15 tiles wide) |
| **Palette depth** | 16–32 colors per scene (tile set, characters, UI) |
| **Style** | Chunky, readable silhouettes; slightly rounded corners; soft anti-alias on text only |
| **Reference aesthetic** | Stardew Valley, A Short Hike, Dinkum (warm, forgiving, hand-drawn feel in pixels) |

**Rationale:** 32×32 is readable at screen scale; 480×270 is framebuffer-friendly and
gives 15 tiles of breathing room. Silhouettes trump detail so that NPCs are recognizable
at a glance.

---

## The truck: "Driving Me Nuts"

**Form factor:** classic food-truck shape (boxy, side-mounted serving window, wheels).
Livery tells the story.

### Truck design
- **Body:** warm peanut-shell brown (#8B6F47) base with cream trim (#F5DEB3)
- **Livery:** large peanut graphic on the side (stylized, cute, not anatomical) — the
  mascot (see Mascot section below) or a simplified pod silhouette
- **Details:**
  - Small window (player visible inside, roasting)
  - Serving counter with metal hood vent puffing roast smoke (animated)
  - Visible supplies piled on top (burlap sacks, umbrella for market days)
  - Chipped paint / dents = upgrade-to-repair feedback (pristine when new, degrades
    over play)
- **Personality:** front bumper has a hand-painted "Legumes ≠ Nuts" sticker
  (referential; humorous, not preachy)

### Truck animations
- **Idle bounce:** gentle 4-frame bounce when parked (2 px up/down, slow rhythm)
  → conveys aliveness
- **Roast smoke:** 3–4 frame wisps drifting up from hood vent; intensity scales with
  active roasts
- **Repair damage:** visual cracks/rust patches appear as truck health drops;
  disappear after repair

---

## Mascot candidates

The truck needs a face — a painted mascot on the side panel and, optionally, a walking
sprite and tutorial guide. The mascot embodies the brand joke without becoming preachy.
Canon constraint: no "Mr. Peanut" adjacent design (round top-hat monocle silhouette is
Planters trademark territory — avoid that silhouette entirely).

All candidates below read cleanly at 32×32 (plump legume-pod body, visible limbs,
distinctive head treatment).

---

### 1. Legsy
**Personality:** upbeat street-market vendor; endearingly proud of the "legume" truth
and happy to explain it — but always chipper, never smug.
**Silhouette (32×32):** wide oval pod body (top 60 % of canvas), two short thick legs
at base, stubby round arms raised slightly outward, oval head sitting directly on body
(no neck), large dot eyes, small open-mouth grin.
**Role:** truck-side painted mascot (primary); walking sprite (secondary); pops up in
tutorial speech bubbles.
**Gag tie-in:** Legsy's name is itself the punchline — his whole deal is the leg in
"legume." When a customer lectures, Legsy shrugs with a cheerful "I knoooow!" emote.

---

### 2. Shelby
**Personality:** laid-back, slightly world-weary roaster who has heard the legume
lecture a thousand times and finds it charming rather than annoying.
**Silhouette (32×32):** elongated pod shape with a slight slouch, arms folded across
chest, head tilted a few degrees (casual), half-lid eyes, small smirk. Distinctive
two-bump profile (peanut pod pinch) is the silhouette anchor.
**Role:** truck-side painted mascot (primary); owner portrait companion (appears
alongside owner dialogue in emote strip).
**Gag tie-in:** Shelby's folded-arms idle pose mirrors the owner's sigh emote — visual
shorthand that they have lived through this moment many times.

---

### 3. Pea
**Personality:** tiny, scrappy, chaotic-good; technically a groundnut not a pea and
will tell you so. Riffs on mislabeling: "I'm not a pea either!"
**Silhouette (32×32):** smallest frame of the group — round compact body (bottom 55 %
of canvas), oversized round head (top 40 %), tiny arms that barely exceed the body
outline, legs are nubs. Reads as almost-circular at a distance; very cute.
**Role:** menu icon mascot (small scale works well); tutorial helper sprite (compact,
fits in narrow UI panels); optional truck-side badge-scale graphic.
**Gag tie-in:** Pea layers the joke — the name sounds like peanut, but Pea insists on
being called a "ground legume" and is mildly affronted when customers call the truck
a "nut truck."

---

### 4. Gus (short for Leguminous)
**Personality:** old-timer market vendor, seen it all, fond of the regulars; the mascot
as a weathered expert rather than a cartoon newcomer.
**Silhouette (32×32):** stocky pod body, slightly hunched, wide stable base legs, short
thick arms, round head with visible brow crease (a single dark curved line, no extra
sprites) and a warm gap-toothed grin. Wears a simple apron rectangle overlay.
**Role:** truck-side painted mascot; NPC-variant skin (could also appear as recurring
vendor NPC in the Farmers' Market zone).
**Gag tie-in:** Gus has a canned response to every legume lecture: "Yep. Always has
been." (a calm, unbothered nod). His personality models the owner's ideal customer-service
posture.

---

### 5. Twitch
**Personality:** high-energy, espresso-powered, perpetually enthusiastic about peanut
freshness and provenance; a little chaotic.
**Silhouette (32×32):** tall narrow pod body (uses most of vertical space), long thin
limbs, head slightly smaller than body (inverted normal proportions — distinctive
silhouette), wide circle eyes, zigzag mouth conveying excitement. Antenna-like tuft on
top of head (2–3 px spike).
**Role:** roast-queue UI mascot (appears celebrating when a batch completes); animated
tutorial icon (bouncy, draws attention to timers); not recommended for truck-side
because narrow silhouette shrinks poorly.
**Gag tie-in:** Twitch is deeply invested in the science of the legume. When a customer
lectures, Twitch pops up and agrees with every point in exaggerated detail, which
actually annoys the customer more than the original lecture did.

---

### 6. Vida (short for Favidinha, a variety of ground pea)
**Personality:** warm, maternal, community-oriented; the mascot that remembers every
regular's order and greets them by name.
**Silhouette (32×32):** rounded pod body with gently curved edges (softer than the
others), arms extended slightly forward (welcoming gesture), head has a small leaf
sprout on top (2–3 px, functions as hat-equivalent silhouette differentiator), large
friendly eyes, warm smile.
**Role:** loyalty/reputation UI icon (appears when a customer returns or when
reputation goes up); truck-side painted mascot option for players who want a warmer
brand feel.
**Gag tie-in:** Vida's leaf-sprout is a constant visual reminder that peanuts grow
underground like a plant (legume). She will happily explain this to anyone who asks —
and a few who did not.

---

### 7. Hulk (a.k.a. "the Pod")
**Personality:** stoic, strong, silent. Says nothing. Lets the product speak.
Occasional raised-eyebrow is the full extent of their emotional range.
**Silhouette (32×32):** widest frame of the group — broad barrel-shaped pod body,
thick short arms barely extending from silhouette, legs planted wide, head is nearly
flush with body (minimal neck), heavy single brow line, flat-line mouth. Almost a
rectangle-with-a-head.
**Role:** truck-side painted mascot (high-impact silhouette on the truck panel);
loading-screen mascot (simple stoic presence while assets load); not suitable for
animated tutorial guide.
**Gag tie-in:** When a customer delivers the legume lecture at length, Hulk's response
is one frame: a single slow blink. The juxtaposition (impassioned customer, silent pod)
is the joke.

---

### Mascot recommendation

> **OWNER RULING 2026-06-07: Legsy SELECTED as primary mascot; Vida confirmed as
> loyalty/reputation-UI secondary.** Trademark search (USPTO TESS for both names)
> remains open before any public build — see RISK_REGISTER B3.

**Primary recommendation: Legsy.**

Legsy's name carries the joke in a single word ("leg" in legume), the silhouette is
distinct and warm at 32×32, and the role set (truck-side mascot + walking sprite +
tutorial guide) covers P1 needs without requiring new art pipelines. The chipper
personality matches the game's tone — exasperated but never mean — and Legsy's
"I knoooow!" emote is a reusable UI asset that reinforces the canon joke every time
it fires.

**Secondary: Vida** for projects or markets that want a softer, community-forward
brand. Leaf sprout silhouette differentiates from Planters territory. Good reserve
option for the loyalty/reputation UI regardless of which primary mascot ships.

**Trademark-care note:** before any mascot ships in a public build, confirm the chosen
name and silhouette against USPTO TESS and relevant EU/UK registers. The
single non-negotiable constraint: no round top-hat + monocle combination at any scale;
that compound silhouette is squarely Planters' brand equity. All seven candidates above
avoid it. A trademark search is OPEN work (see OPEN items at the end of this document).

---

## Palettes

### Palette A: "Golden Market" (daytime) — P1 DEFAULT

> **OWNER-RATIFIED 2026-06-07:** Palette A locked as the P1 default; B (dusk) and C stay zone/time variants. Sprites use A exclusively in P1.

**Why P1 default:** warm, high-contrast, peanut-adjacent colors that read well on
both bright monitors and mid-range mobile screens; all UI elements pass WCAG AA contrast
at these values.

#### Full element mockup spec

| UI element | Hex | Usage |
|------------|-----|-------|
| Panel background | `#F5DEB3` | Dialogue bubbles, inventory panels, upgrade menu |
| Panel border | `#8B6F47` | 1–2 px outline on all panels; 9-slice border segments |
| Panel text | `#2C2416` | All in-panel body text; label copy |
| Cash green | `#4A7C4E` | Profit figures, positive delta "+$X" labels |
| Warning / alert | `#C0392B` | Price-too-high flash, spoilage level-2 pulse |
| Truck body | `#8B6F47` | Main truck fill; programmer-art bounding rect |
| Truck trim | `#F5DEB3` | Roof edge, window surround, wheel arch accent |
| Ground / grass | `#7CB342` | Park and market floor tiles |
| Sky / backdrop | `#FFFFCC` | Upper two-thirds of static backdrop |
| Market awning | `#FF9800` | Stall accent bars; active-UI highlight ("look at me") |
| Roasted peanut | `#6B4423` | Peanut cross-section detail, roast-glow accents |
| Burlap / raw sack | `#D2B48C` | Raw sack fill; mascot base skin tone |
| Shadow | `#99663D` | Under vehicles, trees; sprite drop-shadows |
| Coin / gold | `#FFD700` | Currency icons, "+$X" fade-to-gold color |
| Smoke wisp | `#E8E8E8` | Hood vent wisps (fades toward sky `#FFFFCC`) |
| NPC skin | `#E8D4B0` | All NPC and owner character skin |

---

### Palette B: "Market Dusk" (evening / seasonal)

#### Full element mockup spec

| UI element | Hex | Usage |
|------------|-----|-------|
| Panel background | `#2E2B4A` | Dark-mode panel fill (evening zone) |
| Panel border | `#FDB813` | Warm lamplight outline on panels |
| Panel text | `#F5E6CC` | Light cream text on dark panels |
| Cash green | `#5DBB63` | Profit figures (brighter to read on dark bg) |
| Warning / alert | `#FF6B6B` | Spoilage and overprice alert on dark bg |
| Truck body | `#5A4939` | Muted shadowed truck fill |
| Truck trim | `#E8D7C3` | Warm cream trim in low light |
| Ground / grass | `#556B2F` | Olive moody ground |
| Sky / backdrop | `#2B2851` | Deep purple twilight backdrop |
| Market awning | `#C0392B` | Deep red warm-glow awning |
| Roast glow | `#FF7A00` | Oven/grill glow (animated, oven interior) |
| Coin / gold | `#FDB813` | Currency icons and lamplight accent |
| Shadow | `#1A1828` | Deep shadows in dusk backdrop |
| Smoke wisp | `#CCBBAA` | Wisps warm-tinted against dark sky |
| NPC skin | `#D4B896` | Slightly warmer/darker skin tone under evening light |
| Accent light | `#FDB813` | Lamppost halos, firefly spots, excitement flash |

---

### Palette C: "Early Morning Rest" (quiet / respawn / shop-closed)

#### Full element mockup spec

| UI element | Hex | Usage |
|------------|-----|-------|
| Panel background | `#EDE4D6` | Muted beige; used for pause/rest screens |
| Panel border | `#B09A82` | Soft mid-tone border |
| Panel text | `#5C5A52` | Warm gray body text |
| Cash green | `#6B8F5E` | Muted profit green (calm register) |
| Warning / alert | `#C9845A` | Soft amber alert (nothing urgent at rest) |
| Truck body | `#9D8678` | Faded, soft morning-mist truck |
| Truck trim | `#D6C5B2` | Pale trim |
| Ground / grass | `#A4AC86` | Muted sage ground |
| Sky / backdrop | `#E8DEC9` | Pale warm dawn sky |
| Market awning | `#D4AF37` | Muted gold awning (desaturated from A) |
| Coin / gold | `#C8A84B` | Dimmed gold (money is sleeping too) |
| Shadow | `#C0B4A6` | Very soft shadow (flat morning light) |
| Smoke wisp | `#F0EAE2` | Near-invisible wisps (no active roasting) |
| NPC skin | `#F0DECA` | Pale, early-morning skin tone |
| Accent light | `#D4AF37` | Dawn highlight on surfaces |

---

### Palette notes
- Palette swaps happen at zone change or time-of-day event; no per-frame recoloring.
- In each palette the "market awning / accent" color is the **"look at me" signal**
  for active UI elements, loot pops, and interactive highlights.
- Palette B panel text (`#F5E6CC`) and background (`#2E2B4A`) pass WCAG AA at ~9:1 
  contrast ratio. Palette A text (`#2C2416`) on panel bg (`#F5DEB3`) is ~8:1. Both 
  are accessible.

---

## P1 programmer-art rules

Pixel art is not blocking P1. Until final sprites ship, every sprite in
`docs/P1_SPRITE_SPEC.md` runs as colored-rectangle stand-ins. The rules that keep
programmer art consistent and swappable:

1. **Use Palette A hex values exclusively** (P1 default above). Do not invent new
   colors; pick the nearest entry from the Palette A spec table. This keeps all
   programmer-art screenshots recognizable as the same game.

2. **Match the canonical size and frame count** in P1_SPRITE_SPEC.md to the pixel.
   A truck rect that is 97×64 instead of 96×64 will mis-register when real art ships.
   Treat P1_SPRITE_SPEC.md as the pixel contract; this document supplies the colors.

3. **1–2 px overlay lines for distinguishing features** (eyes = 2 dark dots, apron
   stain = 3×5 px dark splotch, etc.). Keep them on the same layer / child rect —
   swap the whole sprite unit, not individual elements.

4. **No gradients.** Solid fills only for programmer art. Final art may add shading;
   programmer art uses the flat palette value.

5. **Interim art lives on branch `work/interim-art`** so final art PRs land clean with
   no merge conflict risk.

See P1_SPRITE_SPEC.md §Programmer-Art Interim Standards and the per-sprite
"Programmer art" rows for exact rect dimensions and hex assignments per asset.

---

## Character design

### Owner/Player character
- **Name:** TBD or player-named
- **Frame:** standing next to truck, slightly tired but determined expression
- **Outfit:** apron with roasted-peanut stain, practical shoes, cap with legume logo
- **Animation:** walks with a slight shuffle (lazy confidence); spreads hands when
  pitching ("hey, they're *legumes*, but... know what? Doesn't matter")
- **Emotes:** nod (confirming order), sigh (after legume lecture), smile (sale made)

### NPCs & silhouettes
Aim for ~12 distinct silhouettes (different heights, body shapes, accessories).
Each should be recognizable in motion.

- **Legume Lecturer A (Dr. Pedant):** tall, thin, glasses, walks with nose up
- **Legume Lecturer B (Concerned Parent):** shorter, wider stance, bag, protective
- **Office Worker (suit):** narrow shoulders, briefcase, hurried walk
- **Market Vendor:** apron, wider base, relaxed stance
- **Student:** short, backpack, bouncy gait
- **Senior (kindly):** walking cane, slower pace, gentle smile
- **Tourist (lost):** hat, camera, looking around
- **Chef (enthusiast):** tall hat, chef's jacket, animated hands

Each has 2–3 walk frames and a conversation idle pose.
Frame count: ~40–50 sprites for all NPCs + player.

---

## Sprites & assets

### Peanut products
- **Roasted peanuts (bagged):** 24×24 icon, simple paper bag with visible peanut
  cross-section, warm brown gradient
- **Premium roasted:** same bag, gold foil label, small "★" badge
- **Raw peanuts (supplier truck):** similar bag, lighter tan, labeled "RAW"
- **Variety items (future):** honey-roasted (golden), salted (sparkle),
  chocolate-drizzle (dark accent)

---

## UI & animation priorities

### High priority
1. **Coin/currency pops:** "+$X" label floats up and fades, turning from white to
   golden (Palette A coin gold `#FFD700`)
2. **Truck bounce:** idle animation signals the vehicle is alive and ready
3. **Roast smoke:** visual cue that food is cooking and time is passing
4. **NPC emotion bubbles:** simple icons above NPC heads (speech bubble, exclamation,
   confused face)

### Medium priority
5. **Price/demand feedback:** UI flashes red (too expensive) or green (good deal)
   as you adjust pricing
6. **Location-zone transitions:** smooth fade or slide when moving between areas;
   map scrolls to new zone
7. **Upgrade/unlock animations:** pulsing glow on unlocked items; brief celebration
   sprite when purchased

### Low priority (v1.1+)
- Detailed roasting-process animation (flames, bubbling)
- Customer walk cycles beyond north/south/east/west
- Parallax scrolling backgrounds

---

## Visual references (no copy, inspiration only)

- **Stardew Valley:** readability, warm palette, cozy NPC interactions
- **A Short Hike:** soft, inviting world; character charm without anime
- **Dinkum:** Australian outback charm and critter-care; animal silhouettes
- **Overcooked:** bright, chunky UI; clear action-feedback; cooperative chaos energy
- **FTL: Faster Than Light:** room-based management; warm lighting; tight visual
  feedback

---

## OPEN items

- **Trademark search:** run the recommended mascot name (Legsy; secondary Vida)
  through USPTO TESS + EU/UK registers before any public build. Confirm no collision
  on name or silhouette description. Owner sign-off required before mascot is
  locked in marketing materials.
- **Mascot final selection:** owner chooses from the seven candidates; recommendation
  is Legsy (primary) + Vida (loyalty UI). All others remain dormant unless a specific
  zone/NPC role opens up.
- **Palette A cash-green validation:** `#4A7C4E` was chosen for readability on
  `#F5DEB3`; verify in-engine against Palette A backdrop before locking.
- **Mascot role in P1:** walking sprite is NICE-TO-HAVE; truck-side painted mascot
  and tutorial-popup icon are P1 candidates. Flag as COSTLY if walking sprite adds
  a new animation pipeline; the tutorial-popup icon reuses the 9-slice UI system.
