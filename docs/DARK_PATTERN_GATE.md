# Dark Pattern Gate — Driving Me Nuts

> **Defense against idle-retention drift.** Operationalizes RISK_REGISTER A4 mitigation: "no FOMO timers, no streak punishment, no hard offline-earnings cliff framing as loss, no ads without an explicit Owner Decision."
>
> This is a **binding artifact**. Every new mechanic touching retention or return-frequency triggers re-evaluation against this gate and the P1/P4/P5 exit checklist below. Borderline cases escalate to Owner Decision.

---

## A. Forbidden Dark Patterns (Blacklist)

Each entry: pattern name, definition, why it's banned here, and the TEST a reviewer applies.

### 1. FOMO / Limited-Time Timers
**Definition:** Content, rewards, or discount access that expires in absolute wall-clock time, creating artificial urgency to log in now or miss out.

**Why banned:** Contradicts "respect the player's time" pillar. Creates anxiety, especially in 13+ audience where FOMO-susceptibility is developmental. No educational value.

**Test:** Can a player miss a seasonal event, daily bonus, or time-limited flavor unlock if they don't log in within 24–48 hours? Y = **FAIL**. Exception (see Allowed-with-Care): in-game diegetic roast timers (e.g., "peanuts are roasting") are measured in game-time, not wall-clock.

---

### 2. Streak Punishment / Consequence-for-Absence
**Definition:** Visible meter (login streak, combo counter) that resets or decays when the player does not log in, framing the loss as failure/shame.

**Why banned:** Turns offline time into negative progress. Teaches: taking a break is bad. Directly violates "respect the player's time." High anxiety trigger for vulnerable players.

**Test:** If a player logs in after a 2-day absence, does ANY visible-to-player metric (streak counter, combo meter, daily bonus multiplier) drop or reset? Does the UI frame it as "lost progress" or "broken streak"? Y = **FAIL**.

---

### 3. Decaying Progress / Skill Rot Mechanics
**Definition:** Player's accumulated power, earnings, or stats visibly decline or evaporate during offline time or inactivity, presented as inevitable decay.

**Why banned:** Offline time is punishment, not rest. Teaches: the game punishes you for not playing. Anxiety driver.

**Test:** Do any player-earned stats (profit margin, NPC relationship, truck condition, roaster efficiency) degrade over clock time without explicit player action to prevent it? (Example: "reputation decays 1% per day offline.") Y = **FAIL**. Exception: spoilage is explicitly a resource-management teaching moment, not a punishment for absence.

---

### 4. Pay/Ad Gates on Core Loop
**Definition:** Paywalls, ad-watch requirements, or energy systems that block access to the fundamental game loop (roasting, selling, NPC interaction) unless the player spends real money or watches ads.

**Why banned:** This is a 13+ cozy edu game, not a monetization vehicle. No ads. No premium-currency gatekeeping of core mechanics. Breaks trust with educators and families. Breaks CRIT-1 if it collects data.

**Test:** Can a player complete a full roast cycle, sell to customers, advance an NPC quest, or unlock a new district without spending money or watching an ad? N = **FAIL**. If optional cosmetics require an ad (eg: truck paint), that's optional; if core roasting queue requires 1 ad per batch, that's **FAIL**.

---

### 5. Artificial Wait-to-Play Walls Beyond Diegetic Roast Timers
**Definition:** Paywalls or energy/stamina systems that force the player to wait wall-clock time OR pay to bypass waiting, unless the waiting is framed as in-game roasting or active truck mechanics.

**Why banned:** Idle games need *some* timers (roasting food takes time), but they should be transparent, diegetic (part of the world), and never gated behind pay-to-skip. A stamina bar that refills slowly is a dark pattern; a roast timer that finishes when it finishes is not.

**Test:** Does the game have an "energy" or "stamina" meter that prevents the player from taking actions (other than roasting) until it refills, and refill only happens by waiting or paying? Y = **FAIL**. Does roasting a batch take 10 minutes of wall-clock time, shown as "Honey Cinnamon roasting... 8 min left"? That's allowed if the player can still do other things (check prices, move truck, check NPC status) while waiting.

---

### 6. Notification Nagging / Push-Notification Abuse
**Definition:** Constant, unsolicited notifications (emails, in-app alerts, OS push) designed to pull the player back in, especially with artificial urgency ("Your roast is done! [Sign in NOW]", "You're behind your friend's earnings!").

**Why banned:** Intrusive, anxiety-inducing, breaks player's control over their own time. Also problematic for young players without parental control over device notifications.

**Test:** Does the game send a notification that says or implies "Come back now or you will regret it" (FOMO), "You fell behind," or "Don't miss out"? Y = **FAIL**. A neutral reminder ("Your roast finished") sent once per day max is okay; hourly nags are not.

---

