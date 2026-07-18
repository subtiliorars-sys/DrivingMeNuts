/**
 * music.ts — Procedural background music for Driving Me Nuts.
 *
 * Implements the two looping tracks specified in SOUND_DESIGN.md §B "Music":
 *   - Daytime Market Loop  (~86 BPM, bright, gentle fingerpicking + pad + shaker)
 *   - Evening Market Variant (~76 BPM, warmer, lower register, more space)
 *
 * It is synthesized entirely in code via the Web Audio API — no asset files,
 * no provenance entries, no licensing burden (SOUND_DESIGN.md §D: "No bespoke
 * composition (P1.5)"; this is the cost-zero, royalty-free realisation of that
 * direction). The music shares the AudioContext + master gain owned by
 * audio.ts so the single Sound mute toggle silences everything at once.
 *
 * Design constraints honoured:
 *   - No auto-play: startMusic() is only called from a user-gesture handler,
 *     same as audioInit() (SOUND_DESIGN.md §C "No audio auto-play on app load").
 *   - Ambient floor, never intrusive: music routes through a low sub-gain so
 *     SFX (coin pop, chimes) always sit above the bed (DARK_PATTERN_GATE B.1).
 *   - Day → Evening cross-fade is a smooth tempo/register shift, not a cue
 *     (SOUND_DESIGN.md §C "Music Transitions").
 *   - Mute & on/off prefs persist to localStorage; respected on reload.
 *
 * Robustness: every entry point is wrapped so a missing/closed AudioContext
 * (e.g. headless test, locked-down browser) degrades to silence, never a throw.
 */

import { musicContext, musicMasterGain } from "./audio.js";

/** localStorage key for the music on/off preference. */
export const MUSIC_KEY = "dmn_music";

export type MusicMode = "day" | "evening";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _musicOn = true; // default ON; user can disable in Settings
let _running = false;
let _timer: ReturnType<typeof setInterval> | null = null;
let _busGain: GainNode | null = null; // music sub-bus → master gain
let _filter: BiquadFilterNode | null = null; // warm low-pass roll-off
let _mode: MusicMode = "day";

// Scheduler bookkeeping
let _nextNoteTime = 0; // AudioContext time of the next 16th-note step
let _step = 0; // 0..15 within the current bar
let _bar = 0; // bar counter (drives the chord progression)

// Lookahead scheduler tuning (the classic "A Tale of Two Clocks" pattern).
const LOOKAHEAD_MS = 25; // how often the JS timer wakes
const SCHEDULE_AHEAD = 0.18; // seconds of audio scheduled in advance

// ---------------------------------------------------------------------------
// Musical material — a cozy vi–IV–I–V loop in C major (Am · F · C · G).
// Each entry: bass MIDI note + the triad (MIDI) used for pad + fingerpicking.
// ---------------------------------------------------------------------------

interface Chord {
  bass: number;
  triad: [number, number, number];
}

const PROGRESSION: Chord[] = [
  { bass: 45, triad: [57, 60, 64] }, // Am  (A2 · A3 C4 E4)
  { bass: 41, triad: [53, 57, 60] }, // F   (F2 · F3 A3 C4)
  { bass: 48, triad: [60, 64, 67] }, // C   (C3 · C4 E4 G4)
  { bass: 43, triad: [55, 59, 62] }, // G   (G2 · G3 B3 D4)
];

// A gentle fingerpicking pattern across the 16 sixteenth-notes of a bar.
// Values index into the chord triad (0/1/2); null = rest. Travis-pick feel.
const PICK_PATTERN: Array<number | null> = [
  0, null, 2, null, 1, null, 2, null,
  0, null, 2, null, 1, 2, 1, null,
];

// C-major pentatonic, for the rare twinkling lead note (C D E G A across octaves).
const PENTATONIC = [60, 62, 64, 67, 69, 72, 74];

