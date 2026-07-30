/**
 * relationships.test.ts — NPC friendship logic + content integrity.
 */
import { describe, it, expect } from "vitest";
import { createState } from "./engine.js";
import { serialize, deserialize } from "./persistence.js";
import {
  friendshipFor,
  tierFor,
  greet,
  hasMet,
  addFriendship,
  meet,
  reviveRelationships,
  applyDailyFriendship,
} from "./relationships.js";
import {
  NPCS,
  NPC_ORDER,
  FRIENDSHIP_MAX,
  FRIEND_TIERS,
  tierForFriendship,
  greetingFor,
  isNpcId,
} from "../data/npcs.js";

describe("NPC content integrity", () => {
  it("has all six named regulars with a line for every tier", () => {
    expect(NPC_ORDER).toHaveLength(6);
    for (const id of NPC_ORDER) {
      const npc = NPCS[id];
      expect(npc.id).toBe(id);
      expect(npc.name.length).toBeGreaterThan(0);
      expect(npc.gag.length).toBeGreaterThan(0);
      for (const tier of FRIEND_TIERS) {
        expect(npc.greet[tier].length).toBeGreaterThan(0);
      }
    }
  });

  it("isNpcId accepts known ids and rejects junk", () => {
    expect(isNpcId("marta")).toBe(true);
    expect(isNpcId("nobody")).toBe(false);
    expect(isNpcId(42)).toBe(false);
    expect(isNpcId(null)).toBe(false);
  });

  it("tierForFriendship maps the 0–100 scale to tiers", () => {
    expect(tierForFriendship(0)).toBe("stranger");
    expect(tierForFriendship(19)).toBe("stranger");
    expect(tierForFriendship(20)).toBe("acquaintance");
    expect(tierForFriendship(49)).toBe("acquaintance");
    expect(tierForFriendship(50)).toBe("regular");
    expect(tierForFriendship(80)).toBe("friend");
    expect(tierForFriendship(100)).toBe("friend");
    // defensive: NaN floors to stranger
    expect(tierForFriendship(NaN)).toBe("stranger");
  });

  it("greetingFor returns the tier-appropriate line", () => {
    expect(greetingFor("old_joe", 0)).toBe(NPCS.old_joe.greet.stranger);
    expect(greetingFor("old_joe", 90)).toBe(NPCS.old_joe.greet.friend);
  });
});

describe("friendship mutations", () => {
  it("starts with nobody met", () => {
    const s = createState(1);
    expect(hasMet(s, "marta")).toBe(false);
    expect(friendshipFor(s, "marta")).toBe(0);
    expect(tierFor(s, "marta")).toBe("stranger");
  });

  it("meet() is idempotent and never lowers a score", () => {
    const s = createState(1);
    addFriendship(s, "marta", 30);
    meet(s, "marta");
    expect(friendshipFor(s, "marta")).toBe(30); // unchanged
    meet(s, "derek");
    expect(hasMet(s, "derek")).toBe(true);
    expect(friendshipFor(s, "derek")).toBe(0);
  });

  it("addFriendship clamps to [0, MAX] and reports tier-ups", () => {
    const s = createState(1);
    const c1 = addFriendship(s, "marta", 25);
    expect(c1.points).toBe(25);
    expect(c1.tierBefore).toBe("stranger");
    expect(c1.tierAfter).toBe("acquaintance");
    expect(c1.tierUp).toBe(true);

    const c2 = addFriendship(s, "marta", 5);
    expect(c2.tierUp).toBe(false);

    // clamp high
    addFriendship(s, "marta", 999);
    expect(friendshipFor(s, "marta")).toBe(FRIENDSHIP_MAX);

    // clamp low (and never below 0)
    addFriendship(s, "marta", -9999);
    expect(friendshipFor(s, "marta")).toBe(0);

    // non-finite delta is a no-op
    addFriendship(s, "marta", NaN);
    expect(friendshipFor(s, "marta")).toBe(0);
  });

  it("greet() escalates with the relationship", () => {
    const s = createState(1);
    expect(greet(s, "sal")).toBe(NPCS.sal.greet.stranger);
    addFriendship(s, "sal", 85);
    expect(greet(s, "sal")).toBe(NPCS.sal.greet.friend);
  });
});

