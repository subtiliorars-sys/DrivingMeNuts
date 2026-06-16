import {
  GAME_VERSION,
  PLAYTEST_FEEDBACK_REPO,
  PLAYTEST_FEEDBACK_TEMPLATE,
} from "./urls.js";
import type { StorageLike } from "../sim/persistence.js";

export type FeedbackCategory = "bug" | "confusing" | "break-intentional" | "praise";

const RATE_KEY = "dmn_playtest_feedback_last_ms";
const RATE_MS = 5 * 60 * 1000;
const MIN_MESSAGE_LEN = 20;

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: "Bug",
  confusing: "Confusing / not fun",
  "break-intentional": "I broke it on purpose",
  praise: "Praise / worked great",
};

export interface FeedbackContext {
  day?: number;
  cash?: number;
  version?: string;
}

export function buildFeedbackIssueUrl(
  category: FeedbackCategory,
  message: string,
  context: FeedbackContext = {},
): string {
  const day = context.day ?? "?";
  const cash = context.cash !== undefined ? `$${context.cash.toFixed(2)}` : "?";
  const version = context.version ?? GAME_VERSION;
  const env =
    typeof navigator !== "undefined"
      ? `${navigator.userAgent}`
      : "unknown";

  const body = [
    `Category: ${CATEGORY_LABEL[category]}`,
    category === "break-intentional" ? "Label hint: break-intentional" : "",
    "",
    `Build: v${version}`,
    `Day: ${day}`,
    `Cash: ${cash}`,
    `Browser: ${env}`,
    "",
    "Player message:",
    message.trim(),
    "",
    "---",
    "Submitted from in-game Feedback button.",
  ]
    .filter((line, i, arr) => line !== "" || (i > 0 && arr[i - 1] !== ""))
    .join("\n");

  const title =
    category === "break-intentional"
      ? "[Playtest] Intentional break"
      : category === "praise"
        ? "[Playtest] Praise"
        : "[Playtest feedback]";

  const params = new URLSearchParams({
    template: PLAYTEST_FEEDBACK_TEMPLATE,
    title,
    body,
  });

  return `https://github.com/${PLAYTEST_FEEDBACK_REPO}/issues/new?${params.toString()}`;
}

export function canSubmitFeedback(
  storage: StorageLike,
  nowMs: number = Date.now(),
): { ok: true } | { ok: false; retryAfterMs: number } {
  const raw = storage.getItem(RATE_KEY);
  if (!raw) return { ok: true };
  const last = Number(raw);
  if (!Number.isFinite(last)) return { ok: true };
  const elapsed = nowMs - last;
  if (elapsed >= RATE_MS) return { ok: true };
  return { ok: false, retryAfterMs: RATE_MS - elapsed };
}

export function recordFeedbackSubmit(storage: StorageLike, nowMs: number = Date.now()): void {
  storage.setItem(RATE_KEY, String(nowMs));
}

export function validateFeedbackMessage(message: string, honeypot: string): string | null {
  if (honeypot.trim().length > 0) return "Blocked.";
  const trimmed = message.trim();
  if (trimmed.length < MIN_MESSAGE_LEN) {
    return `Please write at least ${MIN_MESSAGE_LEN} characters so we can act on it.`;
  }
  return null;
}

export interface FeedbackOverlayOptions {
  storage: StorageLike;
  context: FeedbackContext;
  onClose: () => void;
}

let activeRoot: HTMLDivElement | null = null;

export function closeFeedbackOverlay(): void {
  if (activeRoot?.parentElement) {
    activeRoot.parentElement.removeChild(activeRoot);
  }
  activeRoot = null;
}

