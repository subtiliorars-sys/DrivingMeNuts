# Sound Design — Driving Me Nuts (P1.5 Audio Direction)

> **Scope:** Seed document for audio production. Establishes tone, inventory, and implementation constraints. Do not commit to expensive bespoke composition until this direction is owner-ratified.

---

## A. Audio Tone & Atmosphere

### Aesthetic: Pixel-Cozy, Lo-Fi, Market Warmth

The audio landscape mimics the visual pixel art: nostalgic, small-scale, lived-in. Think indie game soundtracks (Stardew Valley, Loop Hero) rather than cinematic sweep.

**Key principles:**
- **Acoustic-forward:** real instrument samples (acoustic guitar, wood percussion, wind chimes) mixed with subtle digital synthesis (lo-fi breakbeats, warm pads).
- **Market ambience:** subtle crowd murmur, street vendors calling, ambient nature sounds (birds, wind rustling leaves). Grounds the player in a place, not a void.
- **No orchestral swells.** Avoid cinematic tension; cozy games are anti-drama.
- **Warm EQ curve:** boost the midrange (200 Hz – 4 kHz); gentle high-end roll-off to avoid ear fatigue on long play sessions (targets 13+ audience, potential long engagement).
- **Volume curve:** peaks at –12 dB (leaving headroom for critical hits/chimes); ambient floor at –30 dB (perceptible but not intrusive).

---

## B. P1.5 Sound Inventory

### Diegetic (In-World) SFX

These sounds exist in the world; the player hears what Old Joe/the truck hears.

| **SFX** | **Duration** | **Purpose** | **Tone** | **File Hint** |
|---------|--------------|-----------|---------|--------------|
| **Roast sizzle loop** | 0:45–1:20 (loopable) | Peanuts roasting in the roaster; ambience during roasting sequences. | Warm, rhythmic crackle; slight pitch rise as heat increases. | `sfx_roast_sizzle_v1.wav` |
| **Batch-ready chime** | 0:15–0:25 | Roasting timer completes; batch is done. Gentle, celebratory bell tone. | Bright, brief, non-jarring (not an alarm). | `sfx_batch_ready_v1.wav` |
| **Coin pop** | 0:08–0:12 | A customer buys; cash register sound (stylized, not realistic). | Retro, light, satisfying—teaches the player that every sale counts. | `sfx_coin_pop_v1.wav` |
| **Purchase blip** | 0:12–0:18 | UI confirmation when a customer is served; softer than coin pop. | Muted, brief, like a gentle doorbell. | `sfx_purchase_blip_v1.wav` |
| **Day-end sting** | 0:25–0:35 | Evening summary screen; signals end-of-day accounting. | Warm, resolved, slightly melancholic (ready for tomorrow). | `sfx_dayend_sting_v1.wav` |
| **Page/menu tick** | 0:05–0:08 | Navigation UI sounds (button presses, screen transitions). | Subtle, satisfying; like a mechanical pencil clicking. | `sfx_menu_tick_v1.wav` |
| **Rescue-arc motif (Old Joe approach)** | 0:35–0:50 | Old Joe arrives at the truck; a gentle, mentor-warm sound cue. | Acoustic guitar fingerpicking or harmonica; never ominous. Teaches: help is here. | `sfx_oldjo_arrival_v1.wav` |

### Music (Looping Tracks)

Two primary tracks, each looping seamlessly. No explicit "boss music" or high-tension cues; all music is supportive and restful.

| **Track** | **Duration** | **BPM** | **Mood** | **Instrumentation** |
|-----------|--------------|--------|---------|---------------------|
| **Daytime Market Loop** | 1:30–2:00 (loops) | 85–90 BPM | Bright, upbeat, energetic but not manic. Encourages activity. | Acoustic guitar fingerpicking, light percussion (shakers, brushed snare), simple synth pad (low A). Occasional bird chirps in background. |
| **Evening Market Variant** | 1:30–2:00 (loops) | 80–85 BPM | Warm, reflective, slightly slower. Wind-down energy. | Same foundation but lower register emphasis (cello or bass guitar carries the melody); softer hi-hats; reverb increase (larger acoustic space). |

---

## C. Implementation Notes

### Music Transitions

- **Day → Evening:** Cross-fade over 8–12 seconds (not abrupt). No explicit "transition cue"; just a smooth volume/EQ shift.
- **Evening → Night (if applicable):** Further slow to 60–70 BPM; introduce ambient pad layers (tape saturation for warmth, not digital coldness).
- **Return to Day:** Fade in the daytime loop at full energy; rewards player for returning to the game.

### SFX Layering

- **Roasting SFX:** Sizzle loop plays continuously during a roasting sequence. Pitch and intensity vary subtly based on roast progress (optional advanced feature for P2+).
- **Purchase SFX stack:** When a customer buys:
  1. Coin pop (primary feedback)
  2. Brief purchase blip (secondary, softer confirmation)
  3. Optional: a random satisfied customer sigh or "thanks!" (voice sample, rare, keep under 10% trigger rate to avoid fatigue)

### Volume & Mute

