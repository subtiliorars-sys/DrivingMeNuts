/**
 * a11y_pedagogy.test.ts — accessibility prefs + glossary content integrity
 * (Polish & Pedagogy wave). Pure modules, no Phaser.
 */

import { describe, it, expect } from "vitest";
import {
  prefsInit,
  isReducedMotion,
  isColorblindCues,
  isLargeText,
  toggleReducedMotion,
  toggleColorblindCues,
  toggleLargeText,
  scaledFont,
  fontScale,
  marginCue,
  REDUCED_MOTION_KEY,
  COLORBLIND_KEY,
  LARGE_TEXT_KEY,
  LARGE_TEXT_SCALE,
} from "../scenes/prefs.js";
import {
  GLOSSARY,
  GLOSSARY_BY_ID,
  GLOSSARY_DISCLAIMER,
} from "../data/glossary.js";
import { loadMutePref, isMuted, MUTE_KEY } from "../scenes/audio.js";

/** In-memory storage with a seedable backing map. */
function makeStorage(seed: Record<string, string> = {}): Pick<Storage, "getItem" | "setItem"> & { map: Map<string, string> } {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe("accessibility prefs", () => {
  it("prefsInit reads persisted values; defaults to off when absent", () => {
    prefsInit(makeStorage()); // empty
    expect(isReducedMotion()).toBe(false);
    expect(isColorblindCues()).toBe(false);
    expect(isLargeText()).toBe(false);

    prefsInit(makeStorage({
      [REDUCED_MOTION_KEY]: "1",
      [COLORBLIND_KEY]: "1",
      [LARGE_TEXT_KEY]: "1",
    }));
    expect(isReducedMotion()).toBe(true);
    expect(isColorblindCues()).toBe(true);
    expect(isLargeText()).toBe(true);
  });

  it("toggles flip state and persist to storage", () => {
    const s = makeStorage();
    prefsInit(s);
    expect(toggleReducedMotion(s)).toBe(true);
    expect(s.map.get(REDUCED_MOTION_KEY)).toBe("1");
    expect(isReducedMotion()).toBe(true);
    expect(toggleReducedMotion(s)).toBe(false);
    expect(s.map.get(REDUCED_MOTION_KEY)).toBe("0");

    expect(toggleColorblindCues(s)).toBe(true);
    expect(s.map.get(COLORBLIND_KEY)).toBe("1");
    // round-trips through a fresh init
    prefsInit(makeStorage({ [COLORBLIND_KEY]: "1" }));
    expect(isColorblindCues()).toBe(true);
  });

  it("largeText toggle scales fonts and persists (DM-W2)", () => {
    const s = makeStorage();
    prefsInit(s);
    expect(toggleLargeText(s)).toBe(true);
    expect(s.map.get(LARGE_TEXT_KEY)).toBe("1");
    expect(isLargeText()).toBe(true);
    expect(fontScale()).toBe(LARGE_TEXT_SCALE);
    expect(scaledFont(10)).toBe(`${Math.round(10 * LARGE_TEXT_SCALE)}px`);
    expect(toggleLargeText(s)).toBe(false);
    expect(scaledFont(10)).toBe("10px");
  });

  it("RT F1: loadMutePref syncs mute from storage without a gesture", () => {
    loadMutePref(makeStorage({ [MUTE_KEY]: "1" }));
    expect(isMuted()).toBe(true);
    loadMutePref(makeStorage({ [MUTE_KEY]: "0" }));
    expect(isMuted()).toBe(false);
    // Absent key → treated as not-muted (default).
    loadMutePref(makeStorage());
    expect(isMuted()).toBe(false);
  });

  it("marginCue thresholds match the HUD coloring (≥60 healthy, ≥45 tight, else low)", () => {
    expect(marginCue(75)).toBe("healthy");
    expect(marginCue(60)).toBe("healthy");
    expect(marginCue(59.9)).toBe("tight");
    expect(marginCue(45)).toBe("tight");
    expect(marginCue(44.9)).toBe("low");
    expect(marginCue(0)).toBe("low");
  });
});

describe("glossary content", () => {
  it("ids are unique and resolvable", () => {
    const ids = GLOSSARY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(GLOSSARY_BY_ID[id]).toBeDefined();
  });

  it("every entry has a term and a non-trivial definition", () => {
    for (const e of GLOSSARY) {
      expect(e.term.length).toBeGreaterThan(0);
      expect(e.definition.length).toBeGreaterThan(20);
    }
  });

  it("disclaimer states the simplification (A2)", () => {
    expect(GLOSSARY_DISCLAIMER.toLowerCase()).toMatch(/simplif/);
    expect(GLOSSARY_DISCLAIMER.toLowerCase()).toMatch(/vary|varies/);
  });

  it("allergy entry is present, serious, and never jokey (RISK_REGISTER A1)", () => {
    const a = GLOSSARY_BY_ID["allergy"];
    expect(a).toBeDefined();
    const text = (a.definition + " " + (a.inGame ?? "")).toLowerCase();
    // Substance: severity + cross-contact + honest referral, per the canon.
    expect(text).toMatch(/life-threatening|severe/);
    expect(text).toMatch(/cross-?contact|cross-?contamination|same equipment/);
    expect(text).toMatch(/refer|nearby|safe option|allergen-free/);
    // Never trivializing (the serious "never something to joke about" is fine;
    // what we reject is making light of it).
    expect(text).not.toMatch(/funny|hilarious|\blol\b|haha/);
    expect(text).toMatch(/never (something )?to joke|not.*joke|never.*joke/);
  });

  it("APR entry teaches comparison and carries the simplified qualifier", () => {
    const apr = GLOSSARY_BY_ID["apr"];
    expect(apr.definition.toLowerCase()).toMatch(/compare|annual/);
    expect(apr.definition.toLowerCase()).toMatch(/simplif|vary|varies|check/);
  });
});