/** MIDI note number → frequency in Hz (A4 = 440). */
function mtof(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// ---------------------------------------------------------------------------
// Voice synths — all route into the music bus (_busGain → _filter → master).
// ---------------------------------------------------------------------------

function voiceOut(): AudioNode | null {
  return _filter ?? _busGain;
}

/** Soft sustained pad triad — the harmonic bed under each bar. */
function playPad(triad: number[], t: number, dur: number): void {
  const c = musicContext();
  const dest = voiceOut();
  if (!c || !dest) return;
  for (const m of triad) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = mtof(m);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.4); // slow swell
    g.gain.linearRampToValueAtTime(0.035, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

/** Warm bass note (root), one per bar. */
function playBass(m: number, t: number, dur: number): void {
  const c = musicContext();
  const dest = voiceOut();
  if (!c || !dest) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.value = mtof(m);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.075, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Plucked fingerpicking note — short, mellow, guitar-ish. */
function playPluck(m: number, t: number): void {
  const c = musicContext();
  const dest = voiceOut();
  if (!c || !dest) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "triangle";
  osc.frequency.value = mtof(m);
  const peak = _mode === "evening" ? 0.05 : 0.065;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.5);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + 0.55);
}

/** Soft shaker — a tiny filtered-noise tick for light percussion. */
function playShaker(t: number, accent: boolean): void {
  const c = musicContext();
  const dest = voiceOut();
  if (!c || !dest) return;
  const n = Math.floor(c.sampleRate * 0.05);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource();
  src.buffer = buf;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 6000;
  const g = c.createGain();
  const peak = (accent ? 0.03 : 0.018) * (_mode === "evening" ? 0.6 : 1);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05);
  src.connect(hp);
  hp.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + 0.06);
}

/** Rare twinkling lead note / bird-like warble (SOUND_DESIGN bird chirps). */
function playTwinkle(t: number): void {
  const c = musicContext();
  const dest = voiceOut();
  if (!c || !dest) return;
  const m = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)] + 12;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(mtof(m), t);
  osc.frequency.linearRampToValueAtTime(mtof(m) * 1.04, t + 0.12);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.03, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0006, t + 0.5);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + 0.55);
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/** Seconds per 16th note for the current mode (day brighter/faster). */
function sixteenthDur(): number {
  const bpm = _mode === "evening" ? 76 : 86;
  return 60 / bpm / 4;
}

/** Schedule everything that should sound at `_step` of the current bar. */
function scheduleStep(time: number): void {
  const chord = PROGRESSION[_bar % PROGRESSION.length];
  const dur16 = sixteenthDur();

  // Top of bar: lay down the pad + bass for the whole bar.
  if (_step === 0) {
    const barDur = dur16 * 16;
    playPad(chord.triad, time, barDur);
    playBass(chord.bass, time, barDur);
  }

  // Fingerpicking arpeggio.
  const pick = PICK_PATTERN[_step];
  if (pick !== null) {
    // Evening leaves more space: drop the busier off-beat picks.
    const sparse = _mode === "evening" && _step % 4 !== 0;
    if (!sparse) playPluck(chord.triad[pick], time);
  }

  // Light shaker on the back-beats (steps 4 and 12), accent on the down-beat.
  if (_step === 0 || _step === 8) playShaker(time, true);
  else if (_step === 4 || _step === 12) playShaker(time, false);

  // Sparse twinkle: roughly once every few bars, only on a strong beat.
  if (_step === 8 && Math.random() < (_mode === "evening" ? 0.18 : 0.28)) {
    playTwinkle(time);
  }

  // Advance the step / bar counters.
  _step++;
  if (_step >= 16) {
    _step = 0;
    _bar++;
  }
}

