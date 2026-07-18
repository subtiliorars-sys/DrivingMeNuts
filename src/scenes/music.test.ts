/**
 * music.test.ts — preference + lifecycle logic for the procedural soundtrack.
 *
 * Runs in the node environment (no AudioContext). music.ts is written so every
 * playback entry point no-ops gracefully when no AudioContext exists, which lets
 * us verify the persistence/toggle contract without a browser. Audio output
 * itself is browser-only and validated by the desktop launch smoke test.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  MUSIC_KEY,
  loadMusicPref,
  isMusicOn,
  toggleMusic,
  startMusic,
  stopMusic,
  setMusicMode,
  isMusicRunning,
} from "./music.js";

/** Minimal in-memory Storage stand-in. */
function makeStorage(): Pick<Storage, "getItem" | "setItem"> & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
  };
}

describe("music preferences", () => {
  beforeEach(() => {
    // Reset module state to the unset-default (ON) before each test.
    loadMusicPref({ getItem: () => null });
  });

  it("defaults to ON when no preference is stored", () => {
    loadMusicPref({ getItem: () => null });
    expect(isMusicOn()).toBe(true);
  });

  it("reads '0' as OFF", () => {
    loadMusicPref({ getItem: () => "0" });
    expect(isMusicOn()).toBe(false);
  });

  it("reads '1' as ON", () => {
    loadMusicPref({ getItem: () => "1" });
    expect(isMusicOn()).toBe(true);
  });

  it("toggleMusic flips the state and persists it", () => {
    const storage = makeStorage();
    loadMusicPref(storage);
    expect(isMusicOn()).toBe(true);

    const afterOff = toggleMusic(storage);
    expect(afterOff).toBe(false);
    expect(isMusicOn()).toBe(false);
    expect(storage.map.get(MUSIC_KEY)).toBe("0");

    const afterOn = toggleMusic(storage);
    expect(afterOn).toBe(true);
    expect(storage.map.get(MUSIC_KEY)).toBe("1");
  });

  it("never starts the scheduler without an AudioContext (headless-safe)", () => {
    loadMusicPref({ getItem: () => null });
    startMusic("day");
    // No AudioContext in node → the scheduler must stay dormant, not throw.
    expect(isMusicRunning()).toBe(false);
  });

  it("stopMusic and setMusicMode are no-throw without an AudioContext", () => {
    expect(() => stopMusic()).not.toThrow();
    expect(() => setMusicMode("evening")).not.toThrow();
    expect(() => setMusicMode("day")).not.toThrow();
  });
});
