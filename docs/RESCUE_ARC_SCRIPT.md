# Save the Truck — Rescue Arc Script (P2 Dialogue)

> **Trigger condition:** End-of-day cash < $25 (evaluated at END OF DAY only — not on
> mid-day purchases or ticks).
> **Canon:** This arc is **never a game-over**, never shaming, always a teaching moment. Family-friendly. Zero allergy content.
> **Tone:** Old Joe is warm, gruff, zero condescension. The paths offer real choice, each teaching a different recovery strategy.

---

## Scene: The Till Runs Thin

**Location:** Truck parked at home base, evening. Day counter shows a difficult day: foot traffic was low, margins got compressed, or the player made a risky decision.

**Trigger:** Player closes the truck for the day. Cash counter displays: **$12.43** (or any amount < $25).

---

## Old Joe's Entrance (Diegetic)

*Old Joe knocks on the truck window. He's weathered, 70s, wearing a faded peanut-roasting-league cap. Gentle, not intrusive.*

**Old Joe:** "Hey there, kid. Saw the lights on. Mind if I...?" *(opens door without waiting for permission, because he's Old Joe)* "Long day?"

**Player response options:**
- A) "Yeah, it was quiet. I don't know what I did wrong."
- B) "Market was down. But I've got this."
- C) *(stay silent — Old Joe continues unprompted)*

**Old Joe:** *(regardless of choice, he glances at the till)* "Mm. Seen that before. You know how many times I stared at a till like that and thought, 'Tomorrow's different'? Every time, it was. Not because magic—because I had to fix something. And I didn't always have to do it alone."

*(He sits on the bench seat across from the counter, uninvited but not hostile.)*

**Old Joe:** "You got cash-flow problems, and that's not shameful—that's how you learn. Now, before tomorrow gets worse, let's talk about what gets you through the next week. I got three ideas. Maybe one sticks."

---

## Path 1: Old Joe's Fair Loan (5% Per Season)

**Opening dialogue:**

**Old Joe:** "First thing: I got some money saved. Not much these days, but enough for a truck keeper to get through a rough patch. I'll loan you seventy-five dollars — covers a week of your fixed costs and a fresh bag of raw peanuts to restock. You pay it back with five percent interest, charged once a season. That's straight, fair, and way better than what you'll find elsewhere."

**Player asks (auto-prompt):** "How much is five percent, exactly?"

**Old Joe:** "On seventy-five, that's three dollars and seventy-five cents per season — you owe me seventy-eight seventy-five at the end of the season. Not every day, not every week. Once a season. That's about twenty percent a year if you keep the money all year — a fair handshake rate, far cheaper than a credit card and a whole lot cheaper than anything you'll see on a flyer. I just want to see you take the business seriously enough to repay."

*(He slides a small paper note across the counter.)*

**Old Joe's Loan Agreement (In-Game Pop-Up):**
```
OLD JOE'S EMERGENCY LOAN
Principal: $75
Interest: 5% flat per in-game season
         (≈ 20%/yr simple — fair for a handshake loan;
          far cheaper than cards or payday)
Repayment: $78.75 due at the end of Season [X]
No penalties for early repayment
No weekly reminders or nagging
```

**Player decision:** Accept or Decline.

---

### Path 1 Teaching Beat (Design Note)

**What the player should learn:**
- A loan has clear terms: you know exactly how much you owe and when.
- 5% flat per season (≈ 20%/yr simple) is a reasonable, fair rate for a small local loan.
- The mentor trusts you and believes you can repay; that's earned respect, not charity.
- Debt is solvable and transparent; shame comes from *not reading the terms*, not from needing help.

**Mechanics upon acceptance:**
- Cash: +$75 immediate (appears in ledger as "Old Joe Loan").
- Event log: "Old Joe loaned you $75 at 5% per season."
- A calendar reminder appears ~2 weeks before the season ends: "Old Joe's loan of $78.75 comes due in 14 days."
- Player can pay anytime; early repayment removes the debt early (no hidden penalties).
- If the player *doesn't* repay by the season end:
  - Old Joe still doesn't get angry (he's not a villain).
  - Old Joe's relationship drops slightly (–5 points, from ~50 to ~45).
  - A new dialogue option appears: "Old Joe, I need more time." → Old Joe extends the deadline to the next season (+5% more interest), reinforcing that communication prevents crisis.

---

## Path 2: Marta's Supplier Credit (Net-Terms + Relationship Lesson)