/** Timer callback: schedule all steps falling inside the lookahead window. */
function tickScheduler(): void {
  const c = musicContext();
  if (!c) return;
  while (_nextNoteTime < c.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(_nextNoteTime);
    _nextNoteTime += sixteenthDur();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Read the music on/off pref from storage without touching the AudioContext. */
export function loadMusicPref(storage?: Pick<Storage, "getItem">): void {
  if (storage) {
    const v = storage.getItem(MUSIC_KEY);
    // Default ON when unset (null); "0" means the player turned it off.
    _musicOn = v !== "0";
  }
}

/** Is background music currently enabled by the player? */
export function isMusicOn(): boolean {
  return _musicOn;
}

/**
 * Toggle the music pref, persist it, and start/stop playback to match.
 * Returns the new state (true = music on).
 */
export function toggleMusic(storage?: Pick<Storage, "getItem" | "setItem">): boolean {
  _musicOn = !_musicOn;
  if (storage) storage.setItem(MUSIC_KEY, _musicOn ? "1" : "0");
  if (_musicOn) startMusic(_mode);
  else stopMusic();
  return _musicOn;
}

/**
 * Begin (or resume) the procedural soundtrack. Safe to call repeatedly.
 * No-op if music is disabled or no AudioContext is available. Must be invoked
 * from a user gesture (browser auto-play policy) — same contract as audioInit.
 */
export function startMusic(mode: MusicMode = _mode): void {
  _mode = mode;
  if (!_musicOn || _running) return;
  const c = musicContext();
  const master = musicMasterGain();
  if (!c || !master) return; // headless / no audio — stay silent

  try {
    _busGain = c.createGain();
    _busGain.gain.value = 0; // fade in to avoid a click
    _filter = c.createBiquadFilter();
    _filter.type = "lowpass";
    _filter.frequency.value = mode === "evening" ? 1800 : 3200; // warm roll-off
    _filter.Q.value = 0.5;
    _busGain.connect(master);
    _filter.connect(_busGain);
    // Gentle fade-in over ~2s to the ambient floor.
    const now = c.currentTime;
    _busGain.gain.setValueAtTime(0, now);
    _busGain.gain.linearRampToValueAtTime(0.5, now + 2);

    _step = 0;
    _bar = 0;
    _nextNoteTime = now + 0.1;
    _running = true;
    _timer = setInterval(tickScheduler, LOOKAHEAD_MS);
  } catch {
    _running = false;
  }
}

/** Stop playback and tear down the music bus (with a short fade). */
export function stopMusic(): void {
  if (_timer !== null) {
    clearInterval(_timer);
    _timer = null;
  }
  _running = false;
  const c = musicContext();
  if (c && _busGain) {
    try {
      const now = c.currentTime;
      _busGain.gain.cancelScheduledValues(now);
      _busGain.gain.setValueAtTime(_busGain.gain.value, now);
      _busGain.gain.linearRampToValueAtTime(0, now + 0.4);
      const bus = _busGain;
      const filt = _filter;
      setTimeout(() => {
        try { bus.disconnect(); } catch { /* already gone */ }
        try { filt?.disconnect(); } catch { /* already gone */ }
      }, 600);
    } catch { /* best-effort */ }
  }
  _busGain = null;
  _filter = null;
}

/**
 * Cross-fade between the day and evening arrangements. Smoothly retunes the
 * warm low-pass and lets the scheduler pick up the new tempo on the next step
 * (SOUND_DESIGN.md §C: smooth shift, no transition cue). No-op if unchanged.
 */
export function setMusicMode(mode: MusicMode): void {
  if (mode === _mode) return;
  _mode = mode;
  const c = musicContext();
  if (c && _filter) {
    const now = c.currentTime;
    const target = mode === "evening" ? 1800 : 3200;
    _filter.frequency.cancelScheduledValues(now);
    _filter.frequency.setValueAtTime(_filter.frequency.value, now);
    _filter.frequency.linearRampToValueAtTime(target, now + 8); // 8s cross-fade
  }
}

/** True while the scheduler is actively running (test/QA introspection). */
export function isMusicRunning(): boolean {
  return _running;
}
