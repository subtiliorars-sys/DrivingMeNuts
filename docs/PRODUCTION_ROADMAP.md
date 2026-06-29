# Production Roadmap — Driving Me Nuts → Steam

**Purpose:** the end-to-end plan from "great prototype" to "live on Steam,"
broken into milestones that each end in a **playable, verified build**. This is
the campaign view; `docs/STEAM_RELEASE.md` is the launch runbook.

**Working method:** build → verify (`npm run verify` must stay green) → desktop
smoke → owner spot-check → next milestone. Nothing merges to `main` without a
green gate; every milestone is independently shippable.

---

## North star & v1.0 scope freeze (proposed)

"Better than a big studio could produce *for this concept*" = a cozy, charming,
deeply-polished vertical slice that **nails one thing completely** rather than
sprawling. The launch cut (matches `docs/CONCEPT.md` scope guard):

- **4 districts** live (Farmers' Market, Office Quarter, Boardwalk, University).
- **6 named NPCs** with dialogue, relationships, and the legume-gag arc as a
  real character spine (Old Joe, Marta, Derek, Sal, Maya, Dr. Chen).
- **Core loops complete**: supply → roast → price → sell → upgrade → end-of-day
  → offline, plus weather, permits, rescue arc, prestige.
- **3-act campaign** with the festival, the Sal rivalry, the Dr. Chen review,
  and the corporate-kiosk finale → franchise prestige.
- **Full procedural art + audio pass** (no programmer-art rectangles remain).
- **Desktop Windows build** (done), controller-friendly, accessibility pass.

Cut-list (post-launch): the 3 surplus districts, gamepad-only refinements,
localization, Steam Cloud. *Owner: approve or adjust this freeze.*

---

## Milestones

| # | Milestone | Key deliverables | Exit criteria |
|---|-----------|------------------|---------------|
| **M0** | Shippable shell *(✅ done)* | Electron desktop build, procedural music, keyboard controls, save hardening | Desktop app launches + renders; verify green |
| **M1** | Pipelines *(✅ done)* | Code-as-art-tool sprite generator; Windows-build CI; this roadmap | Real sprites generated; CI workflow in place |
| **M2** | Art pass *(🚧 in progress)* | Sprites wired into game (coin/star/mascot/truck ✅) + 6 NPC portraits ✅; remaining: backdrops, truck tiers, animation frames per `docs/P1_SPRITE_SPEC.md` | Every scene uses real art; no rectangles |
| **M3** | RPG layer *(🚧 in progress)* | NPC relationships + Regulars dialogue panel ✅ (M3.1); friendship grows from gameplay ✅ (M3.2); remaining: gag-bubbles↔named cast, quest framework | NPCs talkable; gag arc playable end-to-end |
| **M4** | Districts | 4 launch districts live (traffic curves, permits, flavor bias, deco) | All 4 playable + balanced |
| **M5** | Campaign | 3-act milestones, festival event, Sal rivalry, Dr. Chen review, corporate finale, franchise prestige polish | Full run from intro to prestige |
| **M6** | Feel & a11y | Game-feel juice, transitions, onboarding, audio polish, full accessibility pass | Cozy + readable; a11y checklist green |
| **M7** | Balance | Automated playtest harness (extends the QA bridge); difficulty curve; economy soak | 1000-session sim green; tuned curve |
| **M8** | Store-ready | Procedural capsule art, trailer storyboard + capture, store copy, ratings answers, depot/VDF scripts | Store page assets complete |
| **M9** | Release candidate | Steam upload, Steam Deck/controller pass, final QA, owner sign-off | Build on Steam `default` branch |

I can start **M2 immediately** and drive M2–M8 with no input from you except
per-milestone spot-checks. M9 needs the Steam account.

---

## Integration notes (live)

- **All campaign work lives on PR #43** (`claude/game-concept-production-6eiqog`),
  shipped as verified slices: M0 → M1 → M2 (sprites + portraits) → M3.1
  (relationships + dialogue) → M3.2 (gameplay-driven friendship).
- **PR #43 was auto-closed once** by the Fleet janitor as a supposed "duplicate
  cursor/* draft" — a misclassification (this is a `claude/*` production branch,
  not a cursor draft). Reopened; work was never at risk (all commits on the
  remote branch). If it re-closes, the branch still holds everything.
- **Merge-forward DONE.** `main` (`af0c4c3`) was merged into this branch and all
  conflicts resolved — the PR is now conflict-free / mergeable (was `dirty`).
  Reconciliations:
  - SimState gained `martaBuffActive` / `salRivalPresent` (main's NPC buff/penalty
    feature) **alongside** this branch's `npcRelationships` — both coexist in
    createState + persistence.
  - **Keyboard layer unified:** kept this branch's clean `setupKeyboard()`
    structure but adopted main's key letters + on-screen hint + mobile dock +
    `feedbackOverlayOpen` guard. Final map: B books · S supply · U upgrades ·
    G glossary · O goals · D routes · C regulars · P settings · R roast ·
    N sound · J music · Esc back · Enter end-day.
  - Picked up main's VT323 font, playtest feedback overlay, and zones shell.
- **Upstream test consolidation (heads-up, not an action item):** main collapsed
  several granular `wave*/reentry/integration` suites into fewer cases in its 18
  commits, so the post-merge unit count (333) is *lower* than this branch had in
  isolation (439). That's main's own refactor — every test this branch ADDED
  (relationships ×18, music ×6, save-corruption guards) is intact, no test files
  were dropped, and the full gate is green.
- **PR #113** (`work/ideation-sweep`) remains open separately; its keyboard/Books
  work is now superseded by this branch's unified layer where they overlapped.

---

## What I need from you (the only true gates)

1. **Approve the v1.0 scope freeze** above (or tell me the cut you want). One reply.
2. **Art direction:** ship the **code-generated pixel art** (recommended — proven
   this PR, zero cost, fully ours) *or* commission/license art (then drop assets
   in `assets/` and I'll wire them). Default if silent: code-generated.
3. **Steam business setup** (irreducibly human/financial): a Steamworks account,
   the **$100 Steam Direct fee**, and the legal identity/tax/bank info Valve
   requires. I'll pre-build *everything else* (depot config, App ID wiring,
   store copy, assets, ratings answers) so your part is minutes of form-filling.
4. **~10-minute spot-check per milestone** to judge "fun/charm" — the one thing
   I can measure around but shouldn't self-certify.

Optional accelerators: a **code-signing certificate** (for signed direct
downloads — Steam doesn't require it); enabling the **tester pool** (the repo
already has playtest intake forms).

---

## Limitations — and how they're being lifted

The "structural" blockers turned out to be mostly environmental:

| Claimed limitation | Reality | How it's lifted |
|--------------------|---------|-----------------|
| Can't make real art without a tool | **Lifted** | Code *is* the art tool — `tools/art/build-assets.cjs` generates real outlined, shaded pixel-art sprites. Scales to the full inventory. |
| Can't build Windows binaries from Linux | **Lifted** | `desktop-build.yml` packs on GitHub's `windows-latest` runner — no local Windows needed. |
| Can't render/preview the game headless | **Lifted** | Headless Electron + xvfb renders the real WebGL game and captures screenshots (proven in PR #43). The same path can auto-capture store screenshots and visual-regression frames. |
| Can't judge "is it fun" | **Mitigated** | Automated balance/soak harness + your fast spot-checks + the tester pool. Taste stays human; everything measurable is automated. |
| Steam account / Direct fee / legal identity | **Irreducible** | Genuinely yours — money + legal identity. I reduce it to the minimum clicks by pre-staging all technical + creative artifacts. |

**Bottom line:** with the scope freeze + "code-generated art" approved, I can
build the entire software-and-content game across M2–M8 autonomously, each
milestone a verified playable build. Only the Steam business setup (M9) needs
you — and I'll have everything else waiting so it's a short session.
