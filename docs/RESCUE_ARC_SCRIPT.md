# Save the Truck — Rescue Arc Script (P2 Dialogue)

> **Trigger condition:** End-of-day cash < $25 (or cash + pending sales < $25 with no imminent income).
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

**Old Joe:** "First thing: I got some money saved. Not much these days, but enough for a truck keeper to get through a rough patch. I'll loan you five hundred dollars. You pay it back—with five percent interest added on, charged once a season. That's straight, fair, and way better than what you'll find elsewhere."

**Player asks (auto-prompt):** "How much is five percent, exactly?"

**Old Joe:** "On five hundred, that's twenty-five dollars a season. You owe me five-twenty-five at the end of the season. Not every day, not every week. Once a season. I'm not gonna break your knees. I just wanna see you take the business seriously enough to repay."

*(He slides a small paper note across the counter.)*

**Old Joe's Loan Agreement (In-Game Pop-Up):**
```
OLD JOE'S EMERGENCY LOAN
Principal: $500
Interest: 5% per in-game season
Repayment: $525 due at the end of Season [X]
No penalties for early repayment
No weekly reminders or nagging
```

**Player decision:** Accept or Decline.

---

### Path 1 Teaching Beat (Design Note)

**What the player should learn:**
- A loan has clear terms: you know exactly how much you owe and when.
- 5% annual (stylized as per-season) is a *reasonable, fair* rate for a small local loan.
- The mentor trusts you and believes you can repay; that's earned respect, not charity.
- Debt is solvable and transparent; shame comes from *not reading the terms*, not from needing help.

**Mechanics upon acceptance:**
- Cash: +$500 immediate (appears in ledger as "Old Joe Loan").
- Event log: "Old Joe loaned you $500 at 5% per season."
- A calendar reminder appears ~2 weeks before the season ends: "Old Joe's loan of $525 comes due in 14 days."
- Player can pay anytime; early repayment removes the debt early (no hidden penalties).
- If the player *doesn't* repay by the season end:
  - Old Joe still doesn't get angry (he's not a villain).
  - Old Joe's relationship drops slightly (–5 points, from ~50 to ~45).
  - A new dialogue option appears: "Old Joe, I need more time." → Old Joe extends the deadline to the next season (+5% more interest), reinforcing that communication prevents crisis.

---

## Path 2: Marta's Supplier Credit (Net-Terms + Relationship Lesson)

**Opening dialogue:**

**Old Joe:** "Second idea: Marta's been buying from you since the start, yeah? I ran into her at the market, and she asked me to tell you—if you need it—she's got a contact at the peanut distributor. They'll let you order now, pay later. Fifteen days net."

**Player asks (auto-prompt):** "What's 'net-15'?"

**Old Joe:** "You get the peanuts tomorrow. The bill comes due in fifteen days. Means you got two weeks to sell enough to cover what you just bought. It's legal credit, and it's how real food-truck people keep going when cash is tight. Marta's vouching for you, though. That's... that matters."

**Marta's Option Appears (New UI Card):**
```
SUPPLIER NET-15 CREDIT (via Marta's Referral)
You can now place orders with [Supplier Name] on a 15-day payment schedule.
Meantime: Buy $300 worth of peanuts now, pay in 15 days.
Your cash stays intact. You sell and profit. Then you pay.

Marta's note: "You're good people. Make this count."
```

**Player decision:** Use the credit or Decline.

---

### Path 2 Teaching Beat (Design Note)

**What the player should learn:**
- Supplier credit is a real financial tool that bridges cash-flow gaps.
- It requires trust: Marta's referral means the supplier believes you'll repay.
- Relationship = economic leverage; friendships aren't just emotional, they're structural.
- The 15-day window teaches: you have a runway to turn inventory into profit before paying.
- Risk: if sales are slow, you face a bill with no cash to cover it—teaches forward-planning.