**Opening dialogue:**

**Old Joe:** "Second idea: Marta's been buying from you since the start, yeah? I ran into her at the market, and she asked me to tell you—if you need it—she's got a contact at the peanut distributor. They'll let you order now, pay later. Fourteen days net."

**Player asks (auto-prompt):** "What's 'net-14'?"

**Old Joe:** "You get the peanuts tomorrow. The bill comes due in fourteen days. Means you got two weeks to sell enough to cover what you just bought. It's legal credit, and it's how real food-truck people keep going when cash is tight. Marta's vouching for you, though. That's... that matters."

**Marta's Option Appears (New UI Card):**
```
SUPPLIER NET-14 CREDIT (via Marta's Referral)
You can now place orders with [Supplier Name] on a 14-day payment schedule.
Place: $50 raw peanut order now — pay in 14 days.
Your cash stays intact. You sell and profit. Then you pay.

At $0.40/lb raw, $50 buys 125 lbs. Roast and sell at $1.50/lb:
  Revenue potential: ~$187 | COGS: ~$75 (at $0.60/lb roasted) | Gross: ~$112
  More than enough to cover the $50 bill with runway left over.

Marta's note: "You're good people. Make this count."
```

**Player decision:** Use the credit or Decline.

---

### Path 2 Teaching Beat (Design Note)

**What the player should learn:**
- Supplier credit is a real financial tool that bridges cash-flow gaps.
- It requires trust: Marta's referral means the supplier believes you'll repay.
- Relationship = economic leverage; friendships aren't just emotional, they're structural.
- The 14-day window teaches: you have a runway to turn inventory into profit before paying.
- Risk: if sales are slow, you face a bill with no cash to cover it—teaches forward-planning.

