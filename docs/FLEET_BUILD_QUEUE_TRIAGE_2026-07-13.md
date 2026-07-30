# Fleet Build Queue Triage — 2026-07-13

**Lane:** `dmn-2b-sprites` (docs-only triage)  
**Kanban:** `drivingmenuts-dmn-2b-sprites-fleet-build-queue-t`  
**Repo posture:** `parked` — `wave_source: FLEET_BUILD_QUEUE` ([`REPO_STATUS.json`](../../shared/AgentCorps/fleet/kanban/REPO_STATUS.json))

---

## Queue sources searched

| Source | Finding |
|--------|---------|
| `FLEET_BUILD_QUEUE` string in repo | **Not present** — fleet queue lives in `REPO_STATUS.json` + kanban, not a local markdown file |
| `docs/P1_SPRITE_SPEC.md` | **16 sprites** (10 P1-blocking, 6 nice-to-have) — full inventory |
| `docs/ART_BIBLE.md` | Palette + programmer-art interim standards |
| `WAVES.md` | Queue **idle**; P1 exit blocked; next candidate `DM-P2-W2` truck movement when unblocked |
| `docs/WAITLIST_AND_WISHLIST.md` §Store page asset backlog | Capsule, screenshots, Steam tags — parallel marketing backlog |
| `src/scenes/truck.ts`, `npcs.ts` | **DMN-2b programmer-art interim** already in main (colored-rect silhouettes) |
| `WORK_IN_FLIGHT` free lane | `dmn-2b-sprites` — "FLEET_BUILD_QUEUE pending — claim before starting art pass" |

**Parked reason (fleet):** *sprite pass pending asset pipeline*

---

## Sprite backlog summary (`P1_SPRITE_SPEC.md`)

| Priority | Count | Examples |
|----------|-------|----------|
| **P1-blocking** | 10 | Truck bounce (#1), smoke wisps (#2), raw/roasted bags (#3–4), coin pop (#5), NPC archetypes A–C (#6–8), owner portrait (#9), district backdrop (#10), 9-slice panel (#11), cash icon (#12), queue slot icon (#13) |
| **Nice-to-have** | 6 | Timer icon (#14), warning icon (#15), roaster machine (#16), extra variants |
| **Interim status** | Partial | Programmer-art truck + NPC silhouettes ship in code; **final sprite sheets not in `assets/sprites/`** |

---

## Prioritized next-safe moves

Ranked for a **parked** repo — docs and planning only until asset pipeline + sprint lock clear.

| Rank | Move | Safe now? | Owner / lane | Rationale |
|------|------|-----------|--------------|-----------|
| **1** | Complete allergy copy audit | ✅ Yes | docs (`dmn-2b-sprites`) | [`ALLERGY_COPY_AUDIT_2026-07-13.md`](ALLERGY_COPY_AUDIT_2026-07-13.md) — no gameplay touch |
| **2** | This build-queue triage doc | ✅ Yes | docs | Surfaces backlog without art pass |
| **3** | External asset brief for artist | ✅ Yes | docs / owner | Export `P1_SPRITE_SPEC.md` + `ART_BIBLE.md` palette refs to artist; no code |
| **4** | `assets/PROVENANCE.md` row prep | ✅ Yes | docs | Template exists in spec §Provenance — fill Status=Placeholder rows before sheets land |
| **5** | Store page asset backlog | ✅ Yes | docs / owner | `WAITLIST_AND_WISHLIST.md` — capsule, screenshots (no Phaser) |
| **6** | Programmer-art polish in `work/interim-art` branch | ⚠️ Caution | art + code review | Spec says separate branch; **touches `src/scenes/` — conflicts with active sprint lock** |
| **7** | Final sprite sheet drop into `assets/sprites/` | ❌ Blocked | art → eng | Requires asset pipeline + eng swap; sprint lock on Phaser |
| **8** | NPC walk-cycle animation wiring | ❌ Blocked | gameplay | P2 prep (`PHASE2_PREP.md`); not `next_safe_moves` while parked |
| **9** | P1 exit gates (SME + allergy reviewer) | ❌ Blocked | owner | Blocks public scale regardless of art |

---

## Recommended sequence (when lane reopens)

1. **Owner:** Commission or generate final sheets for blocking sprites #1–#5 + #6–#8 (NPC readability highest ROI).
2. **Art lead:** Confirm truck bounce (2 fps) + smoke (3 fps) timing with `P1_SPRITE_SPEC.md` §Summary next steps.
3. **Eng (post-unpark):** Drop sheets into `assets/sprites/` per naming convention; swap programmer-art in `truck.ts` / `npcs.ts` without logic changes.
4. **QA:** Smoke wisps scale with active roast count; 9-slice panel corners match UI engine.
5. **Parallel:** Store screenshots from live itch/Pages build for wishlist wave.

---

## Blockers

| Blocker | Unblocks |
|---------|----------|
| Asset pipeline not delivering final PNG sheets | Rank 7–8 |
| Repo `lifecycle: parked` | Feature/art PRs beyond `next_safe_moves` |
| Active Phaser sprint lock (`games/` + scene code) | Interim-art polish without coordination |
| P1 exit: external allergy reviewer | Educator pilot scale |
| Trademark / TESS (B3) | Store launch copy finalization |

---

## Verdict

**Queue state:** Backlog is **documented and partially mitigated** by DMN-2b programmer-art. Fleet should stay **parked for sprite pass** until sheets exist; **docs-only triage complete** — no code changes required from this card.

---

*Docs-only wave · Does not touch `games/` or Phaser sprint lock*