describe("applyDailyFriendship (gameplay-driven growth)", () => {
  it("warms only the regulars of the district traded in", () => {
    const s = createState(1);
    // Farmers' Market regulars: old_joe, marta, dr_chen.
    const res = applyDailyFriendship(s, "farmers_market", 30);
    const ids = res.map((r) => r.id).sort();
    expect(ids).toEqual(["dr_chen", "marta", "old_joe"]);
    expect(friendshipFor(s, "old_joe")).toBeGreaterThan(0);
    // Office Quarter regular untouched.
    expect(hasMet(s, "derek")).toBe(false);
  });

  it("scales gently with volume and caps at +4/day", () => {
    const s = createState(1);
    applyDailyFriendship(s, "farmers_market", 999);
    expect(friendshipFor(s, "marta")).toBe(4); // capped
    const s2 = createState(1);
    applyDailyFriendship(s2, "farmers_market", 5); // < 15 lbs → +1
    expect(friendshipFor(s2, "marta")).toBe(1);
  });

  it("warms rival Sal at half rate", () => {
    const s = createState(1);
    applyDailyFriendship(s, "office_quarter", 999); // base +4
    expect(friendshipFor(s, "derek")).toBe(4);
    expect(friendshipFor(s, "sal")).toBe(2); // half
  });

  it("is a no-op on a zero-sales day", () => {
    const s = createState(1);
    expect(applyDailyFriendship(s, "farmers_market", 0)).toEqual([]);
    expect(hasMet(s, "marta")).toBe(false);
  });

  it("reports tier-ups across days", () => {
    const s = createState(1);
    let sawTierUp = false;
    for (let d = 0; d < 30; d++) {
      const res = applyDailyFriendship(s, "farmers_market", 30);
      if (res.some((r) => r.change.tierUp)) sawTierUp = true;
    }
    expect(sawTierUp).toBe(true);
    expect(tierFor(s, "marta")).not.toBe("stranger");
  });
});

describe("reviveRelationships (load sanitation)", () => {
  it("drops unknown ids and clamps scores", () => {
    const revived = reviveRelationships({
      marta: 60,
      derek: 200, // clamp → 100
      ghost: 50, // unknown → dropped
      sal: "lots", // non-number → dropped
      maya: -5, // clamp → 0
    });
    expect(revived).toEqual({ marta: 60, derek: 100, maya: 0 });
  });

  it("handles junk input without throwing", () => {
    expect(reviveRelationships(null)).toEqual({});
    expect(reviveRelationships("nope")).toEqual({});
    expect(reviveRelationships([1, 2, 3])).toEqual({});
  });
});

describe("persistence round-trip", () => {
  it("npcRelationships survives serialize → deserialize", () => {
    const s = createState(7);
    addFriendship(s, "old_joe", 40);
    addFriendship(s, "dr_chen", 80);
    const back = deserialize(serialize(s));
    expect(friendshipFor(back, "old_joe")).toBe(40);
    expect(tierFor(back, "dr_chen")).toBe("friend");
    expect(hasMet(back, "marta")).toBe(false);
  });

  it("a legacy save with no npcRelationships loads as empty", () => {
    const env = JSON.parse(serialize(createState(1)));
    delete env.sim.npcRelationships;
    const back = deserialize(JSON.stringify(env));
    expect(back.npcRelationships).toEqual({});
  });

  it("a save with a junk relationships value is rejected by sanityCheck", () => {
    const env = JSON.parse(serialize(createState(1)));
    env.sim.npcRelationships = [1, 2, 3]; // array, not a map
    expect(() => deserialize(JSON.stringify(env))).toThrow(/npcRelationships invalid/);
  });
});
