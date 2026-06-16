import { describe, it, expect, beforeEach } from "vitest";
import {
  buildFeedbackIssueUrl,
  canSubmitFeedback,
  recordFeedbackSubmit,
  validateFeedbackMessage,
} from "./feedback.js";

describe("buildFeedbackIssueUrl", () => {
  it("includes category and message in body", () => {
    const url = buildFeedbackIssueUrl("bug", "Roast button did nothing on day 2.", {
      day: 2,
      cash: 42.5,
      version: "0.1.0-test",
    });
    expect(url).toContain("template=playtest-feedback");
    expect(url).toMatch(/Roast(\+|%20)button/);
    expect(url).toMatch(/Day.*2/);
    expect(url).toMatch(/Category.*Bug/);
  });

  it("marks intentional breaks in title", () => {
    const url = buildFeedbackIssueUrl(
      "break-intentional",
      "I sold negative peanuts somehow lol",
      { day: 9 },
    );
    expect(url).toMatch(/Intentional(\+|%20)break/);
    expect(url).toContain("break-intentional");
  });
});

describe("validateFeedbackMessage", () => {
  it("rejects short messages", () => {
    expect(validateFeedbackMessage("too short", "")).toMatch(/20/);
  });

  it("rejects honeypot fills", () => {
    expect(
      validateFeedbackMessage("This is long enough to pass the minimum length check.", "bot"),
    ).toBe("Blocked.");
  });

  it("accepts valid input", () => {
    expect(
      validateFeedbackMessage("Tutorial step three was unclear about pricing.", ""),
    ).toBeNull();
  });
});

describe("canSubmitFeedback", () => {
  let storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void };

  beforeEach(() => {
    const map = new Map<string, string>();
    storage = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => {
        map.set(k, v);
      },
      removeItem: (k) => {
        map.delete(k);
      },
    };
  });

  it("allows first submit", () => {
    expect(canSubmitFeedback(storage, 1_000_000)).toEqual({ ok: true });
  });

  it("rate limits within five minutes", () => {
    recordFeedbackSubmit(storage, 1_000_000);
    const r = canSubmitFeedback(storage, 1_000_000 + 60_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterMs).toBeGreaterThan(0);
  });
});
