# SME Review Checklist — Driving Me Nuts
## Business-Accuracy Gate (P1 Exit)

**For:** Accountant / small-business SME  
**Purpose:** Verify 93 factual claims from docs/BUSINESS_CURRICULUM.md are accurate
enough for an educator to trust. Not a game-design or UX review.  
**Time estimate:** 2–4 hours. Start with Section A (Permits) — highest jurisdiction
variability — then follow the order below.

**Marking key:**

| Mark | Meaning |
|---|---|
| `[ ]` | Not yet reviewed |
| `[OK]` | Accurate / acceptable simplification |
| `[+CAV]` | OK but add a caveat (e.g., "varies by jurisdiction") |
| `[MISL]` | Misleading simplification — needs a note |
| `[WRONG]` | Factually incorrect — blocks P1 exit |

Flag threshold: any `[WRONG]` blocks P1. Any `[MISL]` triggers a research + curriculum
update. `[+CAV]` triggers a minor tooltip/disclaimer edit.

---

## A. Permits & Licensing (Section 3 — 11 claims)

**Why first:** Highest jurisdiction variability; most likely to need caveats.

| # | Statement | Mark | Notes |
|---|---|---|---|
| 3.1 | Health permit (mobile vendor): $300–800/year, renewed annually, requires inspection | `[ ]` | |
| 3.2 | Mobile vendor license (city): $400–600/year, location-specific; renewal + new fee to move zones | `[ ]` | |
| 3.3 | Fire certificate (propane roaster): $100–200, every 2 years | `[ ]` | |
| 3.4 | Zone/location permit — festival: $50–150/day | `[ ]` | |
| 3.5 | Zone/location permit — park vending: $100–200/season | `[ ]` | |
| 3.6 | Permit processing time: 2–6 weeks; can't legally operate without them | `[ ]` | |
| 3.7 | In-game combined Health + Mobile Vendor permit: $500 upfront, 3 in-game days | `[ ]` | *(simplification; full range per 3.1+3.2 = $700–1,400/yr real — verify $500 is defensible as tutorial shorthand)* |
| 3.8 | Permit expiry notification: 30 days before expiry | `[ ]` | *(mechanic, not a real-world claim — mark N/A if no opinion)* |
| 3.9 | Permit expiry fine: $200–500; 2-day suspension | `[ ]` | |
| 3.10 | Location permit cost (in-game): $100–200, 1–2 day delay for zone change | `[ ]` | |
| 3.11 | Second truck licensing cost (in-game): $500 per truck | `[ ]` | |

**Open question for you (Q1):** Is the $500 combined permit plausible in your target
region, or should the game vary by difficulty? (2–3 sentences.)

---

## B. Location Strategy & Foot Traffic (Section 4 — 16 claims)

**Why second:** Foot-traffic estimates and price willingness are region-sensitive;
also flags if seasonal assumptions match your experience.

| # | Statement | Mark | Notes |
|---|---|---|---|
| 4.1 | Residential zone — foot traffic: 100–150/day | `[ ]` | |
| 4.2 | Residential zone — willingness to pay: $1.25–1.50 | `[ ]` | |
| 4.3 | Residential zone — permit cost: $50/season | `[ ]` | |
| 4.4 | Market/fair — foot traffic: 300–500/day | `[ ]` | |
| 4.5 | Market/fair — willingness to pay: $1.75–2.00 | `[ ]` | |
| 4.6 | Market/fair — permit cost: $80–150/day | `[ ]` | |
| 4.7 | Market/fair — season: high-season only | `[ ]` | |
| 4.8 | Office park — foot traffic: 80–120/day | `[ ]` | |
| 4.9 | Office park — willingness to pay: $1.50–2.00 (higher income) | `[ ]` | |
| 4.10 | Office park — time window: lunch rush 11 AM–2 PM | `[ ]` | |
| 4.11 | Office park — permit cost: $100/month | `[ ]` | |
| 4.12 | Office park — season: consistent year-round | `[ ]` | |
| 4.13 | Park (weekend) — foot traffic: 150–250/day | `[ ]` | |
| 4.14 | Park (weekend) — willingness to pay: $1.00–1.25 (price-sensitive) | `[ ]` | |
| 4.15 | Park (weekend) — season: weekends only, seasonal | `[ ]` | |
| 4.16 | Park (weekend) — permit cost: $100/season | `[ ]` | |

