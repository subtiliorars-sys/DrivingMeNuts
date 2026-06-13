# 👋 START HERE — Driving Me Nuts

You don't need to remember any commands. There are exactly **two** things you might
want to do. Pick one.

---

## ▶️ 1. Just play the game

In a terminal, in this folder, type:

```
npm start
```

That's it — it builds and **opens the game in your browser** automatically.
(First time only, run `npm install` once.)

To stop it: press `Ctrl + C` in that terminal.

> **Want bigger text?** Use your browser's zoom: **Ctrl +** / **Ctrl −**
> (**⌘ +** / **⌘ −** on a Mac). The game scales cleanly.

---

## 🛠️ 2. Keep building it (with Claude)

You don't run build commands — **just talk to Claude.** Open Claude Code in this
folder and say something like:

> **"Let's continue the peanut game."**  (or just **"resume DrivingMeNuts"**)

Claude reads its own notes and picks up exactly where we left off — it knows the
current version, what's done, and what's next. It runs all the build/test commands
for you.

**Where we left off (so you don't have to remember):**
- The game is at **v0.9.2** — fully playable, lots of features, everything saved.
- **Next planned step:** get ready for the **P1 exit** review — walk the accountant
  through the business-accuracy checklist and send the allergy reviewer brief.

### P1 exit review packs (start here)

| Pack | File | Who |
|------|------|-----|
| **Business accuracy (93 claims)** | [`docs/SME_REVIEW_CHECKLIST.md`](docs/SME_REVIEW_CHECKLIST.md) | Accountant / small-business SME (2–4 hrs) |
| **Full claim context** | [`docs/SME_REVIEW_PACK.md`](docs/SME_REVIEW_PACK.md) | Same reviewer — reference behind the checklist |
| **Allergy mechanic review** | [`docs/ALLERGY_REVIEWER_BRIEF.md`](docs/ALLERGY_REVIEWER_BRIEF.md) | Owner-sourced allergy-aware reviewer (30–60 min) |

Any `[WRONG]` on the SME checklist or a failed allergy review **blocks P1 exit**
(see `docs/RISK_REGISTER.md` A1 / A2). These are owner-gated — automation prepares
the packs; you schedule the humans.

That's all in Claude's memory; you just have to ask it to continue.

---

## 🤔 If something looks broken

Tell Claude: **"run the checks"** — it runs `npm run verify` (the full test +
build gate) and tells you in plain English if anything's wrong.

---

*Everything else — the design docs, the roadmap, the technical notes — lives in
the `docs/` folder, but you don't need any of it to start. Just `npm start` to
play, or ask Claude to continue.*
