// One door to the AI, three possible backends:
//  1. "claude"  - running as a claude.ai artifact: asks Claude on the viewer's account.
//  2. "server"  - running from server.js with an API key: POST /api/ai.
//  3. "practice" - nothing connected: simple word-pattern magic (demo.js).

import { NORMALIZE, TASKS, fullPrompt } from "./prompts.js";
import { demoReply } from "./demo.js";

let backend = null; // { kind, sample? }
let detecting = null;

export function detectBackend() {
  if (detecting) return detecting;
  detecting = (async () => {
    if (window.claude?.use) {
      try {
        const sample = await window.claude.use("sample");
        if (sample) return (backend = { kind: "claude", sample });
      } catch {
        /* fall through */
      }
    }
    try {
      const res = await fetch("api/status", { headers: { accept: "application/json" } });
      if (res.ok) {
        const info = await res.json();
        if (info.live) return (backend = { kind: "server" });
      }
    } catch {
      /* fall through */
    }
    return (backend = { kind: "practice" });
  })();
  return detecting;
}

export function backendKind() {
  return backend?.kind || "detecting";
}

export class AIError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const KID_MESSAGES = {
  not_granted: "Sparky needs a grown-up to say yes before the real magic works. Practice magic is on for now!",
  rate_limited: "Whew, Sparky is out of breath! Wait a minute, then try again.",
  refused: "Sparky got confused by that one. Try writing it a different way!",
  network: "The magic signal got lost. Check the internet and try again!",
  default: "Oops! A spell fizzled. Tap the button to try again.",
};

export function kidMessage(err) {
  return KID_MESSAGES[err?.code] || KID_MESSAGES.default;
}

// Ask the AI to do one task. Always resolves to a normalized reply object.
export async function ask(task, payload) {
  await detectBackend();
  let raw;
  if (backend.kind === "practice") {
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 700));
    raw = demoReply(task, payload);
  } else if (backend.kind === "claude") {
    try {
      raw = await backend.sample.json(fullPrompt(task, payload), {
        modelTier: TASKS[task].tier,
        cache: false,
      });
    } catch (e) {
      const code = e?.code || "default";
      if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(code)) {
        // Claude can't be used in this view: switch to practice magic.
        backend = { kind: "practice" };
        raw = demoReply(task, payload);
        raw.__switchedToPractice = true;
      } else {
        throw new AIError(code, e?.message || "sample failed");
      }
    }
  } else {
    let res;
    try {
      res = await fetch("api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task, payload }),
      });
    } catch (e) {
      throw new AIError("network", e.message);
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new AIError(body.code || "default", body.error || `HTTP ${res.status}`);
    raw = body;
  }
  const clean = NORMALIZE[task](raw || {});
  if (raw?.__switchedToPractice) clean.switchedToPractice = true;
  return clean;
}