export function openFeedbackOverlay(options: FeedbackOverlayOptions): void {
  closeFeedbackOverlay();

  const { storage, context, onClose } = options;
  const root = document.createElement("div");
  activeRoot = root;
  root.id = "dmn-feedback-overlay";
  root.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:10000",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "background:rgba(44,36,22,0.65)",
    "font-family:monospace",
  ].join(";");

  const panel = document.createElement("div");
  panel.style.cssText = [
    "width:min(420px,92vw)",
    "max-height:90vh",
    "overflow:auto",
    "background:#F5DEB3",
    "border:2px solid #8B6F47",
    "border-radius:4px",
    "padding:14px",
    "color:#2C2416",
    "box-sizing:border-box",
  ].join(";");

  const title = document.createElement("h2");
  title.textContent = "Playtest feedback";
  title.style.cssText = "margin:0 0 8px;font-size:16px;";
  panel.appendChild(title);

  const hint = document.createElement("p");
  hint.textContent =
    "Opens GitHub in a new tab with your note pre-filled. One submit per 5 minutes.";
  hint.style.cssText = "margin:0 0 10px;font-size:11px;line-height:1.4;";
  panel.appendChild(hint);

  const catLabel = document.createElement("label");
  catLabel.textContent = "Category";
  catLabel.style.cssText = "display:block;font-size:11px;margin-bottom:4px;";
  panel.appendChild(catLabel);

  const select = document.createElement("select");
  select.style.cssText =
    "width:100%;margin-bottom:10px;padding:6px;font-family:monospace;font-size:12px;";
  (
    [
      ["bug", "Bug — something broke"],
      ["confusing", "Confusing — I got stuck"],
      ["break-intentional", "I broke it on purpose (fun)"],
      ["praise", "Praise — this worked well"],
    ] as const
  ).forEach(([value, label]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  });
  panel.appendChild(select);

  const msgLabel = document.createElement("label");
  msgLabel.textContent = "What happened?";
  msgLabel.style.cssText = "display:block;font-size:11px;margin-bottom:4px;";
  panel.appendChild(msgLabel);

  const textarea = document.createElement("textarea");
  textarea.rows = 5;
  textarea.placeholder = "Steps to reproduce, or what felt confusing…";
  textarea.style.cssText =
    "width:100%;box-sizing:border-box;padding:8px;font-family:monospace;font-size:12px;margin-bottom:8px;";
  panel.appendChild(textarea);

  const honeypot = document.createElement("input");
  honeypot.type = "text";
  honeypot.name = "company";
  honeypot.tabIndex = -1;
  honeypot.autocomplete = "off";
  honeypot.setAttribute("aria-hidden", "true");
  honeypot.style.cssText = "position:absolute;left:-9999px;height:0;opacity:0;";
  panel.appendChild(honeypot);

  const err = document.createElement("p");
  err.style.cssText = "margin:0 0 8px;font-size:11px;color:#C0392B;min-height:14px;";
  panel.appendChild(err);

  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText =
    "padding:8px 12px;font-family:monospace;cursor:pointer;background:#556677;color:#F5DEB3;border:1px solid #8B6F47;";

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.textContent = "Open GitHub form";
  submitBtn.style.cssText =
    "padding:8px 12px;font-family:monospace;cursor:pointer;background:#FF9800;color:#2C2416;border:1px solid #8B6F47;font-weight:bold;";

  const finish = () => {
    closeFeedbackOverlay();
    onClose();
  };

  cancelBtn.onclick = finish;
  root.onclick = (ev) => {
    if (ev.target === root) finish();
  };

  submitBtn.onclick = () => {
    const rate = canSubmitFeedback(storage);
    if (!rate.ok) {
      const mins = Math.ceil(rate.retryAfterMs / 60_000);
      err.textContent = `Please wait ~${mins} min before another report.`;
      return;
    }
    const validation = validateFeedbackMessage(textarea.value, honeypot.value);
    if (validation) {
      err.textContent = validation;
      return;
    }
    const category = select.value as FeedbackCategory;
    const url = buildFeedbackIssueUrl(category, textarea.value, context);
    recordFeedbackSubmit(storage);
    window.open(url, "_blank", "noopener,noreferrer");
    finish();
  };

  row.appendChild(cancelBtn);
  row.appendChild(submitBtn);
  panel.appendChild(row);
  root.appendChild(panel);
  document.body.appendChild(root);
  textarea.focus();
}

export function openExternalUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
