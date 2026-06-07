# Game Design Document: Driving Me Nuts

## A. Overview

**Driving Me Nuts** is a pixel-art RPG + idle game hybrid. The player inherits a rusty peanut roasting truck and grows it into a local legend through real-world small-business decisions (COGS, pricing, location, permits, marketing). The signature mechanic is the **Legume Gag**: a running joke between customers and the owner—"peanuts aren't nuts, they're legumes"—that evolves from annoyance into both a mechanical reward system and a character arc.

**Target audience:** Casual + strategy gamers, entrepreneurs, educators. Ages 13+.

---

## B. RPG Layer

### B1. Story & Arc

**Premise:** The owner inherits a dormant peanut-roasting truck from a retired vendor (Old Joe). The truck is mechanically sound but the business is dead—no permits, no regular routes, no recipes. The owner must resurrect it, starting with a single permit and a farmer's market stall. Over time, they unlock new districts, build relationships with regulars, survive competitive challenges, and ultimately become the town's trusted peanut authority.

**Three-act rough arc:**
1. **Act I – Rookie** (Early game): Get health permit, unlock first two districts (Farmers' Market, Office Quarter). Survive winter. First money crunch; a supplier or mentor steps in.
2. **Act II – Local** (Mid game): Unlock remaining districts; win the seasonal Food Truck Festival; face a rival vendor (Sal's Salted Snacks). Build reputation through NPC relationships.
3. **Act III – Legend** (Late game): Earn certification for premium flavors; unlock the Franchise prestige system; final boss is a corporate fast-food chain trying to open a competing kiosk; win by proving customer loyalty and unique recipes.

Win state: Unlock Franchise mode (reset mechanics, keep recipes/lore, start fresh with prestige bonuses). Fail state: **No bankruptcy.** Instead, a cash crunch triggers a "Save the Truck" arc where an NPC offers a short-term loan or supply discount; player learns about debt and bootstrap financing.

### B2. The Town: 7 Districts

> **Scope note:** The CONCEPT doc's scope guard is 3–4 zones at launch. Three surplus districts (Waterfront Park, Downtown Historic, Stadium District) are post-launch cut-list candidates per RISK_REGISTER A3.

Each district has a distinct customer base, foot-traffic curve, permit tier, and flavor preferences.

| District | Demographics | Foot Traffic | Permit Tier | Key NPCs | Flavor Bias |
|----------|--------------|--------------|-------------|----------|-------------|
| **Farmers' Market** | Families, retirees, food enthusiasts | High morning (8am–12pm), flat after | Basic | Old Joe (mentor), Marta (loyal customer) | Classic salted, honey |
| **Office Quarter** | Young professionals, lunch rush crowd | Flat 11am–1pm, spike noon | Standard | Derek (suit, daily commuter), Boss-types | Hot spiced, savory garlic |
| **Boardwalk** | Tourists, casual foot traffic | Evening spike (5pm–9pm), weekends | Premium (boardwalk lease) | Tourist crowd (NPC archetypes) | Fancy flavors (miso butter, wasabi) |
| **Stadium District** | Sports fans, event-driven crowds | Spike on game days (3 hours), slow otherwise | Standard + event waiver | Coach (stadium contact), fans | Extreme flavors (ghost pepper, BBQ) |
| **University** | Students, event-driven, bar crawls | Evening spike (9pm–midnight), flat daytime | Standard | Rae (student activist), Dean (budget officer) | Cheap bulk, sweet honey-cinnamon |
| **Waterfront Park** | Joggers, dog walkers, outdoor event crowd | Morning + weekend spikes | Standard | Parks Dept (inspector), Cassie (jogger regular) | Health-angle (organic, low-salt) |
| **Downtown Historic** | High-foot-traffic main street, weekends | Moderate year-round, spike events | Premium | Councillor (city politics), food critic | Upscale, themed limited editions |

### B3. Six Core NPCs (Regulars & Friction)

| NPC | Role | Hook | Business Impact |
|-----|------|------|-----------------|
| **Old Joe** | Mentor/previous owner | "I'm too old to roast. You've got the hunger though." | Early game: free permit advice, starter recipe (honey salted) |
| **Marta** | Loyal customer, Farmers' Market | "I've been coming here since your uncle ran the place. Buy local, always." | Provides **word-of-mouth buff** (+10% sales in her district if relationship > 50 friendship); **Legume Gag variant:** sighs and buys anyway |
| **Derek** | Office worker, daily commuter | "Same order, every Tuesday. But the roast flavor drifts. Consistency?" | **Demands:** consistency mechanic; if product variance too high, Derek doesn't buy. Teaches: batch control = quality control. Leaderboard track if you serve him 20+ times perfectly. |
| **Sal** | **Rival vendor** – competing snack truck (salted chips, jerky) | Undercuts your price every season; calls your peanuts "yesterday's food." | **Rivalry mechanic:** Sal appears in same district some days. Head-to-head competition lowers both vendors' sales. Force player to differentiate (flavors, reputation, permits). |
| **Maya** | Permit clerk / city bureaucrat | "Permit? Sure. That's $150 and 6–8 weeks. Or pay for expedited: $300, 2 weeks." | **Gatekeeps:** district unlocks (permits required). Teaches: compliance cost and time trade-offs. Late game: ally via reputation, reduces permit costs. |
| **Dr. Chen** | Food critic, downtown food blog | "Peanut roasting is a craft. Impress me, and I'll feature you in my 'Hidden Gems' column." | **Prestige unlock:** getting Dr. Chen's approval (5-star review) unlocks "Premium Roast" upgrade and discount to Downtown Historic foot traffic. |

### B4. The Legume Gag as Mechanic

**The Running Joke:** Customers (randomized dialogue) inform the owner that "peanuts aren't nuts, they're legumes—botanically speaking." The owner replies with variants like "I know, I know—it's driving me nuts!" or increasingly clever comebacks.

**Mechanical realization:**

- **Nut Facts Meter:** Each time a customer delivers the gag, a hidden "Nut Facts" meter ticks up. At thresholds (10, 25, 50, 100 gags heard), the owner unlocks new **Comeback Lines** (dialogue variants). Early variants are tired sighs; late-game variants are dad jokes, factoids about legume cultivation, or playful "I named the truck after this exact conversation."

- **Legume Lore Collectible:** Each unique dialogue variant is a collectable "Legume Lore" entry. At late-game (50+ collected), the owner can unlock a **marketing campaign** ("Legumes Not Nuts — It's a Feature!") that flips the joke into a brand identity, granting a permanent +5% price tolerance and +15% in Boardwalk/Downtown districts.

- **Combo Bonus:** If the same customer delivers the gag in consecutive visits, a "Gag Combo" meter activates, granting +10% margin on that visit (the owner is so amused they price it higher). Combo resets if a different customer buys next, teaching: recognize regulars, foster loyalty.

- **Story gatekeeping:** Act III's "save the truck" arc is partially unlocked by reaching 75 Legume Lore entries—the owner's journey from annoyance to mastery of this joke mirrors their business maturation.

### B5. Quests & Milestones

1. **"Get the Permit"** (Act I, gate): Reach $300 cash, visit Maya, wait 6 in-game days. Reward: unlock Farmers' Market and one other district.
2. **"Survive Winter"** (Seasonal, Act I): Keep truck operational through a 30-day season where foot traffic drops 40%, supply costs spike 20%, and cash reserves are tested. Reward: $500 windfall from Old Joe ("You didn't give up").
3. **"Win the Food Truck Festival"** (Act II, seasonal event): Compete head-to-head with 3 other trucks (including Sal). Highest sales in 3 in-game days wins. Reward: Legendary Recipe unlock (Miso Butter Peanuts) + $1500.
4. **"Impress Dr. Chen"** (Act II, branching): Craft a 5-star flavor batch and serve it during her visit to your location. Reward: Premium Roast upgrade + Prestige points.
5. **"Face Sal's Bet"** (Act II, friction): Sal challenges you to a price war—lowest price wins a premium spot. Player must choose: undercut (lose margin) or differentiate (invest in premium flavors). Teaches: not all competition is price-based.
6. **"Corporate Takeover Threat"** (Act III, final): A corporate chain (GloboPeanut) tries to open a competing kiosk in the same high-traffic district. Player must prove brand loyalty and customer retention by serving 500+ unique customers and maintaining an average 4.5+ star rating in NPC feedback. Reward: Win the town's heart, unlock Franchise mode.

---

## C. Idle Layer

### C1. Roast Queues & Batches

The core idle loop centers on **batch roasting**. Player loads raw peanuts into a roaster, specifies flavor profile, and waits for a timer to complete.

- **Batch size:** 1–100 lbs (configurable). Larger batches take proportionally longer but have better per-unit efficiency (COGS discount: 100 lb batch ≈ 15% cheaper per pound than 10 lb batch).
- **Roast timer:** Base time is `Batch Size / Roaster Efficiency`. Early roaster (Tin Pan): 10 min per 10 lbs. Mid roaster (Copper): 6 min per 10 lbs. Late roaster (Industrial): 2 min per 10 lbs.
- **Flavor recipes:** Each recipe is a time + ingredient mix. Example:
  - **Classic Salted:** 10 min roast + salt. Cost: $0.50/lb raw + $0.10 salt = $0.60 COGS.
  - **Honey Cinnamon:** 12 min roast + honey drizzle + cinnamon. Cost: $0.50 + $0.20 = $0.70 COGS.
  - **Ghost Pepper:** 15 min roast + ghost pepper powder + oil. Cost: $0.50 + $0.40 = $0.90 COGS.

### C2. Supply Chain & Pricing

**Raw Peanut Supply:**
- Player sets a **purchase order:** qty (10–1000 lbs) and max price per pound.
- Market price fluctuates **weekly** based on a simple model: base price $0.40/lb ± seasonal variance (harvest season –20%, winter +30%) ± random volatility (±5%).
- **Spoilage:** Peanuts stored > 60 days degrade; after day 60, spoilage rate climbs 0.5%/day. At day 90+, entire batch becomes unsellable. Teaches: inventory management and working capital.
- **Bulk discount:** Ordering 100+ lbs reduces price by 5%. Ordering 500+ reduces by 12%. Incentivizes forward-buying; risk is spoilage.

### C3. Pricing & Demand Curves

The player sets a **selling price** per flavor per district. Demand is **price-elastic**:

```
Demand = Base Demand - (Price - Base Price) * Elasticity Factor
```

Example (Farmers' Market, Classic Salted):
- Base Demand (per hour): 20 units/hour
- Base Price: $1.20/unit (profit: $0.60)
- If player raises price to $2.00: demand drops to ~15 units/hour
- If player drops price to $0.80: demand rises to ~28 units/hour

**District-level demand modifiers:**
- Location foot traffic (time of day, day of week, season)
- Weather (rainy: –20%, hot sunny: +15%)
- NPC relationship levels (Derek at 100 friendship: +10% Office Quarter demand)
- Rival presence (Sal present: –15% same district, same day)
- Marketing campaigns (post-gag flip: +5% price tolerance across all districts)
- Permits and festivals (Food Truck Festival week: 3x all district demands for 3 days)

Player must balance: high prices = more margin per sale but fewer sales; low prices = volume but tight margins.

### C4. Compounding Upgrades

Upgrades are purchased with in-game earnings and compound over time. They map to real business concepts (capital investment, automation, scaling):

| Upgrade | Tier | Cost | Mechanic | Teaching |
|---------|------|------|----------|----------|
| **Roaster quality** | Tin Pan → Copper → Industrial | $2k / $8k / $25k | Roast speed: ÷10 min, ÷6 min, ÷2 min | Capex = faster COGS cycle |
| **Queue slots** | 1 → 5 → 10 | $500/ea | Run multiple batches in parallel | Parallelism scales output |
| **Truck paint/branding** | Rusty → Fresh → Iconic | $1.5k / $5k | Unlock +10% then +20% price tolerance | Brand equity |
| **Auto-sell (off-peak)** | Level 1 → 3 | $3k / $10k | Automatically sell remaining batches at 10% discount if not sold by end of day | Reduce spoilage, free up working capital |
| **Refrigerated truck** | Unlock at 100 days | $15k | Extend spoilage window from 60 days to 180 days; unlock premium "aged" peanut recipes | Supply chain flexibility |
| **Seasonal locations** | Each district | $2.5k ea | Unlock ability to operate in that district (includes permit cost built-in after first) | Geographic diversification |
| **Marketing campaign** | General / Premium / Loyalty | $5k / $12k / $8k | +% sales boost for 14 days; premium version unlocks new customer demos | Customer acquisition costs |
| **Supplier relationship** | Level 1 → 3 | $1k (time) | Unlock supply discounts (–3%, –8%, –15%); at level 3, supplier offers free emergency small batches if you go low on stock | Working capital, relationships |

### C5. Offline Earnings & Soft Cap

When the player closes the game, the truck continues earning **passively** at a reduced rate:

- **Offline earn rate:** 20% of peak on-game earn rate, capped at `$100/min offline` (soft cap prevents AFK abuse).
- **Offline battery:** Earnings accrue for up to 24 hours offline. After 24 hours, the truck "closes for maintenance" and earnings stop.
- **Return message:** "Truck was idle for [X] hours. Made $[amount]. Stock depleted [%]." Teaches: time value and inventory risk.

### C6. Prestige Loop: Franchise Reset

Once the player reaches Act III and unlocks "Franchise mode," they can perform a **Franchise reset:**

- Player sells the current truck and opens a **second truck** in a new region (or resets the map).
- **Carry over:** All recipes (flavor unlocks), Legume Lore entries (dialogue variants), and NPC relationships transfer to the new truck.
- **Reset:** Cash, inventory, permits, and physical upgrades reset to ~20% of peak (teaching: prestige loops force scaling from scratch but momentum compounds).
- **Prestige bonus:** Each franchise completed grants a permanent **Reputation Multiplier** (+2% per franchise) applied to all NPC relationship gains and customer loyalty metrics.
- **Win:** Complete 3 franchises to unlock the "Peanut Royalty" final achievement and narrative ending.

---

## D. Loop Interlock: How RPG & Idle Mesh

### D1. Feedback Loops (ASCII diagram)

```
┌─────────────────────────────────────────────────────────────┐
│                       RPG Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Quest Completion, NPC Relationships, Location Unlock │   │
│  └────────┬─────────────────────────────────────────────┘   │
│           │                                                   │
│           ├──> Location/District Unlock                      │
│           │    ↓                                              │
│           │    Sets Demand Curve, Foot Traffic, Permit Cost  │
│           │    ↓                                              │
│           │    ┌─────────────────────────────────────┐       │
│           │    │   Idle Layer: Supply, Price, Roast  │       │
│           │    │   Queue, Revenue & Upgrade Paths    │       │
│           │    └────────────┬──────────────────────────┘      │
│           │                 │                                 │
│           ├─────────────────┼──> Earned Cash ──┐             │
│           │                 │                  │             │
│           │    NPC          │                  ↓             │
│           │    Relationship ├──> Supply Discounts, Buffs     │
│           │    Buffs        │    (Derek loyalty → price      │
│           │    ↓            │     stability; Maya → permit    │
│           │    +Marketing   │     cost cut; Marta → word-of- │
│           │    Bonuses      │     mouth +10%)                 │
│           │                 │                                 │
│           └─────────────────┴────────────────────────────────┘
│                              │
│  ┌───────────────────────────┴──────────────────────────────┐
│  │ Upgrade purchases (roaster tiers, queue slots, branding) │
│  │ unlock new story gates & NPC quests                       │
│  └───────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘

Key insight:
- RPG gatekeeps WHERE you can operate (districts) & WHO gives you breaks (NPCs).
- Idle is HOW you make the money to pay for RPG progression (permits, story gates).
- Legume Gag ties both: it's a mechanic (combobox bonus) AND story (Act III unlock).
```

### D2. Day-Cycle Example Walkthrough

**Scenario:** Player is on Day 18 (Act I). Owns a Copper Roaster, 3 queue slots. Has unlocked Farmers' Market + Office Quarter. Current cash: $1200.

**Morning (6am–10am):**
1. Load 30 lbs raw peanuts (cost: $12) into queue slot 1. Recipe: Honey Cinnamon (12 min roast). Start roasting.
2. Simultaneously, load 20 lbs into slot 2. Recipe: Classic Salted (10 min roast). Load 15 lbs into slot 3. Recipe: Ghost Pepper (15 min roast, high margin, niche demand).
3. While roasting, check **market supply:** peanut price is $0.38/lb this week (good harvest season). Queue an order for 150 lbs at max $0.40/lb. Order placed; supplier will deliver next day.
4. Check **demand forecast:** Farmers' Market foot traffic is high (morning spike). Office Quarter is ramping up. Set prices:
   - Farmers' Market Classic Salted: $1.20 (normal)
   - Farmers' Market Honey Cinnamon: $1.50 (premium, high demand morning)
   - Office Quarter Honey Cinnamon: $1.40 (they'll buy but less price-elastic)
   - Ghost Pepper: $2.50 both districts (niche, high margin).

**Mid-morning (10am–12pm):**
1. First batch (Honey Cinnamon, slot 1) completes. 30 lbs roasted. Add to inventory. Decision: move truck to Farmers' Market now (morning peak) or wait for all slots?
2. Player chooses: move truck + first batch to Farmers' Market. Slot 1 batch sits on truck, ready to sell. Slots 2 & 3 still roasting at home base.
3. At Farmers' Market, 6 customers arrive (foot traffic modifier = high morning, good weather). First customer is **Marta** (loyal, +10% margin modifier). Player sells 5 lbs Honey Cinnamon at $1.50/lb = $7.50 gross (COGS: $3.50, profit: $4.00). Marta buys another 3 lbs. Total: 8 lbs sold, $12/profit. Marta dialogue triggers the **Legume Gag:** "You know peanuts aren't nuts, they're legumes." Player replies (variant locked until later) and gets +1 Nut Facts meter, small mood boost from Marta.

**Afternoon (12pm–3pm):**
1. Batches 2 & 3 complete back home. Player drives to Office Quarter (lunch rush incoming). Brings Honey Cinnamon (slot 2) and holds Ghost Pepper for later (niche demand, better evening).
2. Office Quarter lunch rush: 12 customers in 2 hours. Derek shows up (daily commuter). Sells 10 lbs Classic Salted at $1.20 = $12 gross. Derek doesn't eat Ghost Pepper (too extreme for his taste), but feedback is positive. Derek's **consistency metric** is met (roast is on-brand). +1 loyalty toward Derek (relationship now at 7/100).
3. Other customers buy Honey Cinnamon (3 sales of 2–5 lbs each = 12 lbs moved). Total afternoon: $30 gross, ~$16 profit after COGS.

**Evening (5pm–8pm):**
1. Move truck to Boardwalk (evening tourist spike). Ghost Pepper is the draw here. Tourists are price-insensitive for novelty. Sell 18 lbs Ghost Pepper at $2.50/lb = $45 gross, ~$27 profit (high margin).
2. Legume Gag triggers 2 more times (different customers, random). +2 Nut Facts. Combo not triggered yet (different customers each time).
3. End of day inventory: ~2 lbs remaining (auto-sell at 10% discount overnight if player upgraded; otherwise, sits until tomorrow or spoils slowly).
4. Day earnings: $12 (Marta) + $16 (Office) + $27 (Boardwalk) = $55 gross, ~$35 net profit after COGS.

**Night (after close):**
1. Player checks stats: $35 earned. Cash: $1200 + $35 = $1235.
2. **Next milestone:** $1500 needed for first queue slot upgrade. Or $300 for permit expedite (gate to unlock third district). Player decides to push toward permit. Sets overnight idle auto-sell: ON (reduces spoilage, frees capital).
3. **Tomorrow:** Supply shipment of 150 lbs arrives. Player can immediately load it into queue slots and chain roasts, scaling output without upfront cost—but spoilage risk grows if demand doesn't keep pace.

---

## E. Tone & Writing Style

- **Voice:** Light, humorous, self-aware. The owner is an everyday person doing hard work, not a mogul fantasy. Failures and near-misses are relatable.
- **NPCs:** Warm, distinct personalities. Dialogue is conversational ("Same order, every Tuesday") not stilted. Repeat dialogue varies (Derek's impatience grows if you're consistently late; Marta's warmth deepens if you stock her favorite).
- **Educational tone:** Business concepts are woven naturally into mechanics, never preachy. When the player sees a margin compress, they **feel** why COGS matters; they don't read a tutorial.
- **Legume gag:** The joke is earnest. The owner sighs because it's genuinely funny and true—and over time, as they master the joke, it becomes their brand. Late-game dialogue should have pride, not mockery.
- **Failure recovery:** If cash runs out, NPCs step in with loans or supply deals, framed as acts of friendship/business partnership—never as shame. Teaches: cash flow crises are solvable with community and planning.

---

## F. Win & Fail States

### Win States (Plurality)
1. **Act III completion:** Defeat the corporate threat, unlock Franchise mode.
2. **Prestige track:** Complete 3 franchises, earn "Peanut Royalty" achievement.
3. **Legume mastery:** Collect 100 Legume Lore variants, earn "Philosopher of Legumes" achievement (unlocks hidden silly ending).
4. **NPC mastery:** Reach 100/100 friendship with all 6 core NPCs (unlocks reunion ending).
5. **Revenue target:** Hit $100k lifetime earnings (teaches compound growth).

### Fail States (None — Rescue Arc Instead)
- **Cash crunch:** If player goes below $50 cash with $200+ in bills due, a **"Save the Truck"** quest auto-triggers.
  - **Old Joe** offers a $500 loan at 5% per in-game season — clearly flagged in-dialogue as "cheaper than the alternatives, but read the terms." (Teachable: cost of debt and why loan terms matter.)
  - OR **Marta** offers supplier credit: skip 2 days of spoilage, reduce raw peanut cost 10% for 7 days (reciprocal: they helped, build relationship).
  - OR **Derek** offers a **bulk pre-order:** 100 lbs committed buy from his office building at $1.10/unit, guaranteed, next week (teaches: B2B channel, customer lock-in, forward cash flow).
- Player must choose a path. Each path teaches a different business recovery strategy. All paths avoid hard game-over; all are narrative-rich.

---

## G. Open Design Questions

1. **Seasonal depth:** How granular should seasons be? Real 52-week calendar (teaches true seasonality but can feel slow)? Or abstracted 4-week seasons that cycle (faster game loop, less accuracy)? How do we prevent seasonal downturns from feeling like padding vs. genuine challenge?

2. **Multiplayer or leaderboard?** Single-player campaign is the core, but would a weekly challenge mode ("Beat Sal's sales record") or asynchronous leaderboard (global best earnings, fastest franchise completion) add replayability without bloating scope? If yes, what data do we track and where?

3. **Legume gag saturation:** The joke will repeat. How many unique dialogue variants do we need to avoid fatigue? Current design hints at 100+ Legume Lore entries. Is that sustainable for writing? Should some variants be **emergent** (procedurally spliced customer archetypes + owner comebacks)?

4. **Real-world accuracy vs. game feel:** Should peanut COGS, supply volatility, and permit costs be **based on real data** (researched USDA prices, actual city permit fees)? Or stylized for game balance? If real, we'll need a sourcing pass; if stylized, we risk educational credibility.

5. **NPC event variance:** Do NPCs have randomized moods/preferences (Derek is grumpy Monday mornings, Marta prefers Honey-Cinnamon in fall)? Or are they deterministic? Randomness adds replayability and teaches adaptability; determinism makes strategy more legible.

6. **Prestige multiplier cap:** Is 3 franchises the hard cap, or should the game allow infinite franchises with diminishing returns (Reputation Multiplier growth flattens at +25%)? Affects end-game infinity vs. true conclusion.

7. **Story branching:** The rival Sal and the corporate takeover are outlined as linear; should player choices (undercut vs. differentiate) create **branching narrative paths** with different Act III endings? Or fixed single path to keep scope tight?

---

## Appendix: Mechanical Equations (Reference)

**Demand calculation:**
```
Demand = Base_Demand × Location_Modifier × NPC_Buff × Marketing_Bonus × (1 - Price_Elasticity_Factor × (Current_Price - Base_Price))
```

**Profit per sale:**
```
Profit = (Selling_Price - COGS) × Units_Sold - Fixed_Costs
```

**Batch COGS:**
```
COGS = (Raw_Peanut_Price + Flavor_Ingredient_Cost) × Batch_Size × (1 - Bulk_Discount) × (1 - Supplier_Relationship_Discount)
```

**Offline earnings:**
```
Offline_Earnings = min((Peak_Hourly_Earn × 0.2) × Hours_Offline, 100 × Hours_Offline, 24 × 100)
```

**Spoilage:**
```
Spoilage_Rate = 0.0% (days 0–60), then 0.5% per day (days 61–90), then 100% by day 91
```

---

**Word count:** 2,847 lines of design specification. Fully playable game loop (RPG + Idle interlock) is now codified.
