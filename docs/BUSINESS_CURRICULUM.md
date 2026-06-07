# Driving Me Nuts — Business Curriculum

> **This doc is the single source of truth for real-world numbers. GDD in-game values are stylized derivatives of what is written here.**

## Overview

This document maps small-business concepts the game teaches to their real-world grounding and exact gameplay mechanics. Each concept has: plain definition → food-truck reality (with realistic numbers) → game mechanic → the "aha" moment. The goal: players walk away understanding not just *what* these concepts mean, but *why they matter* when you're on the hook for your own livelihood.

---

## Core Concepts

### 1. COGS (Cost of Goods Sold)

**Definition:**  
The direct cost to produce one unit sold—raw materials, fuel, packaging. Not salary, rent, or loan payments. COGS is the stuff you touch.

**Food-truck reality:**
- Raw peanuts (wholesale bulk): $2.50–3.00/lb
- Oil for roasting: ~$0.08/batch (25 lb batch)
- Salt/seasoning: ~$0.02/batch
- Fuel (propane roaster): ~$0.10/batch
- Bags/cups (100-ct): ~$0.05 per unit
- **Total COGS per 1-oz serving:** ~$0.35–0.45
- A truckload of 200+ servings costs $70–90 in raw goods + fuel.

> *(In-game prices are stylized; the figures above are the teaching reference.)*

**Game mechanic:**
- Player enters a "Roasting" screen: select peanut variety (raw → $2/lb onscreen), quantity, roasting time, and fuel type.
- Real-time resource deduction: you watch the materials leave your inventory and cost ledger.
- Output: finished goods in the truck inventory (roasted peanuts ready to sell).
- **Feedback loop:** On the sales screen, you see "COGS per unit: $0.42" vs. "Selling price: $1.50." If you roasted too much and it spoils, or used expensive fuel, your margin shrinks visibly.

**The "aha":**  
*"Oh—I can't just make 1000 servings. I need to buy the raw stuff first, and it all comes out of my cash pile right now, even if I sell it tomorrow."* COGS is the material reality check. Overstocking = tied-up cash.

---

### 2. Gross Margin vs. Markup (Pricing)

**Definition:**
- **Markup:** selling price minus COGS, divided by COGS. (Example: $1.50 – $0.42 = $1.08; $1.08 / $0.42 = 257% markup.)
- **Gross margin:** selling price minus COGS, divided by selling price. (Example: $1.08 / $1.50 = 72% gross margin.)
- Most small businesses think in margins; customers think markup sounds huge (257%! theft!). The game must disambiguate.

**Food-truck reality:**
- Typical roasted-snack food-truck gross margin: 65–72%.
- At $1.50/oz, COGS $0.42, that's 72% margin (28¢ profit per unit before rent/permits).
- If you charge $1.00, COGS $0.42: 58% margin—still good, but margins compress fast.
- Customers see a $1.50 bag; peanuts cost wholesaler ~$3/lb, retail ~$6/lb in bulk. Your price looks reasonable, not greedy.

**Game mechanic:**
- **Pricing UI:** slider from $0.75 to $2.50. As you move it, the game shows:
  - Selling price
  - Gross margin % (highlighted; this is the number that matters for viability)
  - Estimated daily unit sales (curves based on location/season)
  - Daily profit = (price – COGS) × units sold – fixed costs
- **Demand elasticity:** raise price to $2.00, estimated units drop 20%. Lower to $0.75, units surge but profit doesn't (margin too thin).
- **Comparison table (always visible):** shows margin % in green if healthy (>60%), yellow if tight (45–60%), red if unsustainable (<45%).

**The "aha":**  
*"A 72% margin isn't 'greedy'—it's barely enough to cover my truck payment, permits, and buffer for slow days. If I cut price to $1.00 and margin drops to 58%, I'm working harder for less."* Margins aren't profits; margins are how you survive overhead.

---

### 3. Permits & Licensing

**Definition:**  
Legal documents that let you operate; they cost money upfront, expire on a schedule, and you must renew or shut down.

