/**
 * audio.ts — Synthesized audio v1 for Driving Me Nuts.
 *
 * Synthesized in code — no external assets, no provenance entries required;
 * AI-disclosure stance: DISCLOSE OPENLY (owner 2026-06-07) applies to authored
 * assets when they land.
 *
 * All sounds are generated via the Web Audio API (oscillators + noise).
 * No audio files are loaded or bundled.
 *
 * Design direction (SOUND_DESIGN.md):
 *   - Warm, soft, lo-fi; short envelopes; low volume default.
 *   - AudioContext resumes only on first user gesture (browser auto-play safe).
 *   - No audio in the sim layer.
 *   - Mute state persisted in localStorage via a separate key.
 *
 * DARK_PATTERN_GATE B.1: no pay-to-skip audio cues; all SFX are diegetic
 * and non-nagging.
 */

/** localStorage key for mute preference */
export const MUTE_KEY = "dmn_mute";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;
let _muted = false;

/** Master gain node (all sounds route through here so mute is instant). */
let _masterGain: GainNode | null = null;

/**
 * Lazily create (or return) the AudioContext.
 * Must be called after a user gesture — the caller is responsible for
 * ensuring this (SOUND_DESIGN.md browser compat note).
 */
function ctx(): AudioContext {
  if (!_ctx) {
    _ctx = new AudioContext();
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = _muted ? 0 : 0.7; // default 70% per SOUND_DESIGN §volume
    _masterGain.connect(_ctx.destination);
  }
  return _ctx;
}

/** Route a node through master gain and auto-disconnect after `durationSec + 0.1 s`. */
function route(node: AudioNode, durationSec: number): void {
  if (!_masterGain) return;
  node.connect(_masterGain);
  // Disconnect after playback ends — keeps the graph tidy
  setTimeout(() => {
    try { node.disconnect(); } catch { /* already gone */ }
  }, (durationSec + 0.1) * 1_000);
}

// ---------------------------------------------------------------------------
// Public: init — call on first user gesture to satisfy browser policies
// ---------------------------------------------------------------------------

/**
 * Resume the AudioContext if suspended (required for iOS/Android/Chrome).
 * Call this from any pointer-down handler before playing sounds.
 */
export function audioInit(storage?: Pick<Storage, "getItem">): void {
  // Restore persisted mute pref before anything plays
  if (storage) {
    _muted = storage.getItem(MUTE_KEY) === "1";
  }
  const c = ctx();
  if (c.state === "suspended") {
    c.resume().catch(() => { /* best-effort */ });
  }
  if (_masterGain) {
    _masterGain.gain.value = _muted ? 0 : 0.7;
  }
}

// ---------------------------------------------------------------------------
// Public: mute toggle
// ---------------------------------------------------------------------------

/**
 * Toggle mute state and optionally persist it.
 * Returns the new mute state (true = muted).
 */
export function toggleMute(storage?: Pick<Storage, "getItem" | "setItem">): boolean {
  _muted = !_muted;
  if (_masterGain) {
    _masterGain.gain.value = _muted ? 0 : 0.7;
  }
  if (storage) {
    storage.setItem(MUTE_KEY, _muted ? "1" : "0");
  }
  return _muted;
}

/** Read current mute state without toggling. */
export function isMuted(): boolean {
  return _muted;
}

// ---------------------------------------------------------------------------
// SFX: coin pop blip
// ---------------------------------------------------------------------------

/**
 * A light, retro coin-pop blip: short sine burst, slight pitch rise.
 * Fires on each sale (SOUND_DESIGN.md § "Coin pop").
 */
export function playCoinPop(): void {
  const c = ctx();
  const now = c.currentTime;

  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.06);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain);
  route(gain, 0.12);

  osc.start(now);
  osc.stop(now + 0.12);
}

// ---------------------------------------------------------------------------
// SFX: batch-ready chime
// ---------------------------------------------------------------------------

/**
 * Gentle celebratory chime: two-note ding (fifth interval).
 * Fires when a roast batch completes (SOUND_DESIGN.md § "Batch-ready chime").
 * Bright, brief, non-jarring.
 */
export function playBatchReady(): void {
  const c = ctx();
  const now = c.currentTime;

  // Two sine tones a fifth apart, staggered slightly
  const freqs = [660, 990];
  const offsets = [0, 0.08];

  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freqs[i], now + offsets[i]);

    gain.gain.setValueAtTime(0, now + offsets[i]);
    gain.gain.linearRampToValueAtTime(0.20, now + offsets[i] + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offsets[i] + 0.35);

    osc.connect(gain);
    route(gain, offsets[i] + 0.35);

    osc.start(now + offsets[i]);
    osc.stop(now + offsets[i] + 0.35);
  }
}

// ---------------------------------------------------------------------------
// SFX: day-end sting
// ---------------------------------------------------------------------------

/**
 * Warm, resolved day-end sting: short ascending motif + brief decay.
 * Fires on end-of-day (SOUND_DESIGN.md § "Day-end sting").
 * Warm, resolved, slightly melancholic.
 */
export function playDayEnd(): void {
  const c = ctx();
  const now = c.currentTime;

  // Simple three-note ascending melody (root, major-third, fifth)
  const notes = [
    { freq: 330, t: 0,    dur: 0.18 },
    { freq: 415, t: 0.14, dur: 0.18 },
    { freq: 495, t: 0.28, dur: 0.40 },
  ];

  for (const n of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();

    // Soft triangle wave for warmth (lo-fi, low-harsh)
    osc.type = "triangle";
    osc.frequency.setValueAtTime(n.freq, now + n.t);

    gain.gain.setValueAtTime(0, now + n.t);
    gain.gain.linearRampToValueAtTime(0.18, now + n.t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.dur);

    osc.connect(gain);
    route(gain, n.t + n.dur);

    osc.start(now + n.t);
    osc.stop(now + n.t + n.dur);
  }
}

// ---------------------------------------------------------------------------
// SFX: button tick
// ---------------------------------------------------------------------------

/**
 * Subtle, satisfying button tick: tiny noise burst with a very short envelope.
 * Fires on UI button presses (SOUND_DESIGN.md § "Page/menu tick").
 * Like a mechanical pencil clicking.
 */
export function playButtonTick(): void {
  const c = ctx();
  const now = c.currentTime;

  // White noise burst via AudioBufferSourceNode
  const bufferSize = c.sampleRate * 0.04; // 40 ms of samples
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.4;
  }

  const source = c.createBufferSource();
  source.buffer = buffer;

  // Band-pass filter around 2 kHz for a "click" quality
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2_000;
  filter.Q.value = 2.5;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  source.connect(filter);
  filter.connect(gain);
  route(gain, 0.04);

  source.start(now);
  source.stop(now + 0.04);
}