**Mechanics upon acceptance:**
- Cash: stays the same (you don't get cash, you get inventory).
- Inventory: +$50 worth of raw peanuts added (125 lbs at $0.40/lb base price).
- Calendar: a red due-date appears 14 days out: "$50 payment due to supplier."
- If player has $50 by day 14: can pay in full, debt cleared.
- If player has < $50 by day 14:
  - Supplier doesn't repossess inventory or get hostile.
  - A dialogue option unlocks: "Can I extend?" → Marta steps in again (if her relationship > 60): "I'll talk to them. You've got another week. But next time, plan ahead."
  - Interest does *not* accrue (real small-business suppliers rarely penalize loyal customers with compound interest; they want to keep the relationship).
- Marta's friendship gains +10 points (she vouched for you and followed through).

---

## Path 3: Derek's B2B Pre-Order (Cash-Up-Front, Commitment Lesson)

**Opening dialogue:**

**Old Joe:** "Third idea: Derek's been a regular at the office park, right? I ran into him, and he mentioned—off the record—that his office building's got a break room committee. They order snacks for the office. He said if you offered a bulk deal, they'd maybe commit to a weekly order."

**Player asks (auto-prompt):** "How does that help me now?"

**Old Joe:** "You offer Derek's office a hundred pounds of roasted peanuts at a dollar-ten a unit. They pay upfront — that's a hundred and ten dollars walking into your till today. You buy the raw peanuts, roast them over the next few days, and deliver by Friday. Your raw cost is forty dollars, roasting adds another ten — so about fifty in COGS. You keep sixty dollars profit if you execute it. They get a good price. You get runway. Win-win, if you can deliver."

**Derek's Pre-Order Option Appears (New UI Card):**
```
OFFICE BUILDING BULK ORDER (via Derek)
Derek's office building: 100 lbs roasted peanuts, assorted flavors
Customer price: $1.10/lb (below retail $1.50 — bulk discount)
Payment: $110 paid in full upfront (delivery risk is yours — they trusted you)
Delivery commitment: Friday, 5 pm to the office break room

Your math:
  Revenue:     $110.00  (100 lbs × $1.10)
  Raw COGS:    – $40.00  (100 lbs × $0.40/lb)
  Roast costs: – $10.00  (fuel + ingredients)
  Gross profit: $60.00
Your risk: you must roast and deliver on time, or Derek's office loses trust.
```

**Player decision:** Accept or Decline.

---

### Path 3 Teaching Beat (Design Note)

**What the player should learn:**
- B2B (business-to-business) sales are different from retail: bulk, committed, on a schedule.
- Upfront cash is a huge advantage; the customer believes in you enough to pay before they get the goods. That trust is your delivery risk.
- Profit margin is lower on a per-unit basis ($1.10 vs. $1.50 retail), but volume and guaranteed cash make it worthwhile.
- Execution risk: you must deliver. Failing hurts your reputation harder than a single retail customer cancellation.
- This is how food-truck businesses scale: lock in institutional buyers who give you consistent, predictable revenue.

**Mechanics upon acceptance:**
- Cash: +$110 immediate (appears as "Derek's Office Pre-Order Payment").
- Quest unlocks: "Fulfill Derek's Office Order" (5-day timer).
  - Player must roast 100 lbs of peanuts in the next 5 days.
  - Suggested mix: 40 lbs Classic Salted, 30 lbs Honey Cinnamon, 20 lbs Hot Spiced (variety for office break room).
  - COGS calculator shows: $40 raw + $10 fuel/ingredients = $50 COGS, leaving $60 gross profit if you execute.
- On Day 5, end-of-day: "Time to deliver to Derek's office?"
  - If player has roasted 100+ lbs: Delivery succeeds. Quest complete. Derek's relationship +15 points. Positive note: "Derek's building loves the peanuts. They want to order again next month."
  - If player has roasted < 100 lbs: Partial delivery. Derek's relationship –10 points (disappointed, but not hostile). Quest fails. Player can still deliver what they have and catch up next week, but the trust is dented.

---

## Path 4: The Cautionary "QuickNut Capital" Flyer (Diegetic Warning, Not an Endorsed Option)

**Scene:** After Old Joe outlines his three options, he pulls a crumpled flyer from his pocket.

**Old Joe:** "One more thing. And I'm showing you this *not* because I want you to take it, but because you *will* see it, and I want you to know what you're looking at."

*(He unfolds a gaudy, neon-orange flyer for "QuickNut Capital — Emergency Business Loans. FAST CASH. Same day approval. Bad credit? NO PROBLEM!")*

**Old Joe:** "This is a payday loan operation. They call it 'emergency lending,' but it's a trap. Lemme show you the math."

**On-Screen Flyer (Readable by Player):**
```
═══════════════════════════════════════════════════
         QUICKNUT CAPITAL - EMERGENCY LOANS
"We Get You Cash FAST. No Questions. Bad Credit OK."
═══════════════════════════════════════════════════

OFFER: Borrow $50. Repay in 2 weeks.
FEE: $7.50 "service charge"
TOTAL OWED: $57.50 in 14 days

APR (Annual Percentage Rate): ~391%
  (How: $7.50 fee on $50 for 14 days = 15% per 14-day period.
   There are 26 such periods in a year. 15% × 26 = 390% simple APR.)

[Fine print: Can't repay in 2 weeks? "Roll over" for another $7.50 fee.
 Two rollovers by month 2: $50 borrowed + 4 fees × $7.50 = $80 owed.
 One full year of rollovers: $7.50 × 26 periods = $195 in fees alone on
 a $50 advance. You'd have paid back 4× what you borrowed in fees.]

TERMS NOBODY READS:
- Late fees: $25 per day
- Default after 30 days: debt goes to collector, your credit tanks
═══════════════════════════════════════════════════
```

**Old Joe's Teaching:**

**Old Joe:** "Here's the trap: the $7.50 fee sounds small on fifty bucks. But $7.50 for two weeks on a $50 advance — that's fifteen percent every fourteen days. *(the game shows a calculation)* Do that math for a whole year — twenty-six of those two-week cycles — and you're paying three hundred ninety-one percent in annual interest."

*(He lets that number sit.)*

**Old Joe:** "They know you can't pay in two weeks. They *want* you to roll over, pay another seven-fifty, and restart the clock. Two rollovers, and by month two you've paid four fees — that's $50 you borrowed, plus $30 in fees, and you still owe the original $50. By the end of a year it's close to two hundred dollars in fees on a fifty-dollar advance. They're making money off your desperation."

**Player dialogue option auto-prompted:**
- A) "So... don't use this?"
- B) "That seems like it should be illegal."
- C) *(stay silent, Old Joe continues)*

**Old Joe:** *(nods, no matter the choice)* "It's legal in many places, but it's designed to keep people in debt. It's the opposite of building a business. You're not solving a cash problem; you're renting debt."

*(He folds up the flyer and drops it in the trash.)*

**Old Joe:** "If you ever get desperate enough to consider this, come to me first. I'm not a bank. I'm your mentor. And I want you to succeed, not drown."