### 7. Social-Pressure Mechanics / Comparison
**Definition:** Leaderboards, public achievement feeds, or social comparison tools that rank players against each other or friends, creating shame/pressure to compete.

**Why banned:** Single-player only. No leaderboards, no public rankings, no "beat your friend" challenges. Social pressure is a powerful FOMO engine. GDD notes leaderboard as a cut-list candidate (G3); that design choice is locked here. No Derek-style "consistency" mechanic that shows "you lost X loyalty to others" framing.

**Test:** Can a player see a ranked list of other players' earnings, franchise count, or achievement progress? Can the player see a public comparison to friends' stats? Y = **FAIL**. NPC-relationship feedback is single-player only ("Derek appreciates consistency") and never comparative ("Derek prefers you over [another player]").

---

### 8. Loss-Framing of Offline Time / Guilt Mechanics
**Definition:** In-game text, UI, or mechanics that describe time spent *not* playing as a loss ("You were gone for 8 hours—you lost $500 in idle earnings").

**Why banned:** Reframes the player's own autonomy (choosing when to play) as failure. Teaches: rest is bad. The cozy-game genre exists to be anti-guilt. Offline time earns *something* (soft-cap), but must be framed as a positive ("truck rested, took $40 while you were away") not as "you left $500 on the table."

**Test:** When the player returns after offline time, does the game message say: (A) "You earned $40 while resting!" or (B) "You lost out on $500 because you didn't log in"? Only (A) is allowed. If any tooltip or NPC dialogue frames offline-earnings cap as "unfortunately limited" or "only half of what you could've had," that's shadow loss-framing and **FAIL**.

---

## B. Allowed with Care (Guardrails Required)

These mechanics have a place in an idle game and teach real concepts, but require explicit guardrails to prevent dark-pattern drift.

### 1. Diegetic Roast Timers
**What it is:** A batch of peanuts takes 10 minutes to roast in-game. The timer is displayed; the player waits.

**Why it's allowed:** It's the core mechanic. It's transparent (no hidden cost, no pay-to-skip gating). It's diegetic (roasting actually takes time in reality). It teaches: time-investment = output.

**Guardrails:**
- Timer is always wall-clock, always visible, never hidden behind a paywall.
- Player can do other things (move truck, check supply, chat with NPCs) while a batch roasts. Not a "frozen game" state.
- No "expedite roasting" premium currency purchase or ad-watch. (The Copper/Industrial roaster tiers provide mechanical speed-up, not pay-to-skip.)
- Text framing: "Honey Cinnamon roasting... 8 min left" not "Premium roast speeds available."

---

### 2. Offline Soft-Cap (Framed as Truck Rest)
**What it is:** When the player closes the game, the truck continues earning at a reduced rate (e.g., 20% of peak on-game rate, capped at $100/min offline). Earnings accrue for up to 24 hours, then stop. (GDD C5 specifies this.)

**Why it's allowed:** It rewards engagement without punishing offline time. It acknowledges that some players want a small "always running" passive income. The soft-cap prevents AFK botting. 24-hour limit teaches: *infinite* passive income is not sustainable.

**Guardrails:**
- Soft-cap is *soft*, not a harsh cliff. If peak on-game rate is $500/min, offline rate is ~$100/min. There's no shame in the reduction; it's presented as "truck at rest works slower."
- Framing: "The truck earned $40 while resting. Stock depleted 5% due to slow spoilage." NOT "You lost $460 by not logging in."
- 24-hour offline cutoff is non-negotiable. After 24 hours offline, *no earnings accrue further*. This prevents true AFK botting and teaches time-value.
- No daily bonus for logging in. (Daily bonus = streak-pressure.) Offline earnings are not tied to a login calendar.
- Return message does NOT show "potential earnings you missed." Only actual earnings are shown.

---

### 3. Prestige Resets (Player-Initiated Only)
**What it is:** At the end of Act III, the player can unlock Franchise mode and voluntarily reset their truck and start over, keeping recipes/lore. Each reset grants a Reputation Multiplier (+2% per franchise). (GDD C6 specifies this.)

**Why it's allowed:** It's a player *choice* to restart, not a forced loop. It teaches: scaling from a base is real. It offers post-story replayability. The multiplier is a reward, not a punishment for not restarting.

**Guardrails:**
- Reset is *optional*, not auto-triggered. Player must select "Start Franchise" in a menu. No nag.
- Text is: "Ready to expand? Start a second truck in a new region?" NOT "Your streak is over. Start a new franchise!"
- Carry-over is transparent: "You keep: all recipes, Legume Lore entries, NPC relationships. You reset: cash, inventory, permits, truck upgrades to 20% of peak." Player knows exactly what they get and what they lose before committing.
- Prestige multiplier applies only to relationship gains and loyalty metrics, never as a "you're falling behind if you don't restart" pressure.
- Hard cap: 3 franchises unlock the "Peanut Royalty" ending. Player can choose to keep playing after 3, but no new prestige reward is shown as pending.

