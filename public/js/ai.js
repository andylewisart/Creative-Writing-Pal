// One door to the AI, three possible backends:
//  1. "claude"  - running as a claude.ai artifact: asks Claude on the viewer's account.
//  2. "server"  - running from server.js with an OpenAI key: POST /api/ai.
//  3. "direct"  - github.io build with an OpenAI key saved on this device: calls OpenAI from the browser.
//  4. "practice" - nothing connected: simple word-pattern magic (demo.js).

import { NORMALIZE, TASKS, fullPrompt } from "./prompts.js";
import { demoReply } from "./demo.js";
import { IS_STATIC_SITE, getKeys } from "./keys.js";
import { logEvent } from "./log.js";

let backend = null; // { kind, sample? }
let paintOn = false; // server has an image-model key
let voiceOn = false; // an OpenAI key is available for the voice coach
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
    if (IS_STATIC_SITE) {
      const keys = getKeys();
      paintOn = Boolean(keys.openai);
      voiceOn = Boolean(keys.openai);
      return (backend = { kind: keys.openai ? "direct" : "practice" });
    }
    try {
      const res = await fetch("api/status", { headers: { accept: "application/json" } });
      if (res.ok) {
        const info = await res.json();
        paintOn = info.paint === true;
        voiceOn = info.voice === true;
        if (info.live) return (backend = { kind: "server" });
      }
    } catch {
      /* fall through */
    }
    return (backend = { kind: "practice" });
  })();
  return detecting;
}

export const canPaint = () => paintOn;

// The voice coach needs an OpenAI key and a microphone. claude.ai pages
// can't use the microphone, so it never shows there.
export const canTalk = () =>
  voiceOn && !window.claude && Boolean(navigator.mediaDevices?.getUserMedia) && typeof RTCPeerConnection !== "undefined";

// Call after a grown-up saves or removes keys.
export function resetBackend() {
  backend = null;
  detecting = null;
  paintOn = false;
  voiceOn = false;
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
  voice_limit: "Sparky has talked so much today that his voice is tired! Let's write instead, and talk again tomorrow.",
  no_mic: "Sparky can't hear you! A grown-up needs to allow the microphone for this page.",
  bad_key: "Sparky's magic key isn't working. Ask a grown-up to check the Grown-ups corner!",
  paint_limit: "The Creature Artist has painted so much today that the paint ran out! Come back tomorrow.",
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
  const started = Date.now();
  try {
    const out = await askOnce(task, payload);
    logEvent("ai.call", { task, backend: backend.kind, ms: Date.now() - started });
    return out;
  } catch (e) {
    logEvent("ai.error", { task, backend: backend?.kind, code: e.code, msg: e.message, ms: Date.now() - started });
    throw e;
  }
}

async function askOnce(task, payload) {
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
  } else if (backend.kind === "direct") {
    const { directAsk } = await import("./direct.js");
    try {
      raw = await directAsk(task, payload);
    } catch (e) {
      throw new AIError(e.code === "not_granted" ? "bad_key" : e.code || "default", e.message);
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

// Ask the server's image model to paint a creature. Resolves to a small
// data: URL (shrunk in the browser so lots of cards fit in saved progress).
export async function paint(creature) {
  if (IS_STATIC_SITE) {
    const { directPaint } = await import("./direct.js");
    try {
      return shrink(await directPaint(creature), 512);
    } catch (e) {
      throw new AIError(e.code === "not_granted" ? "bad_key" : e.code || "default", e.message);
    }
  }
  let res;
  try {
    res = await fetch("api/paint", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ creature }),
    });
  } catch (e) {
    throw new AIError("network", e.message);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.image) throw new AIError(body.code || "default", body.error || `HTTP ${res.status}`);
  return shrink(body.image, 512);
}

function shrink(src, size) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, size / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const webp = c.toDataURL("image/webp", 0.82);
        resolve(webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/jpeg", 0.82));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

// OpenAI read-aloud is available wherever the OpenAI key is (not on claude.ai).
export const canSpeakAI = () => voiceOn && !window.claude;

// Read-aloud audio for `text` as an MP3 Blob. Throws AIError on failure.
export async function speechAudio(text, style = "story") {
  if (IS_STATIC_SITE) {
    const { directSpeech } = await import("./direct.js");
    try {
      return new Blob([await directSpeech(text, style)], { type: "audio/mpeg" });
    } catch (e) {
      throw new AIError(e.code === "not_granted" ? "bad_key" : e.code || "default", e.message);
    }
  }
  let res;
  try {
    res = await fetch("api/speech", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, style }) });
  } catch (e) {
    throw new AIError("network", e.message);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new AIError(body.code || "default", body.error || `HTTP ${res.status}`);
  }
  return res.blob();
}

// Start a voice-coach session: returns { value: short-lived key, model }.
export async function voiceSession(ctx) {
  if (IS_STATIC_SITE) {
    const { directVoiceSession } = await import("./direct.js");
    try {
      return await directVoiceSession(ctx);
    } catch (e) {
      throw new AIError(e.code === "not_granted" ? "bad_key" : e.code || "default", e.message);
    }
  }
  let res;
  try {
    res = await fetch("api/voice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ctx }) });
  } catch (e) {
    throw new AIError("network", e.message);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.value) throw new AIError(body.code || "default", body.error || `HTTP ${res.status}`);
  return body;
}