---

### Path 4 Teaching Beat (Design Note)

**What the player should learn:**
- Predatory lending is real and targets small business owners in cash crisis.
- APR (Annual Percentage Rate) is the honest measure of a loan's true cost; fees disguise the real rate.
- Rollover traps are deliberate: the lender profits from your inability to repay.
- There *are* ethical alternatives (Old Joe's loan, supplier credit, B2B pre-orders); they're slower but they don't destroy you.
- Taking on bad debt for short-term relief is the classic failure mode of small businesses.

**QuickNut number chain (all derived from the same fee/term):**
- Advance: $50
- Fee per 14-day period: $7.50
- Fee rate per period: $7.50 / $50 = 15% per period
- Periods per year: 365 / 14 ≈ 26
- Simple APR: 15% × 26 = **~391%**
- Rollover example (2 rollovers = 4 fee payments, 56 days): $50 + 4 × $7.50 = **$80 total owed**
- Year of rollovers (26 periods): 26 × $7.50 = **$195 in fees** on a $50 advance

**Mechanics:**
- This option is **not selectable**. The player sees the flyer and Old Joe's warning, but there is no "Choose QuickNut Capital" button.
- However, the game does **not hide the flyer** or pretend it doesn't exist. The warning is diegetic: Old Joe shows it, explains the math, and teaches why it's bad. This is real-world education, not moralizing.
- If a player tries to look for QuickNut Capital in a later playthrough, they don't find it in-game (it's not an unlockable path), reinforcing that it was a warning, not a genuine option.
- The math is correct and explainable: if a player opens the flyer UI and clicks "How is this calculated?" they get a transparent breakdown of APR vs. simple interest.

---

## Resolution & Re-Entry Rules

**After the player chooses a path (1, 2, or 3):**

Old Joe nods, stands, and walks toward the door.

**Old Joe:** "Alright. You've got what you need to get through this week. But listen—don't let this be a surprise next time. Cash flow crises sneak up, but they're predictable if you're watching. Plan ahead. Keep a buffer. And if you're ever stuck again, you know where to find me."

**Truck re-opens the next in-game day.**

---

### Re-Entry: Arc Repeats If Triggered Again

If the player's end-of-day cash drops below $25 again (same trigger):

- **Old Joe shows up again**, but the dialogue varies:
  - If the player repaid their first loan: "I see you're in it again. That's part of the game. Let's talk about what changed."
  - If the player didn't repay: "Kid, I gave you a shot. What happened? Let's figure this out." *(Shorter path, more direct, less patience, but still helpful.)*
  - If the player took Marta's supplier credit and it worked: "Good moves last time. But something's still off. Let's fix it."

- **Path options change slightly:**
  - Old Joe's second loan offer: increased interest (7% instead of 5%, teaching: repeated borrowing is riskier).
  - Marta's credit: available again, but Marta adds a note: "I vouched for you. Don't make me regret it." (Relationship pressure, not game-over, but real.)
  - Derek's pre-order: Derek himself appears. "Look, I'm willing to help, but only if we up the size of the order and you prove you can scale. Two hundred pounds, same price, same timeline." Cash infusion: $220. (Harder challenge, bigger cash infusion, but within realistic P2 scope — ≤ $250.)

- **Never shaming, never hard-locking.** The arc repeats as many times as needed. The game assumes the player is learning, not failing.

---

## Tone Notes for Dialogue Writing

1. **Old Joe's voice:** Warm, gruff, a little world-weary. He's seen businesses rise and fall. He doesn't lecture; he explains by analogy. Example: "You know what a roaster that's too small does? It works twice as hard for half the output. That's you right now, running lean."

2. **No judgment of the player.** Cash crunches are *normal* in food service. The game never makes the player feel stupid or reckless. Old Joe treats it as a teaching moment, not a failure.

3. **Diegetic economics.** Old Joe's loan terms, Marta's referral, Derek's bulk order—all are framed as *real business relationships*, not game mechanics. The player isn't "choosing a difficulty setting"; they're choosing a business partnership.

4. **Explicit numbers.** Every term is stated clearly. No hidden rates, no ambiguous due dates. This models good business communication and teaches the player to read contracts.

---

**Canon lock:** This arc is non-optional if triggered, non-punishing if repeated, and family-friendly. It teaches real finance, never shames the player, and positions mentorship (Old Joe) and relationships (Marta, Derek) as the path out of crisis.
