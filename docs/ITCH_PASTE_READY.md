# itch.io — Driving Me Nuts (copy-paste ready)

*Use when you create the itch page. Assets in `release/store-assets/`.*

---

## Project settings

| Field | Value |
|-------|-------|
| **Title** | Driving Me Nuts |
| **URL slug** | `jimmythehat-driving-me-nuts` (or your preference) |
| **Full URL** | https://subtiliorars.itch.io/jimmythehat-driving-me-nuts |
| **Developer name** | JimmyTheHat |
| **Kind** | HTML |
| **Price** | **Free** (browser) · Steam/PWYW later optional |
| **Tags** | cozy, pixel-art, idle, simulation, business, comedy, browser, rpg |

---

## Short description

> Run a roasted-peanut food truck. Roast, price, survive the legume lecture. Cozy pixel RPG + honest small-business mechanics. Free in browser by JimmyTheHat.

---

## Full description

```
DRIVING ME NUTS · EARLY ACCESS · FREE IN BROWSER · JIMMYTHEHAT

A cozy pixel-art RPG + idle game where you run a roasted-peanut food truck.
Roast peanuts, set prices, read the market weather, and learn real small-business
mechanics (margins, cash flow, permits) without a spreadsheet.

WHAT YOU GET NOW (P1 SLICE)
• Farmers' Market district — roast queue, pricing, end-of-day reports
• Legume lecture comedy as gameplay (warm, not mean)
• Allergen honesty — peanuts everywhere, pointed to safe alternatives
• Save/load · achievements stub · cozy Palette A pixel art

COMEDY AS MECHANIC
Customers pedantic about legumes? That's a gameplay event. Time management beats
perfect politeness.

WHY FREE ON ITCH?
Discovery + educator feedback. Play in browser — use the in-game FEEDBACK button
(no copy-paste). Sign up on the title screen or PLAYTEST.md.

Also in the JimmyTheHat fleet: PixelSports hub, Yes Man, No Is a Complete Sentence.
```

---

## Images

| Slot | File |
|------|------|
| Cover | `release/store-assets/cover-630x500.png` |
| Screenshot 1 | `screenshot-01-title.png` |
| Screenshot 2 | `screenshot-02-market.png` |

Regenerate: `bash ../scripts/store-assets/regenerate-fleet-assets.sh`

---

## Upload

1. Package: `bash scripts/package-itchio.sh` → `release/driving-me-nuts-browser-v0.1.0.zip` (version from `package.json`)
2. Main file: `index.html`
3. Embed: **960×540** or **1280×720**
4. Pricing: **$0**

### Butler push (optional)

Create the itch project with slug **`jimmythehat-driving-me-nuts`** first, then from the fleet:

```bash
# Package only (DrivingMeNuts repo)
bash scripts/package-itchio.sh

# Push with PixelSports fleet script (requires BUTLER_API_KEY)
ITCH_PUSH_DMN=1 bash ../PixelSports/scripts/push-itch.sh
```

Butler target: `subtiliorars/jimmythehat-driving-me-nuts:web` (or `$ITCH_USER/jimmythehat-driving-me-nuts:web`).

**Live demo today:** https://subtiliorars-sys.github.io/DrivingMeNuts/
