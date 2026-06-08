# Allergy Reviewer Brief — Driving Me Nuts
## Food-Allergy-Aware Mechanic Review (P1 Exit Gate — Risk A1 / A1-sub)

**For:** External reviewer with food-allergy community or clinical/safety background  
**Purpose:** Evaluate the game's allergy-related mechanics and content for accuracy,
tone, and real-world safety modeling. This is not a bug report or a game-design review.  
**Time estimate:** 30–60 minutes. You do not need to play the whole game.

---

## What You Are Evaluating

The game is a pixel-art food-truck simulation about a **roasted peanut truck**. It is
built around a running joke (customers pedantically point out that peanuts are legumes,
not nuts), but the allergy angle is treated with complete seriousness. You are reviewing
four specific elements:

### 1. Honest-Labeling Mechanic
When an allergic customer NPC approaches the truck, the owner does not attempt a sale.
The owner's response is to be **upfront that nothing on the truck is safe for someone
with a peanut allergy** — everything shares equipment and the same roasting environment.
This is the honest-labeling model: accurate information, stated plainly, not softened
into a false reassurance.

You are checking whether this framing is accurate and whether the stated reason
("everything contacts peanuts; I can't make anything peanut-free here") is the correct
public-health model for a shared-equipment food operation.

### 2. Warm-Referral Mechanic
After stating the honest label, the owner **warmly refers the customer to a nearby
allergen-free cart**. This earns the truck a small reputation boost — the game explicitly
teaches that honest handling of an allergy situation builds trust rather than costing it.

You are checking whether the warm-referral model is appropriate: does it correctly
frame what a responsible vendor should do? Is pointing someone to a nearby vendor
the right real-world recommendation, or does it need caveats (e.g., the referral
vendor would also need to be verified safe)?

### 3. Cross-Contamination Framing
The glossary entry for "Peanut Allergy" states:

> *"Peanut allergies can be life-threatening, and even tiny amounts or cross-contact
> can cause a severe reaction. A truck that roasts peanuts cannot make anything truly
> peanut-free — everything shares the same equipment and air."*

You are checking whether this framing is medically accurate, appropriately serious,
and complete. Key questions: does "same equipment and air" correctly capture
cross-contamination risk for an open-air roasting operation? Is anything
material missing?

### 4. Glossary Entry for "Peanut Allergy"
The in-game glossary entry (shown to players who tap/click the term) reads:

> **Definition:** "Peanut allergies can be life-threatening, and even tiny amounts or
> cross-contact can cause a severe reaction. A truck that roasts peanuts cannot make
> anything truly peanut-free — everything shares the same equipment and air. The
> honest, respectful thing is to say so plainly and point allergic customers to a safe
> option nearby. Being upfront builds trust; it is never something to joke about."
>
> **In-game note:** "The truck's model is honest labeling + a warm referral to a nearby
> allergen-free cart — never pretending a peanut truck is safe for someone with a
> peanut allergy."

You are checking whether this entry is accurate, complete, appropriately serious,
and free of any language that trivializes or dismisses allergy risk.

---

## What "Passing" Looks Like

The review passes when all of the following are true:

- **Accurate:** The medical/safety claims are correct (severity, cross-contact
  mechanism, "can't make it safe" conclusion for shared equipment).
- **Not alarmist:** The tone is serious and matter-of-fact — it does not dramatize
  allergy risk beyond what is medically warranted, which would itself distort learning.
- **Warm but not cavalier:** The referral mechanic is genuinely helpful and
  respectful — not perfunctory, not dismissive, but also not falsely reassuring.
  The model is "I care about your safety; here is accurate information and a helpful
  next step," not "oh well, not my problem."
- **No false safety implication:** Nowhere does the game suggest or imply that
  anything from a peanut-roasting truck is safe for an allergic person.
- **No allergy jokes:** Zero instances of the allergy angle being played for humor.
  (The legume-pedantry joke — "peanuts aren't nuts, they're legumes" — is completely
  separate and never intersects with allergy content.)

---

## Specific Things to Check

1. **Cross-contamination language accuracy.** Does "same equipment and air" correctly
   describe the cross-contamination pathway for an open-air peanut-roasting cart? Is
   "cross-contact" (the preferred clinical term) used correctly, or does the text
   use "cross-contamination" in a way that could confuse the distinction? (Both terms
   appear in the glossary; verify the usage is accurate for each.)

2. **"Warm referral" model validity.** The game rewards the player for referring an
   allergic customer to a "nearby allergen-free cart." In practice, a referred vendor
   would need to be independently verified as allergen-safe — a referral to an unknown
   vendor is not automatically safe. Does the game need to teach this nuance, or is
   the simplified "refer to a safe option nearby" framing acceptable at this level?

3. **No false-safe implication anywhere.** The glossary entry, the NPC dialogue, and
   the mechanic framing should all be consistent: nothing from this truck is safe for
   an allergic person. Check that no line of text (including tooltip copy and any NPC
   dialogue you are shown) implies partial safety (e.g., "our dry-roasted nuts have
   less oil" — any such framing would be dangerous).

4. **Tone of the honest-labeling mechanic.** The mechanic is designed to feel like the
   *right* thing to do — it earns trust. Verify that the framing does not accidentally
   make honest disclosure feel like a loss or a punishment (e.g., "you lose a sale, but
   gain reputation"). The correct teaching model is that honest disclosure IS good
   service, not a trade-off.

5. **Completeness of the glossary entry.** Does the entry cover the essential
   information a player should walk away with? Consider: (a) severity and
   anaphylaxis risk, (b) cross-contact mechanism, (c) the "shared equipment =
   not safe" conclusion, (d) the honest-referral model as the right response.
   Flag anything material that is missing or underweighted.

---

## Out of Scope for This Review

- Game mechanics, balance, or economic accuracy (separate SME review covers this).
- Whether the legume-pedantry joke is funny (that is the whole game premise; it is
  never directed at allergic players and never intersects with allergy content).
- UI design, pixel art, or game feel.
- Whether the game should include allergy NPCs at all (owner-decided).

---

## How to Submit Findings

Write a short note (a page or less) covering:

1. **Overall pass / conditional pass / fail** — with the condition if conditional.
2. **Specific issues found** (quote the text; describe the concern; suggest a fix).
3. **Items you checked and found acceptable** (brief list is fine).

Submit to: **[Owner contact — provided by project owner]**

All findings route to the owner; any changes to glossary text, NPC dialogue, or
mechanic framing are owner-approved before ship.

---

*Prepared: 2026-06-08 | Blocks: P1 exit (Risk A1 + A1-sub per docs/RISK_REGISTER.md) | Owner action: source this reviewer and schedule before P1 close-out*
