# Bookkeeping — Ledger v1, Balance Sheet & Weekly Recap (HQ-only)

> Spec + as-built notes for the P1 bookkeeping surface, and the seed design for
> the P2 dual-ledger system referenced in GDD F. Companion to PERSISTENCE.md
> (schema v4) and BUSINESS_CURRICULUM.md (the real-world accounting reference).

## 1. Why this exists (teaching goal)

The single most common small-business bookkeeping confusion is **profit ≠ cash**.
P1's ledger surfaces it mechanically:

- **Net** on the report card and ledger is *P&L profit*: `(revenue − COGS) − fixed + offline`.
- **Debt payments** (`debtService`) are *cash out* but **not an expense** — they
  reduce cash and liabilities, never net. The report card and Books panel show
  them side-by-side with that exact caption.
- The **balance sheet** closes the loop: `assets = liabilities + equity`, with
  inventory at cost and Derek's preorder cash as **deferred revenue** (you owe
  goods, so cash received isn't earned yet).

Simplification ledger (A2 "simplified but never wrong"):
- Loan **interest** is also technically a P&L expense; v1 books the whole
  repayment as debt service for clarity. The split (principal vs interest
  expense) is the headline upgrade for the P2 dual-ledger. Flagged, not wrong:
  the curriculum can call this out explicitly.
- Inventory valuation is weighted-average actual cost. Raw stock carries
  `rawCostBasisPerLb` = the price actually paid (bulk + supplier discounts lower
  it); that basis flows into the roasted cost basis at roast, so a discount is
  realized as **lower COGS / higher margin at sale**, never as equity created at
  purchase (RT6-1). Buying inventory is equity-neutral (cash down = inventory up).
- No depreciation; roaster/slot purchases are expensed implicitly via cash.
  P2 dual-ledger candidate: capitalize upgrades + simple straight-line.

## 2. As-built (P1, schema v4)

| Piece | Where | Notes |
|---|---|---|
| `LedgerEntry` | `src/sim/types.ts` | day, revenue, cogs, fixedCosts, offlineEarned, net, debtService, cashAfter |
| Append + ring cap | `engine.ts endOfDay()` | capped at `LEDGER_MAX_DAYS` (30) in `economy.ts` |
| `balanceSheet(state)` | `engine.ts` | pure snapshot, never stored; deferred revenue amortizes by lbs delivered |
| Weekly recap | `engine.ts endOfDay()` | every `WEEK_RECAP_EVERY_DAYS` (7); factual totals only — no streak framing (DARK_PATTERN_GATE A.1/A.4) |
| Books panel | `GameScene.openBooksModal()` | balance sheet + last-7-day table + profit≠cash footnote |
| Report card | `GameScene.showDayReport()` | debt-service row ("cash, not expense") + week-recap block |
| Persistence | `persistence.ts` schema v4 | migration v3→v4: empty ledger (honest — past days weren't recorded), derived comebackTier, defaults |

`netHistory` (sparkline) is kept separate from the ledger on purpose: it predates
the ledger and the sparkline consumes it directly. Consolidating the sparkline
onto `ledger` is a P2 cleanup candidate (behavior-preserving refactor).

## 3. Weekly recap rules

- Attaches to the DayReport when `endedDay % 7 === 0`; week N = days 7N−6 … 7N.
- Only that week's ledger rows count (migrated saves mid-week recap fewer days,
  honestly labeled `daysIncluded`).
- Copy is totals + best day + margin. **Blacklisted:** "don't break the streak",
  countdowns, comparisons to other players.

## 4. P2 dual-ledger seed (design, not built)

The GDD F note ("$200+ bills due" refinement deferred until dual-ledger +
calendar) lands here when P2 opens:

1. **Two books:** cash ledger (every cash movement, including debt principal)
   vs P&L ledger (revenue/expense recognition). The v1 single table already
   teaches the difference; P2 makes each its own tab.
2. **Interest split:** rescue-debt repayments split principal (cash ledger
   only) vs fee/interest (both ledgers). The teaching beat: "the fee was the
   expense; the principal was never income."
3. **Accounts payable calendar:** bills with due dates (permit renewals,
   supplier net-14) → enables the deferred "$200+ bills due" rescue trigger.
4. **Capitalization:** roaster/slot purchases become assets with simple
   depreciation, completing the balance-sheet story.

Owner-gated inputs before P2 build: SME review of the accounting model
(A2 — accountant should sanity-check the interest-split and deferred-revenue
framings) — fold into the existing 93-claim SME pack walk.