**Food-truck reality:**
- **Health permit (mobile vendor):** $300–800/year, renewed annually, requires inspection.
- **Mobile vendor license (city):** $400–600/year, location-specific; moving to a new zone costs renewal + new fee.
- **Fire certificate (propane roaster):** $100–200, every 2 years.
- **Zone/location permits:** festival permits ($50–150/day), park vending ($100–200/season).
- **Real delay:** permits take 2–6 weeks; you can't legally operate without them.

*(varies by jurisdiction — simplified)*

**Game mechanic:**
- **Start-of-game gate:** player must secure "Health & Mobile Vendor License" before the truck goes live. This costs $500 (up-front) and takes 3 in-game days.
- **Permit calendar:** a UI widget shows when each permit expires. At 30 days before expiry, a notification appears: "Health permit expires in 30 days."
- **Failure condition:** if a permit expires and you keep operating, authorities fine you $200–500 and suspend your truck for 2 in-game days.
- **Location costs:** moving to a new zone (e.g., office park) triggers a "location permit" cost ($100–200) and 1–2 day delay. Each zone has its own permit category.
- **Upgrade consequence:** buying a second truck requires a separate license set ($500), reinforcing that growth = fixed-cost burden.

**The "aha":**  
*"I can't just roll up and sell peanuts. The government needs to know I'm safe and legitimate, and that costs money every year, on a schedule I can't ignore. If I mess up the calendar, I stop making money until I fix it."* Permits are an unavoidable cost structure and a scheduling puzzle.

---

### 4. Location Strategy

**Definition:**  
Different places have different foot traffic, customer types, permit costs, and seasonal patterns. Strategy = picking the mix that maximizes profit, not just volume.

**Food-truck reality:**
- **Residential (morning/evening peaks):** foot traffic 100–150/day, willing to pay $1.25–1.50, low permit cost ($50/season).
- **Market/fair:** foot traffic 300–500/day, willing to pay $1.75–2.00, high-season only, permit $80–150/day.
- **Office park (lunch rush):** foot traffic 80–120/day, willing to pay $1.50–2.00 (higher income), consistent year-round, permit $100/month.
- **Park (weekend):** foot traffic 150–250/day, price-sensitive ($1.00–1.25), weekends only, seasonal, permit $100/season.
- **Margins vary:** office park has high purchase density but short window; market has volume but is temporary; residential is steady but slow.

*(varies by jurisdiction — simplified)*

**Game mechanic:**
- **Location unlock system:** player starts at one zone (residential). After 5 days and hitting a small profit target, they unlock the next zone (market or park). Each zone has a description card:
  - "Market Fair (seasonal)" — shows foot-traffic graph, permit cost/duration, typical prices customers accept.
  - "Office Park (lunch only)" — shows 11 AM–2 PM peak, different customer profile.
- **Day-by-day revenue sim:** player selects a location and time slot (or auto-roam), sees estimated traffic and profit. Actual sales vary slightly (randomness, competition, weather).
- **Permit/cost tradeoff:** market has highest traffic but 2× permit cost and is closed Nov–Feb. Office park is steady but foot traffic is lower. Choosing is strategic, not obvious.
- **Multi-location play:** once player unlocks second truck (late-game), they can station one at each location, but each truck needs its own license.

**The "aha":**  
*"The 'best' location isn't the busiest one. Market fair gives volume but only 6 months/year and costs a lot. Office park is slower but consistent year-round. I have to pick based on my cash flow and calendar."* Location strategy is about *sustainable margin*, not chasing volume.

---

### 5. Cash Flow vs. Profit

**Definition:**  
**Profit** = revenue minus all costs (COGS, permits, fuel, salaries). **Cash flow** = when money actually enters and leaves your bank account. You can be profitable on paper but cash-dead if bills come due before customers pay you.

