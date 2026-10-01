// Activity log: what the writer did and what the AI said back, step by step.
// Kept in this browser only, so a grown-up can review it (Grown-ups corner)
// and copy a report to tune the game around how the child really plays.

const KEY = "storyquest.activity.v1";
const MAX_EVENTS = 1500;
const MAX_TEXT = 1200;

let events = load();
let saveTimer = null;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function persist() {
  saveTimer = null;
  for (;;) {
    try {
      localStorage.setItem(KEY, JSON.stringify(events));
      return;
    } catch (e) {
      // Storage full: drop the oldest quarter and try again.
      if (e?.name !== "QuotaExceededError" || events.length < 20) return;
      events = events.slice(Math.floor(events.length / 4));
    }
  }
}

const clip = (v) => (typeof v === "string" && v.length > MAX_TEXT ? v.slice(0, MAX_TEXT) + "…" : v);

// type: short name like "quest.submit"; data: small plain values (text is clipped).
export function logEvent(type, data = {}) {
  const e = { t: Date.now(), type };
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    e[k] = Array.isArray(v) ? v.slice(0, 20).map(clip) : clip(v);
  }
  events.push(e);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  if (!saveTimer) saveTimer = setTimeout(persist, 400);
}

export const getLog = () => events;

export function clearLog() {
  events = [];
  persist();
}

// Save right away when the page is hidden (tab closed, app switched).
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && saveTimer) {
      clearTimeout(saveTimer);
      persist();
    }
  });
}
