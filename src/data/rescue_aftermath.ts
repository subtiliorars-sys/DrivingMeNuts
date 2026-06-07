/**
 * rescue_aftermath.ts — one-time post-resolution beats for the rescue arc.
 *
 * Fires ONCE per path (tracked in SimState.aftermathSeen) when a rescue debt
 * is fully repaid or Derek's preorder is delivered in full. Each beat closes
 * the loop on that path's lesson — gratitude + the takeaway, never shame.
 *
 * SCOPE RAIL (owner-gated, do not extend here): this file is AFTERMATH only.
 * Re-entry escalation (second crises, 7% loans, Marta hesitation — script
 * §Re-Entry) is deferred by red-team RT-1 and requires an owner decision.
 * Nothing in this file may create a new offer, debt, or obligation.
 *
 * Pure data. No Phaser.
 */

/** Aftermath path keys: the three debt kinds + the preorder path. */
export type AftermathPath = "loan" | "credit" | "payday" | "preorder";

export interface AftermathBeat {
  /** Speaker shown in the dialogue header. */
  readonly speaker: string;
  /** Dialogue lines, shown in order. Short — this is a beat, not a scene. */
  readonly lines: readonly string[];
  /** One-line takeaway in the curriculum voice (shown beneath the dialogue). */
  readonly lesson: string;
}

export const AFTERMATH_BEATS: Readonly<Record<AftermathPath, AftermathBeat>> = {
  loan: {
    speaker: "Old Joe",
    lines: [
      "\"Paid in full, and early enough to matter. That's how you treat debt — a tool you put down when the job's done.\"",
      "\"My uncle used to say: borrow calm, repay proud. You did both.\"",
    ],
    lesson: "Cheap, transparent debt repaid on schedule builds creditworthiness — trust you can draw on later.",
  },
  credit: {
    speaker: "Marta",
    lines: [
      "\"Settled up, see? I told the co-op you were good for it.\"",
      "\"That's how supplier credit works around here — quiet favors, loudly repaid.\"",
    ],
    lesson: "Trade credit runs on relationships: repaying net terms on time IS your reputation.",
  },
  payday: {
    speaker: "Old Joe",
    lines: [
      "\"QuickNut's off your back. Look at the receipt one more time — that fee bought you nothing but time.\"",
      "\"No shame in it. Just remember what that time cost, next time you price your options.\"",
    ],
    lesson: "High-fee advances are the most expensive time you can buy — compare the real APR first.",
  },
  preorder: {
    speaker: "Derek",
    lines: [
      "\"Whole office is eating peanuts. Delivered in full, on the day. That's why I pre-paid.\"",
      "\"Same arrangement next crunch? You've earned the call.\"",
    ],
    lesson: "B2B pre-orders trade execution risk for upfront cash — deliver in full and the channel stays open.",
  },
} as const;
