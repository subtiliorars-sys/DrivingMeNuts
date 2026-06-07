# UI Wireframes — Driving Me Nuts (P1: Idle Core Slice)

**Canvas:** 480×270 pixels (Phaser 3) | **Target:** 3 panels max visible at once | **Design pillar:** Respect the player's time — no FOMO timers, no streak punishment (see RISK_REGISTER A4).

---

## 1. Main Idle Screen: Roast Queue & Inventory Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  Driving Me Nuts — Day 18  |  FARMERS' MARKET  |  Cash: $1,235  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ╔═ ROAST QUEUE ════════════════════════════════════════════╗   │
│  ║                                                            ║   │
│  ║  Slot 1: 30 lbs Honey Cinnamon   ███████░░░░ 7/12 min   ║   │
│  ║          Roasting...                                       ║   │
│  ║                                                            ║   │
│  ║  Slot 2: 20 lbs Classic Salted   ████░░░░░░░░ 5/10 min  ║   │
│  ║          Queued (waiting)                                 ║   │
│  ║                                                            ║   │
│  ║  Slot 3: [Empty]  — Tap to add batch →                  ║   │
│  ║                                                            ║   │
│  ╚════════════════════════════════════════════════════════════╝   │
│                                                                   │
│  ╔═ INVENTORY ═══════════════════════════════════════════════╗   │
│  ║  Raw Peanuts: 45 lbs  |  Roasted: 38 lbs  |  Spoilage: 2% ║   │
│  ╚═══════════════════════════════════════════════════════════╝   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Interaction notes:**
- **Timer progress bars:** show remaining time per batch (no countdown *sound*, no vibration/alerts—just silent visual).
- **Tap Slot 3:** opens **batch input modal** (size, recipe, start roasting).
- **Inventory line:** spoilage % is visible but matter-of-fact (not alarming red). Tapping it shows a tooltip: "Raw peanuts degrade after 60 days. Plan ahead."
- **"Tap to add batch":** chunky click target (min 32×32 px) for casual input.

**Curriculum concept taught:** **COGS (Cost of Goods Sold)** — raw peanuts cost money upfront; player watches material leave inventory in real time as roasting consumes it.

---

## 2. Price Control Panel: Slider + Live Demand Feedback

```
┌─────────────────────────────────────────────────────────────────┐
│  FARMERS' MARKET — Classic Salted Peanuts                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Current Price:  $1.20 / lb                                      │
│                                                                   │
│  ◄─ ───────●─────── ►                                            │
│  $0.75      $1.20      $2.00                                      │
│                                                                   │
│  ┌─ LIVE FORECAST ──────────────────────────────────────────┐   │
│  │  Estimated Daily Sales: 18 lbs/day                       │   │
│  │  Gross Margin:  72%  [████████░░]  HEALTHY               │   │
│  │  Daily Profit (before fixed cost): +$16.20               │   │
│  │                                                            │   │
│  │  📊 If you raise to $1.50: ~14 lbs/day, margin 72% → +$12 │
│  │  📊 If you drop to $0.90:  ~25 lbs/day, margin 58% → +$11  │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ PRICE COMPARISON ────────────────────────────────────────┐   │
│  │  Healthy (>60%): ✓ You are here.   Tight (45–60%): ○    │   │
│  │  Unsustainable (<45%): ✗                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Interaction notes:**
- **Slider:** touch-friendly (min 44×44 px handle). Drag left/right updates forecast in real-time (no debounce; instant feedback).
- **Margin % gauge bar:** color-coded (green >60%, yellow 45–60%, red <45%). This is the **teaching surface**—the player learns that a 72% margin is not "greedy"; it's a survival line.
- **Demand elasticity shown explicitly:** "If you raise to $1.50: ~14 lbs/day" — player sees demand curve *bend* in real time, learning price sensitivity without a lecture.
- **Daily profit line:** explicitly separates margin (%) from net profit ($), answering the question "Why does 72% margin not give me 72% of revenue?" (answer: COGS + fixed costs eat the rest).

**Curriculum concept taught:** **Gross Margin vs. Markup (Pricing)** — player manipulates a slider and watches margin %, demand, and profit move in response. This is the core teaching UI for the idle-core slice.

---

## 3. Supply Purchase Modal: Raw Peanut Bulk Orders

```
┌─────────────────────────────────────────────────────────────────┐
│  BUY RAW PEANUTS                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Market price this week: $0.38/lb (harvest season, good deal)   │
│                                                                   │
│  How many lbs?  [_______100______] lbs                           │
│  Max price:     [_____$0.40_____] /lb                            │
│                                                                   │
│  ╔═ BULK DISCOUNTS ═════════════════════════════════════════╗   │
│  ║  1–99 lbs:    $0.40/lb (no discount)                     ║   │
│  ║  100–499 lbs: $0.38/lb (–5%)          ← You here        ║   │
│  ║  500+ lbs:    $0.35/lb (–12%)                            ║   │
│  ╚═══════════════════════════════════════════════════════════╝   │
│                                                                   │
│  Cost preview:  100 lbs @ $0.38 = $38.00                        │
│  Cash after:    $1,235 – $38 = $1,197                           │
│                                                                   │
│  ⚠ Spoilage warning: Stock expires in 60 days. Your current     │
│    inventory (45 lbs) spoils Day 25. Plan roasting schedule.    │
│                                                                   │
│  [CANCEL]  [CONFIRM ORDER]                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Interaction notes:**
- **Qty input:** number field or increment/decrement buttons (mobile-friendly; avoid small text fields on 480-px width).
- **Max price slider:** teaches forward-buying strategy. Setting max-price forces the player to decide: "How much can I afford to spend upfront?"
- **Cost preview updates live:** changes instantly as qty/price shift. Player sees cash impact before committing.
- **Spoilage warning:** shows in plain language when current inventory will expire. This is a **teaching hook**—the modal forces the player to think about inventory lifecycle.
- **Bulk-discount table:** highlights the tier the player is entering. Visual feedback (arrow or highlight) shows the cost-per-unit advantage of larger orders.