**Mechanics upon acceptance:**
- Cash: stays the same (you don't get cash, you get inventory).
- Inventory: +$300 worth of raw peanuts added (bulk order discount applied).
- Calendar: a red due-date appears 15 days out: "$300 payment due to supplier."
- If player has $300 by day 15: can pay in full, debt cleared.
- If player has < $300 by day 15:
  - Supplier doesn't repossess inventory or get hostile.
  - A dialogue option unlocks: "Can I extend?" → Marta steps in again (if her relationship > 60): "I'll talk to them. You've got another week. But next time, plan ahead."
  - Interest does *not* accrue (real small-business suppliers rarely penalize loyal customers with compound interest; they want to keep the relationship).
- Marta's friendship gains +10 points (she vouched for you and followed through).

---

## Path 3: Derek's B2B Pre-Order (Cash-Up-Front, Commitment Lesson)

**Opening dialogue:**

**Old Joe:** "Third idea: Derek's been a regular at the office park, right? I ran into him, and he mentioned—off the record—that his office building's got a break room committee. They order snacks for the office. He said if you offered a bulk deal, they'd maybe commit to a weekly order."

**Player asks (auto-prompt):** "How does that help me now?"

**Old Joe:** "You offer Derek's office a hundred pounds of roasted peanuts at, say, a dollar-ten a unit. They pay upfront. That's eleven hundred dollars walking into your till today. You've got the cash to buy the raw peanuts, roast them next few days, and deliver by Friday. They get a good price. You get runway. Win-win, if you can execute it."

**Derek's Pre-Order Option Appears (New UI Card):**
```
OFFICE BUILDING BULK ORDER (via Derek)
Derek's office building: 100 lbs roasted peanuts, assorted flavors
Customer price: $1.10/unit (lower than retail $1.50, but bulk)
Payment: $1,100 upfront, balance due upon delivery (next 5 days)
Delivery commitment: Friday, 5 pm to the office break room

Your upside: $1,100 cash now. Raw COGS: ~$350. Profit: ~$750 after roasting costs.
Your risk: you must roast and deliver on time, or Derek's office loses trust.
```

**Player decision:** Accept or Decline.

---

### Path 3 Teaching Beat (Design Note)

**What the player should learn:**
- B2B (business-to-business) sales are different from retail: bulk, committed, on a schedule.
- Upfront cash is a huge advantage; the customer believes in you enough to pay before they get the goods.
- Profit margin is lower on a per-unit basis ($1.10 vs. $1.50 retail), but volume and guaranteed cash make it worthwhile.
- Execution risk: you must deliver. Failing hurts your reputation harder than a single retail customer cancellation.
- This is how food-truck businesses scale: lock in institutional buyers who give you consistent, predictable revenue.

**Mechanics upon acceptance:**
- Cash: +$1,100 immediate (appears as "Derek's Office Pre-Order Payment").
- Quest unlocks: "Fulfill Derek's Office Order" (5-day timer).
  - Player must roast 100 lbs of peanuts in the next 5 days.
  - Suggested mix: 40 lbs Classic Salted, 30 lbs Honey Cinnamon, 20 lbs Hot Spiced (variety for office break room).
  - COGS calculator shows: you'll spend ~$350 raw + $50 propane/fuel, leaving ~$750 profit if you execute cleanly.
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

OFFER: Borrow $500. Repay in 2 weeks.
FEE: $75 "service charge"
TOTAL OWED: $575 in 14 days

APR (Annual Percentage Rate): ~435%

[Fine print: If you can't pay in 2 weeks, you can "roll over" the loan for another $75 fee. This trap locks people in cycles.]

TERMS NOBODY READS:
- Late fees: $25 per day
- Default after 30 days: debt goes to collector, your credit tanks
- Rollover fees compound: borrow $500, owe $1,000+ by month 2 if you can't pay
═══════════════════════════════════════════════════
```

**Old Joe's Teaching:**

**Old Joe:** "Here's the trap: the $75 fee sounds small. But if you borrow $500, the true cost is $75 for two weeks. That's *not* 5%, like my deal. That's $75 on $500 for two weeks, which works out to... *(the game shows a calculation)* ...a four-hundred-and-thirty-five percent annual rate."

*(He lets that number sit.)*

**Old Joe:** "Means if you borrowed that $500 for a whole year at that rate, you'd owe the bank two thousand dollars. You'd go bankrupt. And here's the sick part: they know you can't pay in two weeks. They *want* you to roll over, pay another $75, and restart the clock. They're making money off your desperation."

**Player dialogue option auto-prompted:**
- A) "So... don't use this?"
- B) "That seems illegal."
- C) *(stay silent, Old Joe continues)*

**Old Joe:** *(nods, no matter the choice)* "It's legal in most places, but it's designed to keep poor people poor. It's the opposite of building a business. You're not solving a cash problem; you're renting debt."

*(He tears up the flyer slowly and drops it in the trash.)*

**Old Joe:** "If you ever get desperate enough to consider this, come to me first. I'm not a bank. I'm your mentor. And I want you to succeed, not drown."

---

### Path 4 Teaching Beat (Design Note)

**What the player should learn:**
- Predatory lending is real and targets small business owners in cash crisis.
- APR (Annual Percentage Rate) is the honest measure of a loan's true cost; fees disguise the real rate.
- Rollover traps are deliberate: the lender profits from your inability to repay.
- There *are* ethical alternatives (Old Joe's loan, supplier credit, B2B pre-orders); they're slower but they don't destroy you.
- Taking on bad debt for short-term relief is the classic failure mode of small businesses.

**Mechanics:**
- This option is **not selectable**. The player sees the flyer and Old Joe's warning, but there is no "Choose QuickNut Capital" button.
- However, the game does **not hide the flyer** or pretend it doesn't exist. The warning is diegetic: Old Joe shows it, explains the math, and teaches why it's bad. This is real-world education, not moralizing.
- If a player tries to look for QuickNut Capital in a later playthru, they don't find it in-game (it's not an unlockable path), reinforcing that it was a warning, not a genuine option.
- The math is correct and explainable: if a player opens the flyer UI and clicks "How is this calculated?" they get a transparent breakdown of APR vs. simple interest.

---

## Resolution & Re-Entry Rules

**After the player chooses a path (1, 2, or 3):**

Old Joe nods, stands, and walks toward the door.

**Old Joe:** "Alright. You've got what you need to get through this week. But listen—don't let this be a surprise next time. Cash flow crises sneak up, but they're predictable if you're watching. Plan ahead. Keep a buffer. And if you're ever stuck again, you know where to find me."

**Truck re-opens the next in-game day.**

---

### Re-Entry: Arc Repeats If Triggered Again

If the player's cash drops below $25 again (same trigger):

- **Old Joe shows up again**, but the dialogue varies:
  - If the player repaid their first loan: "I see you're in it again. That's part of the game. Let's talk about what changed."
  - If the player didn't repay: "Kid, I gave you a shot. What happened? Let's figure this out." *(Shorter path, more direct, less patience, but still helpful.)*
  - If the player took Marta's supplier credit and it worked: "Good moves last time. But something's still off. Let's fix it."

- **Path options change slightly:**
  - Old Joe's second loan offer: increased interest (7% instead of 5%, teaching: repeated borrowing is riskier).
  - Marta's credit: available again, but Marta adds a note: "I vouched for you. Don't make me regret it." (Relationship pressure, not game-over, but real.)
  - Derek's pre-order: Derek himself appears. "Look, I'm willing to help, but only if we up the size of the order and you prove you can scale. Five hundred pounds, same price, same timeline." (Harder challenge, but bigger cash infusion: $5,500.)

- **Never shaming, never hard-locking.** The arc repeats as many times as needed. The game assumes the player is learning, not failing.

---

## Tone Notes for Dialogue Writing

1. **Old Joe's voice:** Warm, gruff, a little world-weary. He's seen businesses rise and fall. He doesn't lecture; he explains by analogy. Example: "You know what a roaster that's too small does? It works twice as hard for half the output. That's you right now, running lean."

2. **No judgment of the player.** Cash crunches are *normal* in food service. The game never makes the player feel stupid or reckless. Old Joe treats it as a teaching moment, not a failure.

3. **Diegetic economics.** Old Joe's loan terms, Marta's referral, Derek's bulk order—all are framed as *real business relationships*, not game mechanics. The player isn't "choosing a difficulty setting"; they're choosing a business partnership.

4. **Explicit numbers.** Every term is stated clearly. No hidden rates, no ambiguous due dates. This models good business communication and teaches the player to read contracts.

---

**Final line count: ~160 lines (including all dialogue, mechanics notes, teaching beats).**

**Canon lock:** This arc is non-optional if triggered, non-punishing if repeated, and family-friendly. It teaches real finance, never shames the player, and positions mentorship (Old Joe) and relationships (Marta, Derek) as the path out of crisis.