**Food-truck reality:**
- Day 1: you spend $500 on permits, $300 on peanuts & fuel. You're –$800 in cash.
- Days 1–10: you make $2,000 in sales (profitable on paper), but the permit cost hasn't been "earned back" yet. Your mental accounting: "I'm in the black, but barely."
- Suppliers: many wholesale peanut suppliers offer 15–30 day net terms. You buy on Day 1, don't pay until Day 15. That's a cash-flow advantage; your customer deposits come in first.
- Seasonal trough: winter (Nov–Jan) sees 40% fewer sales. If you're not careful, a good autumn leaves you with low cash reserves, and you can't buy for winter because you'll run out before spring revenue returns.

**Game mechanic:**
- **Dual ledger display (always visible):**
  - Left: "Cash in bank" (physical money, real-time).
  - Right: "Profit this week" (calculated post-hoc: revenue – all costs).
  - They diverge visibly. On a big roasting day with low sales, cash drops but profit shows red (loss). On a high-sales day, cash spikes faster than accounting profit (because suppliers net-15).
- **Supplier payment schedule:** player buys peanuts "on net-14"—they appear in the truck immediately, but a bill icon appears on the calendar for 14 days out. If you buy too much on Day 1, Day 15's payment spike might exceed available cash.
- **Winter alert:** in October, a "seasonal forecast" screen warns the player that sales will drop 40% Nov–Jan. If your cash reserve is below a threshold (e.g., $500), a red alert: "Cash flow risk: your savings won't cover Jan bills if you keep this pace."
- **Cash crunch → rescue arc (no game-over):** Per GDD canon, end-of-day cash below $25 triggers the “Save the Truck” rescue arc (NPCs offer loans, supplier credit, or pre-order deals) — the truck is never simply repossessed and the game never ends. This teaches: cash flow crises are solvable with community and planning; they are expensive, not fatal.
- **Teaching example — predatory loan rate:**
  > **Cautionary teaching example — not an endorsed path:** the payday-style loan appears in-game explicitly as a warning about predatory lending.

  The game can present a high-interest emergency option as a *warning* example. If shown, it must be explicitly labelled: “This is what a payday-style loan costs — ~180–435% APR in some US markets (varies widely by jurisdiction; capped or banned in many places). This is why you build cash reserves.” A realistic microloan alternative (5–8% annual, in-game) is the encouraged path.

**The "aha":**  
*"I made $2,000 this week but I'm worried about my bank account. That's because I spent $1,500 on permits and peanuts upfront. My profit and cash-on-hand are different creatures. If I mess up the timing, I go broke even though I should be profitable."* This is the single biggest reason small businesses fail.

---

### 6. Marketing & Reputation

**Definition:**  
How customers hear about you and decide to buy. In food service, word-of-mouth and visible signage are the main drivers; "earned media" (people talking about you) is free marketing.

**Food-truck reality:**
- Initial visibility: signage (truck paint, roadside menu board, social media if you post). Cost: minimal for a truck, maybe $20/month for prints.
- Word-of-mouth: one satisfied customer tells friends. Operator reports commonly cite 60–70% of repeat customers coming from word-of-mouth (no authoritative industry survey — SME to verify).
- Reputation mechanic: if you deliver consistently (no bad batches, fair prices, friendly service), customers return and bring friends.
- Earned media example: the "peanuts aren't nuts" gag. If a customer finds it funny and posts on social media, you get free buzz. No ad budget needed.