**Curriculum concepts taught:**
- **COGS** — raw material cost is deducted from cash immediately.
- **Bulk discount** — incentivizes forward-buying; reveals the trade-off between lower per-unit cost and spoilage risk.
- **Cash flow vs. profit** — player sees the cash hit upfront, even though the revenue (sale of roasted product) is days away.

---

## 4. End-of-Day Report Card: THE Key Teaching Surface

```
┌─────────────────────────────────────────────────────────────────┐
│  END OF DAY — Day 18 Summary                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ╔═ OPERATIONS ══════════════════════════════════════════════╗   │
│  ║  Location: Farmers' Market                                ║   │
│  ║  Units sold: 45 lbs                                       ║   │
│  ║  Time operating: 6 hours (8am–2pm)                        ║   │
│  ╚═══════════════════════════════════════════════════════════╝   │
│                                                                   │
│  ╔═ REVENUE & COGS ══════════════════════════════════════════╗   │
│  ║  Revenue (45 lbs @ $1.20):        $54.00                 ║   │
│  ║  COGS (45 lbs @ $0.60 COGS):      –$27.00                ║   │
│  ║  ──────────────────────────────────────────              ║   │
│  ║  Gross Profit:                    $27.00 (50%)           ║   │
│  ╚═══════════════════════════════════════════════════════════╝   │
│                                                                   │
│  ╔═ FIXED COSTS ═════════════════════════════════════════════╗   │
│  ║  Market permit (today):           –$2.80                 ║   │
│  ║  Fuel / propane (roasting):       –$3.00                 ║   │
│  ║  ──────────────────────────────────────────              ║   │
│  ║  Fixed cost (today):              –$5.80                 ║   │
│  ╚═══════════════════════════════════════════════════════════╝   │
│                                                                   │
│  ┌─ NET PROFIT (TODAY) ──────────────────────────────────────┐   │
│  │  Gross – Fixed = $27.00 – $5.80 = $21.20               │   │
│  │  Cash before: $1,197  →  Cash now: $1,218.20            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  💡 INSIGHT: You sold out by 2pm — did you price too low?      │
│     Raise to $1.35, you'd have made +$8 more. But would        │
│     demand have held? Next time, try testing.                  │
│                                                                   │
│  [CONTINUE]                                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Interaction notes:**
- **Tabular layout:** revenue, COGS, gross profit, fixed costs, net profit are in visual sections (not a wall of text).
- **Per-unit COGS visible:** the $0.60 COGS line is explicit, so player sees the material reality of their recipe choice (Honey Cinnamon costs more than Classic Salted).
- **Insight line:** ONE generated insight per day, targeting a business lesson. Examples:
  - "You sold out by 2pm — price too low?"
  - "COGS spiked today; did you use more expensive ingredients?"
  - "Permit cost was high today. This location might not pay off every day."
  - "You had 8 lbs left unsold. Spoilage risk tomorrow — consider reducing batch size."
- **No judgment.** The insight is a question, not shame. The game never says "You did this wrong"; it says "Here's a pattern. What will you adjust?"

**Curriculum concepts taught:**
- **COGS** — explicit line item showing the material cost of what was sold.
- **Gross Margin** — (Revenue – COGS) / Revenue, shown as % and $. Player learns the difference between margin $ and margin %.
- **Fixed Costs** — permit and fuel are separated from COGS, teaching that not all expenses are proportional to sales.
- **Cash Flow vs. Profit** — the "Cash before / Cash now" line shows the real money in the bank, not just accounting profit.
- **Unit Economics** — per-location, per-day breakdown. Player learns to evaluate location profitability.
- **Pricing elasticity feedback** — the insight about "You sold out by 2pm — did you price too low?" directly connects the GDD's demand curve to a lived decision.

---

## 5. Interaction Model & Panel Navigation

**Panel hierarchy (480×270 pixel constraint):**

| Panel | Always Visible? | Click Action | Dismissal |
|-------|-----------------|--------------|-----------|
| Main Idle Screen (roast queue + inventory) | **Yes** (primary) | Tap Slot N to add batch; tap inventory to view detail | N/A |
| Price Control (slider + forecast) | **Swipe left** or tap "Prices" tab | Drag slider in real-time | Auto-hide on tab switch |
| Supply Purchase Modal | **Tap inventory depletion warning** or "Buy" button | Modal overlay (center) | Tap [CANCEL] or backdrop |
| End-of-Day Report Card | **Auto-show** at end of day (configurable; can also be dismissed and re-opened from menu) | Press [CONTINUE] to advance to next day | [CONTINUE] dismisses |

**Mobile-first design notes:**
- **Buttons:** min 44×44 px touch target (iOS HIG).
- **Text:** min 14 pt for readability on phone/tablet.
- **Tab bar:** bottom tabs for Main / Prices / Buy / Menu (four main sections).
- **Modals:** center on screen, backdrop darkens main content (clear affordance that a modal is active).

---

## 6. Teaching Surface Map: Which Panel Teaches What

| Panel | Curriculum Concept(s) | Mechanic Entry Point |
|-------|----------------------|----------------------|
| **Main Idle Screen (Queue + Inventory)** | COGS, Spoilage, Batch Efficiency | Player loads raw peanuts → real $ cost deducted → finished goods appear |
| **Price Control (Slider + Forecast)** | **Gross Margin vs. Markup**, Price Elasticity, Demand Sensitivity | Player drags slider → watches margin %, units, profit bend → learns optimal price is not "highest" |
| **Supply Purchase Modal** | COGS, Bulk Discount, Spoilage Risk, Cash Flow | Player enters qty → sees cost preview → spoilage warning → commits cash upfront |
| **End-of-Day Report Card** | **Revenue vs. COGS**, **Cash Flow vs. Profit**, Fixed Costs, Unit Economics, Pricing Feedback | Game summarizes the day: per-location profit breakdown + one insight question tied to player's decision |

---

## 7. Respect-the-Player's-Time Constraints

**Per RISK_REGISTER A4 (mechanic blacklist):**

- ✅ **No FOMO timers:** roast timers are silent progress bars (no countdown beep, no "time running out!" urgency).
- ✅ **No streak punishment:** offline earnings are a soft bonus, not a "log in daily or lose progress" mechanic.
- ✅ **No countdown framing as loss:** if a batch spoils, the report is factual ("4 lbs spoiled") not shame-framed ("You WASTED 4 lbs!").
- ✅ **Optional complexity:** price slider and supply bulk tiers are visible but not mandatory — player can ignore and just sell at default price.
- ✅ **No ads or analytics:** P1 slice collects no data (per CRIT-1 governance).

---

## 8. Wireframe Edge Cases & Scenarios

**Scenario 1: Player has no raw peanuts (empty inventory)**
- Main screen shows: "No raw stock. Tap [BUY] to order peanuts."
- Roast queue is disabled (greyed out).
- Encourages supply-buying decision without time pressure.

**Scenario 2: Batch is almost done roasting**
- Progress bar is 95%+ full.
- No animation or sound; player just sees the visual state change.
- When complete, a soft highlight (no pop-up) indicates the batch is ready.

**Scenario 3: Player has multiple locations unlocked (post-P1)**
- Main screen shows: "FARMERS' MARKET" in the header (tappable to switch location).
- Each location has its own queue and inventory (or shared, per design decision).
- Price control panel shows prices **per location** (Farmers' Market price ≠ Office Quarter price).

---

**Line count:** 155 lines | **ASCII diagrams:** 4 (main idle, price control, supply modal, end-of-day) | **Interaction tables:** 2

**Summary of wireframes and curriculum concepts:**

1. **Main Idle Screen** → COGS (Cost of Goods Sold)
2. **Price Control Panel** → Gross Margin vs. Markup (Pricing)
3. **Supply Purchase Modal** → COGS, Bulk Discount, Spoilage Risk, Cash Flow vs. Profit
4. **End-of-Day Report Card** → Revenue vs. COGS, Gross Margin %, Fixed Costs, Cash Flow vs. Profit, Unit Economics per Location-Day
5. **Interaction Model & Panel Navigation** → User experience / respect-the-player's-time
6. **Teaching Surface Map** → Explicit mapping of mechanics to curriculum
7. **Respect-the-Player's-Time Constraints** → FOMO blacklist (RISK_REGISTER A4 compliance)
8. **Edge Cases** → Design robustness (empty inventory, batch completion, multi-location)