**Open question for you (Q2):** Real trucks adjust for specific events (e.g., "Pumpkin
Fest Oct 15–20, +50% traffic"). Should the game model individual events or seasonal
bands? (Your call as SME.)

---

## C. Seasonality (Section 7 — 10 claims)

**Why third:** Demand swings and holiday gifting claims can be checked quickly once
location strategy is done.

| # | Statement | Mark | Notes |
|---|---|---|---|
| 7.1 | Summer demand (Jun–Aug): +40% vs. baseline | `[ ]` | |
| 7.2 | Summer permit costs (festivals): $80–150/day | `[ ]` | *(matches 4.6 — flag if inconsistent)* |
| 7.3 | Fall demand (Sep–Oct): +15% vs. baseline | `[ ]` | |
| 7.4 | Winter foot traffic (Nov–Jan): 30–50% drop in parks/fairs | `[ ]` | *(cross-check claim 5.4 — 40% winter reduction)* |
| 7.5 | Winter outdoor vending challenge: some zones shut down; outdoor vending harder | `[ ]` | |
| 7.6 | Spring demand (Feb–May): +20% vs. baseline | `[ ]` | |
| 7.7 | Holiday gifting (Nov–Dec): gift bags (2–4 oz, premium packaging) see 3× markup | `[ ]` | **Higher-risk.** 3× markup on gift bags — verify against typical snack gifting margins. |
| 7.8 | Holiday gifting: revenue spike if prepped; loss if caught without stock | `[ ]` | |
| 7.9 | January: lowest foot traffic of year | `[ ]` | |
| 7.10 | Trough strategies: build reserves in summer/fall, find winter-resistant location, or reduce expenses | `[ ]` | |

---

## D. Cash Flow vs. Profit (Section 5 — 8 claims)

**Why here:** Supplier terms and the cash-crunch math are standard small-biz
challenges; cross-checks with the worked example in Section I.

| # | Statement | Mark | Notes |
|---|---|---|---|
| 5.1 | Day 1 spend: $500 permits + $300 peanuts/fuel = –$800 cash | `[ ]` | |
| 5.2 | Days 1–10 revenue example: $2,000 sales (profitable on paper) | `[ ]` | |
| 5.3 | Supplier net terms: 15–30 day net terms (common in wholesale) | `[ ]` | **Higher-risk.** Small/new food-truck operators are often cash-up-front until credit history is established. Flag if misleading. |
| 5.4 | Winter sales reduction: 40% fewer sales Nov–Jan | `[ ]` | *(matches 7.4 — verify consistency)* |
| 5.5 | In-game supplier payment: Net-14 terms | `[ ]` | *(simplified; see 5.3 caveat)* |
| 5.6 | Cash crunch at $0 triggers rescue arc (loans, supplier credit, pre-orders); truck never repossessed | `[ ]` | *(mechanic; mark N/A if no opinion on realism of "never repossessed" as pedagogy)* |
| 5.7 | Emergency loan warning rate: payday-style ~180–435% APR | `[ ]` | **Higher-risk.** APR range for predatory short-term loans — verify this range is accurate and legally citable as a teaching example. |
| 5.8 | Microloan alternative: in-game 5–8% annual | `[ ]` | **Higher-risk.** SBA microloan rates 2024 are roughly 6–9%; 5–8% is slightly low end. Flag if misleading. |

**Open question for you (Q3):** Should the game allow credit cards or formal loans, or
keep it simple: cash-only with an optional high-interest emergency loan for late-game
teaching?

---

## E. COGS — Cost of Goods Sold (Section 1 — 8 claims)

**Ingredient and material pricing. Quick if you source peanuts.**

| # | Statement | Mark | Notes |
|---|---|---|---|
| 1.1 | Raw peanut wholesale cost: $2.50–3.00/lb | `[ ]` | **Higher-risk.** Wholesale peanut pricing fluctuates. Verify range is current (2024–25). |
| 1.2 | Oil for roasting per batch: ~$0.08 (25 lb batch) | `[ ]` | |
| 1.3 | Salt & seasoning per batch: ~$0.02 | `[ ]` | |
| 1.4 | Fuel (propane roaster) per batch: ~$0.10 | `[ ]` | |
| 1.5 | Bags/cups per unit: ~$0.05 | `[ ]` | |
| 1.6 | Total COGS per 1-oz serving: ~$0.35–0.45 | `[ ]` | **Higher-risk.** This is the foundational figure for all downstream math. If wrong, cascades through break-even, margin, and unit-economics sections. |
| 1.7 | Cost of 200+ servings truckload: $70–90 raw goods + fuel | `[ ]` | |
| 1.8 | In-game stylized COGS: $0.42 per unit | `[ ]` | *(simplification — verify falls within 1.6 range)* |

---

## F. Gross Margin vs. Markup / Pricing (Section 2 — 10 claims)

**Formulas and industry benchmarks. Quick if you know typical food-truck GP%.**

| # | Statement | Mark | Notes |
|---|---|---|---|
| 2.1 | Markup formula: (price – COGS) / COGS | `[ ]` | |
| 2.2 | Markup example: $1.50 – $0.42 = $1.08; markup = 257% | `[ ]` | *(arithmetic: $1.08 / $0.42 = 257% — verify)* |
| 2.3 | Gross margin formula: (price – COGS) / price | `[ ]` | |
| 2.4 | Gross margin example: $1.08 / $1.50 = 72% | `[ ]` | *(arithmetic — verify)* |
| 2.5 | Typical roasted-snack food-truck gross margin: 65–72% | `[ ]` | **Higher-risk.** Industry benchmark claim — verify against real food-truck GP data. |
| 2.6 | Margin at $1.50 / $0.42 COGS: 72% (28¢ profit per unit before overhead) | `[ ]` | *(arithmetic — verify; note: 72% margin = $1.08 contribution, not 28¢)* |
| 2.7 | Margin at $1.00 / $0.42 COGS: 58% margin | `[ ]` | *(arithmetic: ($1.00–$0.42)/$1.00 = 58% — verify)* |
| 2.8 | Wholesale peanuts ~$3/lb, retail ~$6/lb | `[ ]` | |
| 2.9 | Elasticity: raise price to $2.00, units drop 20% | `[ ]` | *(game mechanic / teaching model; mark N/A if no real-world opinion)* |
| 2.10 | Margin thresholds: >60% = healthy, 45–60% = caution, <45% = critical | `[ ]` | **Higher-risk.** Benchmark thresholds — verify against real food-truck operations data. |

---

## G. Break-Even Analysis (Section 8 — 9 claims)

**Math-heavy. Verify fixed-cost totals and per-unit breakpoints.**

| # | Statement | Mark | Notes |
|---|---|---|---|
| 8.1 | Monthly fixed costs — permits: ~$40 | `[ ]` | **Higher-risk.** Divides annual permit costs by 12; verify consistent with Section A figures ($500 upfront). |
| 8.2 | Monthly fixed costs — truck payment: ~$150 | `[ ]` | **Higher-risk.** Monthly truck payment implies ~$5,400 financed truck; verify this is plausible for an entry-level food cart/truck. |
| 8.3 | Monthly fixed costs — fuel baseline: ~$100 | `[ ]` | |
| 8.4 | Monthly fixed costs — insurance: ~$80 | `[ ]` | **Higher-risk.** Commercial food-truck insurance typically $100–300/month; $80 may be low. |
| 8.5 | Total monthly fixed costs: ~$370 | `[ ]` | *(arithmetic: 40+150+100+80 = 370 — verify adds up, and verify nothing major is missing, e.g., commissary fees)* |
| 8.6 | Gross profit per unit: $1.50 – $0.42 = $1.08 | `[ ]` | |
| 8.7 | Break-even units/month: $370 / $1.08 = ~343 units | `[ ]` | *(arithmetic — verify)* |
| 8.8 | Break-even units/day (4-day week): ~17 units/day | `[ ]` | *(arithmetic: 343 / 20 operating days = ~17 — verify)* |
| 8.9 | Below break-even: every sale is a loss; you're subsidizing with reserves | `[ ]` | *(conceptual accuracy — the real statement is contribution margin still positive; fixed costs not covered)* |

---

## H. Unit Economics per Location-Day (Section 9 — 11 claims)

**Worked example — verify line-by-line arithmetic and that the profit figure is honest.**

| # | Statement | Mark | Notes |
|---|---|---|---|
| 9.1 | Market Fair: 120 units sold | `[ ]` | |
| 9.2 | Market Fair: $1.75/unit price | `[ ]` | |
| 9.3 | Market Fair: $210 revenue | `[ ]` | *(arithmetic: 120 × $1.75 = $210 — verify)* |
| 9.4 | Market Fair: $0.42 COGS/unit | `[ ]` | |
| 9.5 | Market Fair: $50.40 total COGS | `[ ]` | *(arithmetic: 120 × $0.42 = $50.40 — verify)* |
| 9.6 | Market Fair: $159.60 gross profit | `[ ]` | *(arithmetic: $210 – $50.40 = $159.60 — verify)* |
| 9.7 | Market Fair: $80 daily permit cost | `[ ]` | |
| 9.8 | Market Fair: $10 fuel/propane | `[ ]` | |
| 9.9 | Market Fair net profit: $69.60 (before monthly overhead allocation) | `[ ]` | *(arithmetic: $159.60 – $80 – $10 = $69.60 — verify)* |
| 9.10 | Market Fair profit after overhead allocation: $20–30/day | `[ ]` | **Higher-risk.** Depends on overhead allocation method; verify $69.60 – ~$40–50 overhead = $20–30 is consistent with Section G totals. |
| 9.11 | Truck payment allocation: $500/month ÷ 22 operating days = ~$23/day | `[ ]` | *(arithmetic: $500/22 = $22.73 — verify; note Section G uses $150/month truck payment, not $500 — flag if inconsistent)* |

---

## I. Marketing & Reputation (Section 6 — 11 claims)

**Mostly qualitative. Quick validation.**

| # | Statement | Mark | Notes |
|---|---|---|---|
| 6.1 | 60–70% of food-truck repeat customers from word-of-mouth/referral | `[ ]` | **Higher-risk.** Specific statistic — flag if you can't corroborate; add "studies vary" caveat if unverifiable. |
| 6.2 | Marketing signage cost: ~$20/month for prints | `[ ]` | |
| 6.3 | +20 satisfaction for well-roasted peanuts at fair price | `[ ]` | *(game mechanic — mark N/A)* |
| 6.4 | –30 satisfaction for burnt peanuts | `[ ]` | *(game mechanic — mark N/A)* |
| 6.5 | Repeat visit threshold: >70 satisfaction = 2–3 visits/week | `[ ]` | *(game mechanic — mark N/A)* |
| 6.6 | Referral rate: high-satisfaction NPC brings friend 5–10% chance per visit | `[ ]` | *(game mechanic — mark N/A)* |
| 6.7 | Word-of-mouth grows daily foot traffic 5–15% over time | `[ ]` | *(game mechanic — mark N/A)* |
| 6.8 | Legume-lecture NPC humor response: +50 satisfaction, high-visibility spread | `[ ]` | *(game mechanic — mark N/A)* |
| 6.9 | Signage upgrade cost: $50–100 banner/truck repaint | `[ ]` | |
| 6.10 | Signage upgrade effect: +10% baseline foot traffic | `[ ]` | *(game mechanic — mark N/A)* |
| 6.11 | Social media (late-game): free 5-min/week posts; +10–20% foot traffic that week | `[ ]` | *(game mechanic — mark N/A; qualitative concept is sound)* |

---

## J. Simple Bookkeeping & Record-Keeping (Section 10 — 5 claims)

**Best-practice validation. Quick.**

| # | Statement | Mark | Notes |
|---|---|---|---|
| 10.1 | Daily cash sheet: cash in + credit cards in = expected bank deposit | `[ ]` | |
| 10.2 | Receipt log: track ingredient purchases, permit renewals | `[ ]` | |
| 10.3 | Sales log: units sold, price, location, customer type | `[ ]` | |
| 10.4 | Many operators use Google Sheet or phone notes | `[ ]` | |
| 10.5 | Record purpose: spot "Nov sales down 30%" or "spending too much on fuel" | `[ ]` | |

---

## K. Curriculum Integrity Rules (Section 11 — 8 claims)

**Simplification philosophy. Flag if rules contradict your experience.**

| # | Statement | Mark | Notes |
|---|---|---|---|
| 11.1 | Permit simplification: real $325–750/yr; game rounds to $500 | `[ ]` | **Higher-risk.** Verify $325–750 range is credible in target region; note upper end may be higher (Sections A show $700–1,400 combined). |
| 11.2 | COGS simplification: real $0.38–0.48; game $0.42 | `[ ]` | |
| 11.3 | No fantasy margins: never invent 90% gross margin | `[ ]` | |
| 11.4 | Failure is survivable: bad decision → 2–4 days to recover | `[ ]` | *(mechanic/pedagogy — mark N/A unless this conflicts with your real-world experience)* |
| 11.5 | Game omits detailed labor costs initially (owner-operated) | `[ ]` | **Higher-risk.** Even owner-operators have opportunity cost; flag if this would teach a blind spot (e.g., "I don't pay myself so labor is free"). |
| 11.6 | Player works 4–5 days/week; can't scale infinitely with one truck | `[ ]` | |
| 11.7 | Prestige increases fixed costs (better truck, new permits in new zones) | `[ ]` | |
| 11.8 | Allergy sensitivity rule: never joke about allergies; joke is botany pedantry only | `[ ]` | *(policy, not a business-accuracy claim — mark N/A)* |

---

## L. Open Questions (7 items — your expert judgment)

Short written responses (2–3 sentences each).

1. **Q1 — Permit realism:** Is the $500 combined permit plausible in your jurisdiction? Should the game vary by difficulty?
2. **Q2 — Seasonality granularity:** Individual events vs. seasonal bands?
3. **Q3 — Debt & credit:** Formal loans / credit cards, or cash-only + emergency loan option?
4. **Q4 — Allergy mechanic depth:** Require periodic food-safety certifications, or is "Health Permit renewal" gate sufficient?
5. **Q5 — Prestige loop:** On NG+, do fixed costs reset (new truck) or carry over?
6. **Q6 — Educator mode:** Locked "curriculum mode" (no prestige, simplified permits) for classroom use?
7. **Q7 — Narrative depth:** Legume-lecture NPC as story arc or recurring gag?

---

## Summary & Submission

After completing all sections:

1. Export this file (markdown, PDF, or Google Sheet extract — whatever is easiest).
2. Mark every verdict; answer the 7 open questions.
3. Submit to: **[Owner contact — provided by project owner]**

**Routing:**
- `[WRONG]` findings → block P1 exit; owner resolves before ship.
- `[MISL]` findings → owner updates docs/BUSINESS_CURRICULUM.md.
- `[+CAV]` findings → tooltip/disclaimer edits (e.g., "varies by jurisdiction").
- `[OK]` findings → no action; logged as confirmed.

*Prepared: 2026-06-08 | Source: docs/SME_REVIEW_PACK.md (93 claims, 7 open questions) | Reviewer completion target: 2–4 hrs*
