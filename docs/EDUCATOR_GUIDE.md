# Educator Guide — Driving Me Nuts

**Driving Me Nuts** is a cozy business-simulation game designed for classroom use with students ages 13+. This guide helps you integrate it into a lesson on small-business fundamentals, entrepreneurship, or applied economics.

---

> **Build status — read before class prep** *(refreshed 2026-06-13)*
>
> This guide describes the FULL designed experience. The current P1 build has grown well
> beyond the original idle slice. Status as of the latest build:
>
> **SHIPPED (playable now):**
>
> | Feature | Notes |
> |---------|-------|
> | Two districts (Farmers' Market + Office Quarter) | Full roast → price → sell → day-report loop; ROUTES modal to buy the Office Quarter permit ($300), switch districts, and compare demand curves |
> | Roast queue, pricing, demand curve, day cycle | Core idle loop; profit-optimum pricing |
> | Recipes (3) + roaster/queue upgrades | Classic Salted from start; Honey Cinnamon / Ghost Pepper unlock by lifetime revenue |
> | **Save / load** | Browser localStorage; auto-saves and reloads (corruption-safe). Save export/import to a file too. |
> | **Bookkeeping — Ledger v1 + BOOKS panel** | Daily P&L rows, a live balance sheet (assets = liabilities + equity), and a **cash-vs-profit** teaching line. Weekly recap every 7 days. |
> | Supplier relationship + bulk discounts | Loyalty discount earned by ordering volume; teaches working capital |
> | "Save the Truck" rescue arc | No bankruptcy — a cash crunch offers a fair loan / supplier credit / pre-order / cautionary payday (with honest APR). Repeat crises escalate. |
> | Achievements + Goals panel | Progress markers (no power rewards); Legume Lore collection; comeback-line tiers |
> | "Legumes. Not Nuts." brand campaign | Flip the running gag into brand equity |
> | Accessibility + Settings (⚙ MENU) | Reduced-motion, colour-blind cues, large-text toggle (1.28×), sound toggle |
> | **In-game Glossary** | Plain-language definitions (COGS, margin, APR, profit-vs-cash, deferred revenue, **peanut allergy**) + the "simplified / varies by location" disclaimer |
> | First-run tutorial, audio/SFX + mute, milestone celebrations | Onboarding + game-feel |
> | **Auto-sell off-peak upgrade** | Optional $1,500 upgrade: leftover roasted stock clears at 10% off at day's end (less waste, frees working capital) |
> | **Weather demand modifier** | Rainy −20% / hot-sunny +15% demand; 1-day forecast shown (predictable, no FOMO) |
>
> **PLANNED (P2+, not yet built):** truck driving + Boardwalk/University districts + NPC quests (the RPG layer); **spoilage** (and the refrigerated-truck upgrade that depends on it); the **full** dual-ledger (interest split, accounts-payable calendar); year-round seasons; dedicated break-even goal UI; day-skip / in-game hint system.
>
> **Use in class today:** COGS, pricing & the demand curve, location strategy (Office Quarter unlock), the day-report and **BOOKS** panel (profit vs. cash), the rescue arc (debt & APR), weather/weekday demand planning, and the Glossary. Break-even is teachable via the glossary + fixed-cost math; a dedicated daily goal UI is still on the roadmap.

---

## What the Game Teaches

The game maps 10 core business concepts to playable moments. A typical 40-minute class can visit 2–3 of these zones and see the mechanics in action.

| Concept | In-Game Moment | Discussion Hook |
|---------|---|---|
| **COGS (Cost of Goods Sold)** | The "Roasting" screen. Player buys raw peanuts ($0.40/lb), adds salt ($0.20), and roasts. Total cost per lb: $0.60. | "Why does the game make you *see* the raw ingredients leave your money pile before you sell anything?" |
| **Gross Margin vs. Markup** | The pricing slider (left: $0.75/lb, right: $2.50/lb). As you move it, a margin % appears (green if >60%, yellow if 45–60%, red if <45%). | "At $1.50/lb, your margin is 60%. If you drop to $1.00, it's 40%. Why does a 33% price cut hurt so much worse?" |
| **Permits & Licensing** | **PARTIAL (shipped):** buy the Office Quarter permit ($300) via the ROUTES modal to operate in a second district. Full permit-renewal calendar and Day-1 health-permit gate are P2. | "Why pay $300 before you can sell downtown? What does a real permit cost, and what happens if you ignore renewal?" |
| **Location Strategy** | **PARTIAL (shipped):** Farmers' Market (baseline) + Office Quarter (lunch-rush curve, lower base demand, Derek consistency mechanic). Boardwalk and University are P2. | "Which district looks best? Revenue per day, or profit per day? Why are they different?" |
| **Cash Flow vs. Profit** | **SHIPPED (BOOKS panel):** live balance sheet + a day-report line showing that debt payments lower cash but are *not* an expense, so profit ≠ cash. A big roasting day can drop cash while profit stays positive. *(Full dual-ledger with interest split is P2.)* | "You made $200 this week but you're broke. Explain why those two things can both be true." |
| **Marketing & Reputation** | Customer "Legume Gag" (customers say "peanuts aren't nuts, they're legumes"). Each time you win the gag exchange, a Legume Lore entry unlocks, and that customer becomes a repeat buyer. | "Free marketing vs. paid ads: how does the game model earning customers?" |
| **Seasonality / cyclicality** | **PARTIAL (shipped):** weekday demand variation (Mon slow → Sat peak) plus a daily weather modifier (rainy −20% / hot-sunny +15%) with a 1-day forecast — both shown openly. Full-year seasons and festival calendar are P2. | "The HUD shows tomorrow's weather. How would you plan roasting if rain is coming?" |
| **Break-Even Analysis** | Daily goal UI shows a target: "Sell 6 lbs today to cover fixed costs." (At $1.50/lb sell price, COGS $0.60/lb, gross profit $0.90/lb: $5.00 daily fixed ÷ $0.90 = 6 lbs.) If you exceed it, the target turns green. **(planned: break-even UI not in P1)** | "What does break-even mean? Is every sale profitable?" |
| **Unit Economics** | End-of-day report: revenue, COGS, gross profit, location costs, net profit. Weekly table shows which location/day combos were best. (P1 report card shows single-district breakdown; multi-location weekly table **(planned P2)**.) | "You sold at two locations. Same revenue, different profit. Why?" |
| **Simple Bookkeeping** | **SHIPPED:** Ledger v1 — a 30-day daily P&L table (revenue, COGS, fixed, net, debt payments, cash) in the BOOKS panel, plus an auto weekly recap (revenue, net, margin, best day). *(A full receipt journal by income/expense type is P2.)* | "Why keep a journal? What pattern would you spot if you looked at the last 4 weeks?" |

---

## How to Run a Class Session

### Before Class (5 min prep)
1. Open the game yourself and play the first 10 in-game days to get oriented.
2. Have students in pairs or trios (one drives, one navigates, one takes notes).
3. **Optional:** assign each group a "business role" (one is the owner deciding price, one is the accountant watching costs, one is the marketing manager watching reputation).

### During Class (40 min)
1. **Intro (5 min):** "You inherit a peanut truck. No permits, no reputation, $50 cash. What do you do first?"
2. **Play (25 min):** Students play Days 1–10. Pause at natural moments:
   - After roasting: "How much did that batch cost? How many lbs do you need to sell to break even?"
   - When permit expires: "You ignored the deadline. Now what?"
   - When prices drop in winter: "Your foot traffic is down 40%. Do you lower prices to stay busy, or keep them high and work fewer days?"
3. **Debrief (10 min):** Whole-class discussion: "Which location would you pick next? What surprised you?"

### After Class (Optional)
- Have students write a 1-page reflection: "What business decision did you make and why? What was the outcome?"
- Challenge: "Redesign the game to teach a concept we didn't hit (e.g., debt, marketing cost, labor)."

---

## Discussion Prompts by Concept

### COGS (Cost of Goods Sold)
- "Why does the game show you the raw peanuts *leaving* your cash pile immediately, even though you won't sell them until tomorrow?"
- "If raw peanuts cost $0.40/lb and you add $0.20 in salt, is your profit per lb $0.60? Why or why not?"
- "What happens if the wholesale price of peanuts spikes 50%? Can you still survive?"

### Gross Margin & Pricing
- "At $1.50/lb with $0.60 COGS, you're making $0.90/lb gross profit. Is that your take-home pay? Why not?"
- "The game shows margin % instead of markup %. Why is margin more important to a small business?"
- "If your competitor undercuts you by $0.30/lb, should you match their price or differentiate?"

### Permits & Licensing
- "Why does the game force a 6-day wait for a permit instead of instant approval?"
- "Real permits vary by location. How would your startup look different in a different city?"

### Location Strategy
- "The Farmers' Market has the highest traffic, but the Office Quarter is consistent year-round. Which is the better long-term bet?"
- "A location has foot traffic but high permit costs. How do you decide if it's worth it?"

### Cash Flow vs. Profit
- "Explain the difference between 'I made $200 this week' (profit) and 'I have $50 in the bank' (cash)."
- "If a supplier offers 'net 14' terms (you pay 14 days later), does that help or hurt your cash flow?"

### Marketing & Reputation
- "The Legume Gag happens every few sales. Is it marketing? Why does the game count it?"
- "How do you earn word-of-mouth in the game? What would that look like in real life?"

### Seasonality
- "Summer looks great. Why can't you just coast on summer profits into winter?"
- "Plan a year: what do you do differently in each season?"

### Break-Even Analysis
- "The game tells you 'Sell 6 lbs today to break even.' What does that number represent? (At default price $1.50 and COGS $0.60, you earn $0.90 gross profit per lb. Divide $5 daily fixed costs by $0.90 and you get 6 lbs.)"
- "If foot traffic drops 40% in winter but you still need to break even, what do you change?"

### Unit Economics
- "Two locations: Location A makes $30/day with $10 permit. Location B makes $25/day with no permit. Same week, which is better overall?"
- "Why does the game show profit *per day* instead of just total weekly profit?"

### Simple Bookkeeping
- "Why does the game auto-generate a receipt journal? What's so hard about keeping track of money?"
- "If you looked at your receipt journal and saw COGS spiked 20% last week, what would you investigate?"

---

## Simplified but Never Wrong: Where We Simplified

The game teaches plausible business concepts. Some real-world details are simplified for clarity:

### Permits
- **Real:** Health permits, mobile-vendor licenses, fire certificates, zone-specific permits all vary by jurisdiction (city, county, state). Renewal schedules differ. Costs range $300–$800/year. Processing times: 2–6 weeks.
- **Game:** Office Quarter permit costs $300 (one-time purchase via ROUTES modal). A broader permit-renewal calendar and Day-1 health-permit gate are P2 — not yet in the build.
- **Why:** The game is jurisdiction-generic to avoid locking you into one city's rules. The principle is true (permits are unavoidable, recurring, scheduled costs).

### Pricing & Demand
- **Real:** Demand depends on foot traffic (weather, day of week, events), customer preferences, competitor prices, reputation, and randomness. Elasticity varies by location and season.
- **Game:** Demand = 20 lbs/hr − 10 × (price − $1.20). Simplified curve, but interior profit peak ($1.90) is real economics.
- **Why:** Keeping the demand curve linear and transparent lets you see the math and predict outcomes. Real demand curves are messier but follow the same principle: raise price, lose volume; lose price, raise volume but margin shrinks.

### Seasonality & Weather
- **Real:** Summer fairs and festivals are scheduled events (Pumpkin Fest Oct 15–20, Farmers' Market open Sat 8am–12pm year-round). Weather is daily. Holidays shift demand unpredictably.
- **Game:** Weekday demand curves and a daily weather modifier (rainy −20%, hot-sunny +15%) are shipped with a 1-day forecast. Full-year season bands and festival calendar are P2.
- **Why:** External demand drivers are shown *ahead* so students can plan — no surprise-FOMO framing. Year-round seasons add complexity once the core loop is familiar.

### Spoilage & Inventory
- **Real:** Roasted peanuts stay fresh ~60–90 days in sealed containers at room temperature. Real trucks rotate stock, watch expiration dates, compost old batches.
- **Game:** Peanuts spoil after 60 days. You see the degrade rate (0.5%/day from day 61 onward). No real compost cost; spoilage just disappears. **(planned P2 — no spoilage in P1 build)**
- **Why:** The game makes inventory management *visible* without forcing you to track SKU-level expiration. It's honest about the risk; the accounting is simplified.

### Labor & Operating Hours
- **Real:** Most peanut-truck operators work 10–14 hours/day, 4–6 days/week. Labor costs for an assistant are $15–18/hr. Owner typically doesn't pay themselves a salary in year 1.
- **Game:** You work 6 am–8 pm (14 hrs/day) solo. No labor costs, no assistant. You can work fewer days/week if you want to reduce fixed costs.
- **Why:** P1 teaches capital investment, not labor economics. Adding an assistant would require wage mechanics, tax filing, employment law—that's P2+.

### Taxes & Accounting
- **Real:** Self-employment tax (~15%), income tax (varies by state, 0–13%), quarterly estimated tax payments, W-2 employees require payroll, etc.
- **Game:** No taxes. You keep 100% of net profit. You manage cash and profit; accounting software is the receipt journal.
- **Why:** Taxes are location-specific and legally complex. The core lesson—profit ≠ cash, COGS matters, permits are recurring—stands without them. A prestige loop (NG+) could add taxes as an advanced mode.

### Real Rules & Resources

When students ask "Is that actually how it works?", here are canonical sources:

| Topic | Real-World Resource |
|-------|---|
| **Small-business permits** | SBA (sba.gov); your local city/county health department; Secretary of State office |
| **Food-truck regulations** | National Association of Food Trucks (NAFT); local health code |
| **Pricing & margins** | SBA articles on "pricing strategies"; SCORE mentors (free small-business counseling) |
| **Cash flow management** | SBA guide "Cash Flow Analysis"; Xero or Wave accounting (both have free tiers) |
| **Seasonality** | Real food-truck operators' blogs; TikTok #foodtruck (anecdotal but authentic) |

---

## Privacy & Data: Nothing Is Collected

**Driving Me Nuts** is a single-player desktop game. It stores nothing on a server.

- **No accounts:** You don't log in. No email, no password, no username.
- **No leaderboards:** Your scores aren't broadcast or compared to others online.
- **No analytics:** The game doesn't track how long you play, which decisions you make, or where you get stuck. No data leaves your computer.
- **Offline play:** The game runs entirely offline. You can close it, unplug, and play again later without an internet connection.
- **Save files:** The game auto-saves to browser `localStorage` (local to that browser only). Save export/import to a file is available in Settings. No server upload.

**The educator-export feature mentioned in the roadmap is NOT shipped yet.** Such a feature (recording class-wide gameplay transcripts) would require privacy review per our RISK_REGISTER before it ever ships. It's gated behind a conscious owner decision. Until then, the game collects zero data.

**For school networks:** The game runs entirely offline — no network access is needed after the page loads (no external assets, no analytics, no CDN calls). If your school's IT department requires audits, there is nothing to intercept: all computation is local.

---

## Example Lesson Plan (45 min)

| Time | Activity | Notes |
|------|----------|-------|
| 5 min | Intro: "You inherited a truck with $50. First decision?" | Whole class |
| 25 min | Play Days 1–10 in pairs. Checkpoint at Day 5: "What permits do you have? What's your cash?" | Groups own their pace; teacher circulates |
| 10 min | Debrief: "Which location would you unlock next and why?" | Whole class or pair shares |
| 5 min | Reflection: "One decision you made and why. What surprised you?" | Exit ticket or homework |

---

## Accessibility Notes

- **Reading level:** Game text is conversational (Middle School+). Tooltips are optional; core mechanics are visual.
- **Color:** The margin % display uses green/yellow/red color bands. Numbers are always shown alongside color, and the **Colour-blind cues** toggle adds a word label ("healthy/tight/low") so colour is never the only signal.
- **Pacing:** You set the pace. No time pressure, no game-over. Pause and think as long as you want.
- **Difficulty:** No "hard mode" in P1. In-game hints and day-skip are **(planned)** — for now, teachers can pause and walk through the report card together as the natural debrief point.

---

## Classroom Management Tips

- **Assign roles:** One player, one accountant (takes notes on costs), one strategist (decides next move). Rotate roles each session.
- **Pair programming vibes:** "Driver" makes decisions; "Navigator" explains why. Swap after Day 5.
- **Normalize mistakes:** "Your supplier just doubled prices. That's bad. What do you do?" Mistakes are the lesson.
- **Connect to real life:** "That's like a real food truck—the owner *can't* just decide to operate without permits, no matter how fast she'd like to move."
- **Optional: Invite a guest:** If you know a small-business owner or accountant, a 15-minute Q&A with a group playing the game can deepen the lesson.

---

## Educational Disclaimer

**Driving Me Nuts** is an educational simulation. It is **not** professional business or financial advice. Real small-business decisions depend on your specific location, industry, and circumstances. Permit costs, regulations, and demand curves vary widely by jurisdiction and season.

Before starting a real food truck or any business:
- Consult your local SBA office or a business accountant.
- Research your city's specific health code, permit requirements, and fees.
- Talk to active operators in your area.
- Create a real business plan with a mentor.

The game teaches *principles*; real businesses require *professional guidance*.

---

**Questions or feedback?** This guide can be improved. Reach out if a concept wasn't clear, a discussion prompt fell flat, or your students discovered a surprising angle we missed.

---

## Classroom Pilot Checklist

Use this checklist to prepare and run a classroom session. All steps are **practical and minimal**—nothing complex.

### Before Class (10 min setup)

**Environment & Tech:**
- [ ] Load the game once on your teaching device with a stable wifi connection. Verify it loads to the main screen.
- [ ] Close all other tabs and background apps. Clear browser cache if you suspect stale assets.
- [ ] **Offline readiness:** Turn off wifi/unplug ethernet. Verify the game still runs (no network errors, no blank screen). Re-enable connection.
- [ ] Projector/screen: Load the game full-screen. Check readability at the distance your students sit. The UI is 480×270 (4:3 native); if pixelated on modern projectors, that's OK—it's intentional art style.
- [ ] Test audio off (mute): Most classrooms won't play sound. Game is fully playable silent (all info is on-screen).

**Decide on Grouping:**
- [ ] **Solo play (one per device):** Each student gets a device. Works if 1:1 laptops available. Fastest decision-making, but no peer discussion during play.
- [ ] **Pair play (two per device, better default):** One student drives (mouse/keyboard), one navigates (reads UI, suggests next move). Rotate roles at Day 5 checkpoint. Builds communication; forces articulation of why decisions matter.
- [ ] **Trio (three per device, if devices scarce):** Driver, Accountant (takes notes: costs, cash, profit), Strategist (suggests location/price). Most collaborative; slowest individual pace.

**Optional Prep:**
- [ ] Print or display the "Concept" table (from "What the Game Teaches" section above). Assign 2–3 concepts your class will focus on.
- [ ] If students have laptops, have them open the **End-of-Day Report** template below (optional note-taking):
  ```
  Day ___
  Location: ________
  Lbs roasted: ____ Lbs sold: ____
  Sell price: $___/lb   Revenue: $_____
  COGS: $____    Gross profit: $_____
  Cash at end of day: $_____
  One decision I made: ________________
  Why: __________________________
  ```

---

### During Class (40–50 min play + debrief)

**Intro (3–5 min):**
- Display the game screen. Say: **"You inherit a peanut truck. You have $50 and 20 lbs of raw peanuts. You work from 6am–8pm. What's the first thing you do?"** Let students shout out ideas (roast? Price? Buy more peanuts?). Briefly explain: the goal is to survive and grow, but there's no failure state—if you run low on cash, the game gives you a rescue arc.

**Play Phase 1: Days 1–5 (15–20 min)**
- Students play at their own pace. Circulate and watch for confusion:
  - **If stuck on pricing:** Remind them: "Higher price = fewer sales but more margin. Lower price = more sales but tight margin. Try $1.50 and see what happens."
  - **If confused by demand:** Point to the demand formula in the UI (if visible) or simplify: "The more you charge, the fewer people buy. It's real economics."
  - **If hoarding cash:** Gently nudge: "You're not roasting anything. Why? Do you think prices will spike? Will demand disappear?"

**Checkpoint at Day 5 (2 min):**
- Pause the class. Ask: **"What's your current cash? Did you roast? What price did you pick?"** Quick poll. No judgment—just surface the variety of strategies already visible.

**Timing note:** A full in-game day ≈ 14 real minutes (SIM_TIME_SCALE=60; 14 sim-hours × 60 real-seconds each = 840 real seconds). For multi-day exercises, have students use the **END DAY** button deliberately rather than waiting for the clock to fill.

**Play Phase 2: Days 6–10 (15–20 min)**
- Resume play. Watch for the Legume Gag (should trigger 3–5 times by Day 10, depending on sales volume). When it happens, point it out: **"That's the running joke of the game. Every few sales, a customer reminds you peanuts are legumes. Keep track—it's a mechanic."**
- If a student runs low on cash, the **Save the Truck** rescue arc offers fair choices (Old Joe loan, supplier credit, Derek pre-order, or cautionary payday loan) — no bankruptcy, no shame framing. Watch for the dialogue and discuss APR/debt terms afterward.

**Final Debrief (10–15 min, whole class):**
- **Ask (cold call or volunteers):**
  1. "How much cash do you have now? How much did you spend on what?"
  2. "What surprised you about pricing or demand?"
  3. "If you played Day 11, what would you do differently?"
  4. "Why does the game make you wait for your roasted peanuts instead of selling them instantly?"
- **Wrap:** "Profitability isn't just selling a lot—it's managing costs and choosing the right price. You just did that."

---

### After Class (Collection & Reflection)

**What to Collect (no screenshots, no accounts):**
- Ask students to report **verbally or on a whiteboard:**
  - Their **end-of-day cash** on Day 10.
  - Their **chosen sell price** (and if they changed it during the game, why).
  - One **business decision** they made and the outcome (e.g., "I roasted bigger batches because I thought it'd be faster. It wasn't.").
- **Optional written reflection (1 paragraph, ~3 min):** "What was one decision you made in the game? What would you do differently if you played again?"
- **NO screenshot requirement.** NO account login needed. NO data export. Just verbal/written responses.

**What NOT to collect:**
- Game sessions are fully local. Do not ask students to save or upload game files.
- Do not require account creation or email submission (game doesn't support this anyway).
- Do not capture gameplay video or analytics.

---

### IT Verification (Optional, for IT/network admins)

**To confirm the game has zero network traffic after load:**
1. Load the game in a browser on a school device.
2. Open **Developer Tools** (F12 or right-click → Inspect).
3. Go to **Network** tab.
4. Play the game for 2–3 days. Make a sale, roast a batch, change prices.
5. Expected result: **No new network requests appear** in the Network tab. (You may see one initial page load; everything after that is local computation.)
6. If a network request appears during gameplay, **do not proceed**—report to the dev team.

This confirms: the game is **fully offline-capable** after the initial load. No student data is transmitted. No tracking. No external calls.

---

## In-Game Glossary & Accessibility (⚙ MENU)

The **⚙ MENU** button (bottom-right) opens Settings, which holds:
- **Glossary** — plain-language definitions of every business term the game uses
  (COGS, gross margin, profit-vs-cash, break-even, APR, deferred revenue, supplier
  relationship, permit, and a serious entry on peanut allergy). It opens with a
  standing reminder that the game is *simplified* and real fees/laws *vary by
  location* — point students to your local SBA office for real figures. Learning
  here is **opt-in**: nothing forces a student to read it.
- **Accessibility** — **Reduced motion** (stops ambient animation for motion-sensitive
  players) and **Colour-blind cues** (adds a word — "healthy/tight/low" — to the
  colour-coded margin so colour is never the only signal). Both persist per-device.
- **Large text** — toggle in Settings scales in-game fonts (~1.28×; reloads the scene).
  **Browser zoom** also works cleanly on the FIT-scaled canvas: **Ctrl + / Ctrl −** (⌘ on Mac).
  Settings shows both options.

These preferences are stored locally on the device only — no accounts, no transmission.

---