---

## C. P1/P4/P5 Exit Checklist

**Purpose:** A red-team reviewer answers these questions against the actual build before the phase advances. Each question cites a blacklist entry or guardrail. All questions must be "YES" to pass.

**When to run:** P1 exit gate (before code & design are final), P4 exit gate (before launch announcement), P5 exit gate (before close-beta opens to external testers).

### Checklist Questions

1. **FOMO Test:** Can a player miss any content or reward if they don't log in within 24 hours? (Cite: A.1) → **YES** (all content is always available) or **NO** (fail).

2. **Streak Punishment Test:** Are there any visible counters (login streak, combo meter, daily-bonus multiplier) that reset or drop when a player is absent for 24+ hours? (Cite: A.2) → **YES** (none exist) or **NO** (fail).

3. **Decay Test:** Do any player-earned stats (reputation, truck condition, margin, roaster efficiency) automatically degrade during offline time *without* player action to prevent it? (Cite: A.3) → **YES** (none degrade; spoilage is explicit resource management, not punishment) or **NO** (fail).

4. **Pay/Ad Gate on Core Loop:** Can the player complete a full roast, sell to customers, and advance an NPC quest without spending money or watching an ad? (Cite: A.4) → **YES** or **NO** (fail).

5. **Artificial Wait Wall Test:** Is there an energy/stamina meter that blocks non-roasting actions and forces waiting or paying to refill? (Cite: A.5) → **YES** (no such meter exists; roasting timers are transparent) or **NO** (fail).

6. **Notification Nagging Test:** Are notifications absent or minimal (one per session max, neutral tone like "Your roast finished")? Do notifications never say "Come back now" or "Don't miss out"? (Cite: A.6) → **YES** or **NO** (fail).

7. **Social-Pressure Test:** Are there any leaderboards, public rankings, or NPC-comparison mechanics (e.g., "Derek prefers you over another player") in the build? (Cite: A.7) → **YES** (none exist) or **NO** (fail).

8. **Loss-Framing Test:** When a player returns after offline time, does the UI/NPC dialogue frame offline earnings as a positive gain ("Truck earned $40 while resting"), not a loss ("You left $500 on the table")? (Cite: A.8) → **YES** or **NO** (fail).

9. **Offline Soft-Cap Guardrail:** Is the offline-earnings rate 20% of peak or less, capped at $100/min, with a 24-hour cutoff? (Cite: B.2) → **YES** or **NO** (fail).

10. **Prestige Design Test:** If a prestige/franchise reset exists, is it *player-initiated* (menu option, not auto-triggered), and is the carry-over + reset clearly communicated *before* the player commits? (Cite: B.3) → **YES** or **NO** (fail).

11. **Roast Timer Diegetic:** Are roasting timers transparent, wall-clock, and never gated behind paywall or ad-watch? Can the player do other actions while a batch roasts? (Cite: B.1) → **YES** or **NO** (fail).

12. **Diegetic Roaster Upgrade Path:** Is mechanical roasting speed-up provided by equipment tiers (Tin Pan → Copper → Industrial), not by premium currency or ads? (Cite: B.1) → **YES** or **NO** (fail).

---

## D. Escalation Rule

**Any new mechanic that touches retention, return-frequency, or offline earnings must be re-evaluated against this gate.**

1. **Scope:** New feature that includes a timer, reward-for-logging-in, social comparison, or offline-earnings modification.
2. **Action:** Developer or delegated reviewer completes the checklist (section C) against the new mechanic in isolation.
3. **Pass criteria:** All 12 checklist questions answer "YES."
4. **Fail criteria:** Any "NO" answer triggers escalation to Owner Decision. No merge without owner approval.
5. **Owner Decision:** Owner reviews the mechanic, decides one of:
   - **Reject:** Remove the mechanic.
   - **Redesign:** Modify to pass the checklist.
   - **Accept Risk:** Document the conscious acceptance of a dark-pattern trade-off (rare, requires explicit written ratification and a note added to RISK_REGISTER A4 row).

---

## E. Review Discipline

- **Applies to:** Any code touching `game.timers`, `game.playerStats`, `game.offline`, `game.notifications`, `game.prestige`, `game.social`, `game.ui.messages`.
- **Who:** Red-team reviewer or owner, per phase gate.
- **Frequency:** At P1 exit (design & code locked), P4 exit (before public launch), P5 exit (before external testers).
- **Documentation:** Checklist results logged to a comment in the related PR or design doc; if fail, must cite which question(s) and escalate.

---

**Last updated:** 2026-06-06 (operationalized from RISK_REGISTER A4 mitigation).

**Next review:** P1 exit gate (owner ratification of blacklist + checklist application).
