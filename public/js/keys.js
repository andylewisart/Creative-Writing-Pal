// API keys a grown-up saved on this device (github.io build only).
// They live in this browser's storage and are sent only to Anthropic and OpenAI.

const KEY = "storyquest.keys.v1";

// Set by scripts/build-pages.mjs; undefined everywhere else.
export const IS_STATIC_SITE = typeof __STATIC_SITE__ !== "undefined";

export function getKeys() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function setKeys(keys) {
  try {
    const clean = Object.fromEntries(Object.entries(keys).filter(([, v]) => v));
    if (Object.keys(clean).length) localStorage.setItem(KEY, JSON.stringify(clean));
    else localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

export const maskKey = (k) => (k ? `…${k.slice(-4)}` : "");