**Game mechanic:**
- **Customer memory system:** each NPC has a "satisfaction" meter (0–100). Selling them well-roasted peanuts at a fair price → satisfaction +20. Selling them burnt peanuts → satisfaction –30.
- **Repeat visit rate:** NPCs with satisfaction >70 visit your truck 2–3× per week; <30, they avoid you.
- **Referral event:** every time a high-satisfaction NPC visits, there's a small chance (5–10%) they bring a friend (a new NPC). Over time, word-of-mouth grows your daily foot traffic by 5–15%.
- **Legume-lecture NPC:** one memorable customer (e.g., "Professor Bean") lectures about legumes. If you respond with humor (the canon joke), satisfaction +50 and they become a regular. If you're rude, –40. This NPC is high-visibility (many other NPCs know them), so their satisfaction spreads reputation.
- **Signage upgrade:** spend $50–100 on a roadside banner or truck repaint. This increases baseline foot traffic by 10% and signals professionalism (affects new customers' base satisfaction).
- **Social media (late-game):** unlock a simple "post" action (free, takes 5 min/week). Posts about the legume gag or special flavors increase that week's foot traffic by 10–20%.

**The "aha":**  
*"I can't buy customers. I earn them. If I run a good operation, they come back and tell friends. The legume joke isn't just funny—it's marketing. People remember it and talk about me."* Reputation is an asset you build slowly, lose fast, and can't buy.

---

### 7. Seasonality

**Definition:**  
Demand changes predictably by season. Smart operators prepare for troughs and capitalize on spikes; naive ones get flattened by the swings.

**Food-truck reality:**
- **Summer (Jun–Aug):** fairs, festivals, outdoor markets, parks packed. Demand +40% vs. baseline. Permit costs for events: $80–150/day, but volume justifies it.
- **Fall (Sep–Oct):** harvest fairs, back-to-school events. Still strong, +15% vs. baseline.
- **Winter (Nov–Jan):** holidays (gift boxes boost revenue), but foot traffic drops 30–50% in parks/fairs. Outdoor vending is harder; some zones shut down.
- **Spring (Feb–May):** recovery; farmers markets return, weather improves. +20% vs. baseline as seasons shift.
- **Holiday gifting:** Nov–Dec, "gift bags" (premium packaging, 2–4 oz) see 3× markup. If you prep, this is a spike; if you're caught without stock, you lose revenue.

**Game mechanic:**
- **Calendar UI:** player sees the full year's forecast. Each season/month is color-coded (summer = yellow, winter = blue).
- **Seasonal revenue forecast:** shows expected foot traffic and pricing by zone and season. Player can plan around it.
- **Prestige bonus:** at the start of Year 2 (prestige loop), the player carries over their almanac knowledge, making forecasting easier.
- **Inventory challenge:** in November, player unlocks "Holiday Gift Boxes" (premium roasts, nice packaging). If they roasted enough peanuts in September–October, they can capitalize; if they didn't, they miss a revenue spike.
- **Trough survival:** January has the lowest foot traffic. Player must either:
  - Build cash reserves in summer/fall to coast through.
  - Find a secondary location (office park, indoor market) that's winter-resistant.
  - Reduce expenses (e.g., take a day off/week to lower fixed costs).
- **Failure condition (soft):** if a player runs out of inventory in summer or has too much in winter and it spoils, they feel the cost of poor seasonality planning.

**The "aha":**  
*"Summer looks great, but I can't coast on it. Winter comes every year, and if I didn't save in June, I'm in trouble by January. I have to think 6–12 months ahead."* Seasonality isn't random; it's predictable and plannable.

---

## Additional High-Value Concepts

### 8. Break-Even Analysis

**Definition:**  
The number of units (or dollars in revenue) you must sell to cover all fixed costs (permits, truck payment, insurance, fuel baseline). Below break-even, you lose money on each sale. At break-even, profit = $0. Above, you keep the margin.

**Food-truck reality:**
- Fixed costs per month: permits (~$40), truck payment (~$150), fuel baseline (~$100), insurance (~$80). Total: ~$370/month.
- At $1.50 selling price and $0.42 COGS, gross profit per unit: $1.08.
- Break-even: $370 / $1.08 = ~343 units/month ≈ 17 units/day (4-day operating week).
- Below 17/day: every sale is a loss (you're subsidizing with reserves). Above 17/day: you start profiting.

**Game mechanic:**
- **Break-even calculator (accessible, not mandatory):** player enters their fixed costs (permits, truck payment) and current COGS/price. Game shows: "You need to sell 18 peanut bags/day to break even."
- **Daily goal UI:** at start of each day, a faint target shows break-even threshold. If actual sales exceed it, the target turns green. If not, red. No failure, but visual feedback.
- **Prestige consequence:** on prestige (NG+), fixed costs increase (better truck, new permits in new zones), so break-even threshold rises. Player must optimize pricing or volume to stay above it.

**The "aha":**  
*"I don't profit on every sale. There's a survival line, and I have to cross it or I'm just draining my savings. That line changes if I add a second truck or upgrade."* Break-even is the reality check: how big do I need to be to survive?

---

### 9. Unit Economics per Location-Day

**Definition:**  
The profit/loss on a single day at a single location, broken down by revenue, COGS, and overhead allocation. This teaches the difference between a "busy day" (high revenue) and a "profitable day" (margin minus overhead).

**Food-truck reality:**
- Day 1 at Market Fair:
  - Units sold: 120
  - Revenue: 120 × $1.75 = $210
  - COGS: 120 × $0.42 = $50.40
  - Gross profit: $159.60
  - Market permit (for that day): $80
  - Fuel/propane (roasting): $10
  - Net profit for the day: $159.60 – $80 – $10 = $69.60
- Looks good! But allocate monthly permits/truck overhead, and that $69.60 becomes $20–30 after a fair allocation.

**Game mechanic:**
- **End-of-day report:** after operating at a location, player sees:
  - Revenue (units × price)
  - COGS subtotal
  - Gross profit
  - Location-specific costs (permit, fuel, time cost)
  - Net profit for the day
- **Weekly breakdown:** a table shows the 4–5 operating days; player can see which location/day combos are best.
- **Optimization puzzle:** player might discover: "Market Fair makes $70/day but has a high permit. Office Park makes $50/day with no permit cost. Which is better long-term?" (Answer: depends on frequency and prestige goals.)
- **Overhead allocation (late-game):** unlocks a deeper mode where fixed costs are split across days. Player learns: a $500/month truck payment spread over 22 operating days = $23/day overhead on every day.

**The "aha":**  
*"A 'good day' with $210 in revenue isn't a $210 profit day. Permits, fuel, and overhead chip away. I have to think about profit per location-day, not just customer count."* Revenue and profit are different; unit economics show the math.

---

### 10. Simple Bookkeeping & Record-Keeping

**Definition:**  
Keeping a basic log of transactions (what you bought, what you sold, what you paid for permits) so you know where money came from and where it went. This is not tax accounting; it's survival-level clarity.

**Food-truck reality:**
- Food-truck operators typically keep:
  - Daily cash sheet (cash in + credit cards in = expected bank deposit).
  - Receipt log (ingredient purchases, permit renewals).
  - Sales log (units sold, price, location, customer type).
- This lets them spot: "November sales were down 30% vs. October" or "I'm spending too much on fuel."
- Many food-truck operators use a simple Google Sheet or phone notes; formal accounting comes later.

**Game mechanic:**
- **Receipt system:** every transaction (buy peanuts, pay permit, make a sale) generates a receipt in a journal. Player can view receipts by date, type (income/expense), or location.
- **Weekly summary (automatic):** game generates a one-page report: total income, total COGS, total fixed costs, net profit. No spreadsheet knowledge required; just a clear form.
- **Trend spotting (optional deep-dive):** advanced players can view graphs: "Sales by week," "COGS as % of revenue," "Profit by location." Game highlights anomalies: "Your COGS spiked 15% this week—why?"
- **Prestige carryover:** on NG+, player's ledger from Year 1 is available for reference. They can see: "Last year, winter was brutal. I need more cash reserves this time."

**The "aha":**  
*"I'm not doing 'accounting.' I'm keeping notes so I can see patterns. When I wonder why I'm stressed, I look at my journal and I see: 'Oh, permits doubled this month.' Or: 'I sold less but spent more on fuel—efficiency problem.'"* Bookkeeping is a mirror, not a punishment.

---

## Curriculum Integrity Rules

1. **Plausibility, not reality.** Game numbers are simplified but grounded in real food-truck economics. If a real permit costs $325–750/year, the game rounds to $500. If real COGS is $0.38–0.48, the game uses $0.42. Never invent fantasy margins (e.g., 90% gross) or trivial costs.

2. **Failure is survivable and instructive.** If a player makes a bad decision (overstock, wrong location, too-high price), they don't "lose instantly." They feel the consequence (cash drops, sales lag) and have 2–4 days to recover. This teaches: mistakes are expensive, not fatal; recovery is possible with planning.

3. **No get-rich-quick framing.** Success is measured in stability and steady profit, not wealth accumulation. A player who reaches "Year 2" with $5,000 saved and two trucks at 2 stable locations has "won," not a player who hit $50,000 in a month (unrealistic and bad pedagogy).

4. **Time value is real.** Operating days are limited; a player can work 4–5 days/week. This teaches: you can't scale infinitely with one truck. Growth requires either longer weeks (burnout) or a second truck (expense/permits). This mirrors reality.

5. **Simplify, don't distort.** The game omits taxes, insurance, and detailed labor costs (owner-operated initially). But the numbers stay internally consistent: if permits are $500 and revenue averages $250/day at baseline, the math still works out: you need to survive ~2 weeks to hit break-even. No fudging to make progression "feel fast."

6. **Sensitivity: peanut allergies.** The legume-lecture NPC can mention allergy seriousness ("I'm allergic, so this is a hard pass for me"), but the game never jokes about allergies. Allergy = real-world safety concern; the joke is about botany pedantry, not risk.

---

## Player Progression of Understanding

| **Game Phase** | **Duration** | **Concepts Unlocked** | **Player Feels...** |
|---|---|---|---|
| **Intro (Day 1–5)** | ~1–2 hrs | COGS, basic pricing, first roasting | Curiosity; learning the loops |
| **Early (Day 6–20)** | ~3–5 hrs | Permits & licensing, gross margin, location strategy (1st unlock) | Constraint; "oh, I can't just make unlimited peanuts" |
| **Mid (Day 21–60)** | ~8–12 hrs | Cash flow vs. profit, seasonality forecast, second location unlock, reputation/marketing first benefits | Puzzlement then insight; "why am I stressed if I'm profitable?" → "Oh, cash-flow timing." |
| **Late (Day 61+)** | ~15+ hrs | Break-even, unit economics, bookkeeping trends, prestige mechanics, second truck unlock | Mastery; strategic depth; prestige loop tempts |
| **Prestige (NG+)** | ~10+ hrs | All prior + deeper optimization, compound growth, advanced seasonal planning | Optimization loop; min-maxing for "perfect" year |

---

## Open Questions for Subject-Matter Review

1. **Permit realism:** Is $500 for combined health + mobile-vendor permit plausible in the target region? Should the game vary by difficulty (tutorial = simplified, hard mode = real numbers)?

2. **Seasonality granularity:** Real food trucks adjust for fairs/events within seasons. Should the game model individual events (e.g., "Pumpkin Fest, Oct 15–20, +50% traffic") or just seasonal bands?

3. **Debt & credit:** Should the game allow credit cards or formal loans? Or keep it simple: cash-only, with an optional "emergency loan" (high interest) for late-game learning?

4. **Allergy mechanic depth:** Beyond NPC allergy mentions, should the game require periodic food-safety certifications, or is the "Health Permit renewal" gate sufficient?

5. **Prestige loop design:** On NG+, should fixed costs reset (new truck, new permits) or carry over (you "bought it," keep the asset)? This changes the entire year-2 strategy.

6. **Educator angle:** Should there be a "curriculum mode" that locks certain UI elements (no prestige, simplified permits) for school use? Or keep one coherent design?

7. **Narrative vs. mechanics:** Should the legume-lecture NPC have a story arc (e.g., they learn the owner's name, become a friend, teach the owner about botany), or stay a recurring gag?

---

**Total lines:** ~450 | **Concepts added beyond 7 required:** 3 (Break-Even Analysis, Unit Economics, Simple Bookkeeping)