**Critical control (DARK_PATTERN_GATE B.1 enforced):**
- **Master volume slider in HUD:** Always visible, always adjustable (0–100%). Default: 70%.
- **Mute button:** Quick toggle in settings menu. Mute state persists across sessions (localStorage).
- **No audio auto-play on app load.** Player must interact with the game (click/tap) before music begins. Respects browser auto-play policies and player autonomy.
- **No nagging.** Audio is never used to pressure the player to log in (e.g., no notification sounds that push users back into the game).

### Browser Compatibility

- **Phaser 3 Audio API:** Use Phaser's built-in Webaudio context manager.
- **Mobile fallback:** iOS/Android have strict audio policies. Webaudio context must be resumed after user gesture (tap). Phaser handles this automatically; document in dev notes.
- **Codec support:** Provide SFX in .wav (lossless, for quality) + .ogg Vorbis (compressed, for web load time). Music in .mp3 (broad compatibility) + .ogg (open standard).

---

## D. Free & Licensable Source Strategy

### Audio Assets: No Bespoke Composition (P1.5)

To keep P1.5 scope contained and cost-zero:

1. **Royalty-free SFX libraries:**
   - Freesound.org (CC0 & CC-BY licensed)
   - Zapsplat (royalty-free; free tier requires attribution — verify per-asset license at download)
   - Leshy SFX (free, open-licensed chiptune tool)
   - OpenGameArt.org (community audio, CC-licensed)

2. **Music tracks:**
   - Incompetech (Kevin MacLeod, CC-BY 3.0): library includes lo-fi, cozy, ambient tracks suitable for food-prep games.
   - Freepd.com (free, attribution required).
   - Consider: are we okay with attribution links in credits? Yes per RISK_REGISTER AI-provenance row.

3. **Provenance logging (RISK_REGISTER AI-provenance safeguard):**
   - Every audio file gets a metadata entry in `assets/PROVENANCE.md`
     (canonical log — single file, not per-directory):
     ```
     ## sfx_roast_sizzle_v1.wav
     - Source: Freesound.org
     - Artist: [Creator Name]
     - License: CC-BY 3.0
     - Link: https://freesound.org/sounds/[ID]/
     - Modifications: Pitch-shifted +2 semitones, reverb added (Phaser reverb filter)
     - Date Added: 2026-06-07
     - Attribution required: YES — include in credits
     ```
   - This ensures audit trail and compliance with open-source licenses.
   - **Attribution rule:** verify each source's license individually. Many CC0 sources
     require no attribution; CC-BY requires it; Zapsplat's free tier requires attribution
     per their terms — confirm at download time and note in PROVENANCE.md whether
     attribution is required. Do not assume "royalty-free" means "no attribution needed."

---

## E. Audio Sprite Sheet (Performance Optimization)

For P1.5 build, consider bundling SFX into a sprite sheet (Phaser AudioSprite format):

- **One `.wav` file:** all short SFX concatenated (batch-ready, coin-pop, menu-tick, etc.).
- **One `.json` manifest:** defines start/end times for each SFX within the sprite.
- **Benefit:** single HTTP request (faster load), single decode, reduced overhead.
- **Trade-off:** less granular control; harder to swap individual SFX later.

**Decision:** Implement sprite sheet for SFX (6+ small clips → 1 file). Keep music tracks separate (2 files, larger, worth the separate requests).

---

## F. Next Steps (Post-P1.5)

### P2 Audio Expansion (Optional Enhancements)

1. **NPC voice reactions:** Tiny samples (100–200 ms) of customer sighs, approvals ("Mmm!"), or disappointment ("Hmph"). Keep rare (10–15% trigger rate) to avoid annoyance.
2. **Advanced roast SFX:** Pitch/intensity variation as roast progresses (teaches roast stages).
3. **Season-specific ambient:** Spring bird songs → summer cicadas → fall leaves → winter silence (teaches seasonality).
4. **Crisis-mode audio:** During rescue-arc trigger, optional subtle dissonant chord (not scary, just "something shifted") to signal the stakes—then resolve warmly when Old Joe helps.

### P3+ Audio Vision

- **Music composition (if budget allows):** Hire composer for original daytime/evening loops (keep theme intact, just professionally produced).
- **Accessibility audio:** Sonic icons for colorblind players (distinct pitch patterns for profit/loss, red/green alerts).
- **Audio description (narration):** Optional audio track describing key UI elements (for visually impaired players); non-intrusive.

---

## G. Audio Checklist (Pre-P1.5 Launch)

- [ ] Master volume slider in HUD; persists to localStorage.
- [ ] Mute button in settings; respects mute state on reload.
- [ ] All SFX have provenance entries in `assets/PROVENANCE.md` (attribution noted per-file).
- [ ] Music tracks loop seamlessly (no silence, no pops at loop point).
- [ ] Phaser Webaudio context resume works on mobile (test iOS/Android).
- [ ] No audio nagging (no push notifications, no auto-play, no required user action tied to audio cues).
- [ ] DARK_PATTERN_GATE B.1 pass: roasting timers are transparent and diegetic; no pay-to-skip audio.
- [ ] Accessibility: volume levels tested at –12 dB max (headphone safety).
- [ ] Copyright: all licenses verified; credits file generated from PROVENANCE.md.

---

**Seed status:** Ready for owner review and audio designer intake. No production work until ratified.

**Word count:** ~75 lines of core spec + implementation + checklist.
