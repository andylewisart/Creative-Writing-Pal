// Sound, speech, confetti, and Sparky the dragon.

import { get } from "./state.js";
import { canSpeakAI, speechAudio } from "./ai.js";
import { logEvent } from "./log.js";

// ---------- Sound (tiny synth, no audio files) ----------
let ctx = null;
function audio() {
  if (!get().settings.sound) return null;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, start, dur, type = "sine", vol = 0.12) {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

export const sfx = {
  click: () => tone(660, 0, 0.08, "triangle", 0.06),
  gem: () => {
    tone(1046, 0, 0.12, "triangle");
    tone(1568, 0.07, 0.18, "triangle");
  },
  spell: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.25, "sine", 0.1)),
  level: () => [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.1, 0.35, "square", 0.05)),
  fizzle: () => [400, 300].forEach((f, i) => tone(f, i * 0.12, 0.2, "sawtooth", 0.04)),
  chomp: () => [180, 140, 200].forEach((f, i) => tone(f, i * 0.09, 0.08, "square", 0.05)),
};

// ---------- Speech ----------
// Read-aloud uses OpenAI's voice (gpt-4o-mini-tts) when an OpenAI key is
// available, and the browser's built-in voice otherwise or if that fails.
let voice = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang?.startsWith("en"));
  return (
    voices.find((v) => /natural|neural|premium|enhanced/i.test(v.name)) ||
    voices.find((v) => /samantha|google us english|aria|jenny/i.test(v.name)) ||
    voices[0] ||
    null
  );
}
if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => (voice = pickVoice());
}

// One shared player, unlocked on the first tap so iPads allow read-aloud
// to start later on its own (for example when a new chapter arrives).
const player = typeof Audio !== "undefined" ? new Audio() : null;
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
if (player && typeof document !== "undefined") {
  const unlock = () => {
    player.src = SILENCE;
    player.play().catch(() => {});
    document.removeEventListener("pointerdown", unlock, true);
  };
  document.addEventListener("pointerdown", unlock, true);
}

const audioCache = new Map(); // "style|text" -> object URL, so replays are free
let playId = 0; // bumps on every new speak/stop, so stale chunks never play

export const canSpeak = () => "speechSynthesis" in window || canSpeakAI();

// Split long text into chunks the speech API accepts, on sentence breaks.
function chunks(text, max = 1500) {
  const parts = [];
  let cur = "";
  for (const sentence of String(text).split(/(?<=[.!?])\s+/)) {
    if ((cur + " " + sentence).length > max && cur) {
      parts.push(cur);
      cur = sentence;
    } else cur = cur ? `${cur} ${sentence}` : sentence;
  }
  if (cur) parts.push(cur);
  return parts;
}

async function audioFor(text, style) {
  const key = `${style}|${text}`;
  if (!audioCache.has(key)) {
    const p = speechAudio(text, style).then((blob) => URL.createObjectURL(blob));
    audioCache.set(key, p);
    p.catch(() => audioCache.delete(key));
  }
  return audioCache.get(key);
}

function browserSpeak(text, { style, onend }) {
  if (!("speechSynthesis" in window)) return onend?.();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  voice = voice || pickVoice();
  if (voice) u.voice = voice;
  u.pitch = style === "trailer" ? 0.55 : 1;
  u.rate = style === "trailer" ? 0.85 : 0.95;
  u.onend = () => onend?.();
  speechSynthesis.speak(u);
}

// speak(text, { style: "story" | "trailer", onstart, onend })
export async function speak(text, { style = "story", onstart, onend } = {}) {
  stopSpeaking();
  const id = ++playId;
  if (!canSpeakAI() || !player) {
    onstart?.();
    return browserSpeak(text, { style, onend });
  }
  const parts = chunks(text);
  try {
    let next = audioFor(parts[0], style);
    for (let i = 0; i < parts.length; i++) {
      const url = await next;
      if (id !== playId) return;
      if (i + 1 < parts.length) next = audioFor(parts[i + 1], style); // fetch ahead while this plays
      player.src = url;
      await player.play();
      if (i === 0) onstart?.();
      await new Promise((resolve, reject) => {
        player.onended = resolve;
        player.onerror = reject;
        player.onpause = () => id !== playId && resolve();
      });
      if (id !== playId) return;
    }
    onend?.();
  } catch (e) {
    if (id !== playId) return;
    if (e?.name === "NotAllowedError") return onend?.(); // the browser blocked autoplay; the button still works
    logEvent("readaloud.fallback", { code: e?.code || e?.name || "error" });
    onstart?.();
    browserSpeak(text, { style, onend });
  }
}

export function stopSpeaking() {
  playId++;
  if (player && !player.paused) player.pause();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

// ---------- Confetti ----------
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function confetti(amount = 60) {
  if (reduceMotion()) return;
  const layer = document.createElement("div");
  layer.className = "confetti";
  const bits = ["✨", "💎", "⭐", "🔥", "🌟"];
  for (let i = 0; i < amount; i++) {
    const b = document.createElement("span");
    b.textContent = Math.random() < 0.5 ? bits[i % bits.length] : "";
    if (!b.textContent) b.className = "bit";
    b.style.left = Math.random() * 100 + "%";
    b.style.setProperty("--dx", (Math.random() - 0.5) * 200 + "px");
    b.style.setProperty("--rot", Math.random() * 720 + "deg");
    b.style.setProperty("--hue", Math.floor(Math.random() * 360));
    b.style.animationDelay = Math.random() * 0.4 + "s";
    b.style.animationDuration = 1.6 + Math.random() * 1.2 + "s";
    layer.appendChild(b);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3500);
}

// ---------- Sparky the dragon (drawn in SVG; grows with each level) ----------
const PALETTES = [
  { body: "#f3e3c3", belly: "#fff6e3", spots: "#ffb4a2" }, // egg
  { body: "#7bd389", belly: "#e6ffd9", wing: "#ffd23f" },
  { body: "#4fc48a", belly: "#dfffe2", wing: "#ffd23f" },
  { body: "#2ec4b6", belly: "#d9fffa", wing: "#ff9f1c" },
  { body: "#5a8dee", belly: "#e3edff", wing: "#ff5d8f" },
  { body: "#7b61ff", belly: "#efe9ff", wing: "#3ddbd9" },
  { body: "#e8553d", belly: "#ffe9c7", wing: "#ffd23f" },
];

export function sparkySvg(level = 1, mood = "happy") {
  const p = PALETTES[Math.min(level, PALETTES.length) - 1];
  const ink = "#1b1530";
  if (level <= 1) {
    return `<svg viewBox="0 0 120 120" class="sparky-svg egg" aria-hidden="true">
      <ellipse cx="60" cy="110" rx="30" ry="6" fill="rgba(0,0,0,.25)"/>
      <path d="M60 14 C86 14 98 52 98 74 C98 96 82 108 60 108 C38 108 22 96 22 74 C22 52 34 14 60 14Z" fill="${p.body}" stroke="${ink}" stroke-width="4"/>
      <circle cx="44" cy="52" r="7" fill="${p.spots}"/><circle cx="76" cy="40" r="5" fill="${p.spots}"/><circle cx="74" cy="82" r="9" fill="${p.spots}"/><circle cx="42" cy="88" r="5" fill="${p.spots}"/>
      <path d="M36 64 L46 58 L54 68 L64 58 L72 68 L84 60" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="50" cy="76" r="3.5" fill="${ink}"/><circle cx="70" cy="76" r="3.5" fill="${ink}"/>
    </svg>`;
  }
  const wings = level >= 3;
  const horns = level >= 4;
  const spikes = level >= 5;
  const stars = level >= 6;
  const crown = level >= 7;
  const wingSize = level >= 5 ? 1.25 : level >= 4 ? 1.1 : 0.85;
  const wing = `<path d="M44 70 Q${44 - 32 * wingSize} ${62 - 34 * wingSize} ${42 - 30 * wingSize} ${78 - 4 * wingSize} Q${42 - 22 * wingSize} 74 ${42 - 18 * wingSize} 84 Q${42 - 12 * wingSize} 76 44 84Z" fill="${p.wing}" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>`;
  const mouth =
    mood === "chomp"
      ? `<ellipse cx="60" cy="58" rx="8" ry="6" fill="#7a1f35" stroke="${ink}" stroke-width="3"/>`
      : mood === "wow"
        ? `<circle cx="60" cy="59" r="5" fill="#7a1f35" stroke="${ink}" stroke-width="3"/>`
        : `<path d="M50 56 Q60 66 70 56" fill="#7a1f35" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 120 120" class="sparky-svg" aria-hidden="true">
    <ellipse cx="60" cy="112" rx="34" ry="6" fill="rgba(0,0,0,.25)"/>
    ${stars ? `<path d="M14 22 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z M104 30 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z" fill="#ffd23f"/>` : ""}
    <path d="M80 96 Q108 102 106 78" fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round"/>
    <path d="M80 96 Q108 102 106 78" fill="none" stroke="${p.body}" stroke-width="6" stroke-linecap="round"/>
    <path d="M100 74 L112 70 L108 82Z" fill="${p.wing}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    ${wings ? wing + `<g transform="translate(120,0) scale(-1,1)">${wing}</g>` : ""}
    ${spikes ? `<path d="M48 60 L52 50 L58 60 L62 48 L68 60 L72 50 L76 62" fill="${p.wing}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>` : ""}
    <ellipse cx="60" cy="84" rx="25" ry="23" fill="${p.body}" stroke="${ink}" stroke-width="4"/>
    <ellipse cx="60" cy="90" rx="14" ry="14" fill="${p.belly}"/>
    <path d="M50 84 h20 M49 92 h22 M52 100 h16" stroke="${p.body}" stroke-width="2" opacity=".5"/>
    <ellipse cx="45" cy="106" rx="9" ry="5" fill="${p.body}" stroke="${ink}" stroke-width="3.5"/>
    <ellipse cx="75" cy="106" rx="9" ry="5" fill="${p.body}" stroke="${ink}" stroke-width="3.5"/>
    ${horns ? `<path d="M42 32 L34 12 L52 28Z M78 32 L86 12 L68 28Z" fill="#fff1c9" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>` : `<path d="M46 28 L44 18 L54 26Z M74 28 L76 18 L66 26Z" fill="#fff1c9" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`}
    <ellipse cx="60" cy="46" rx="27" ry="23" fill="${p.body}" stroke="${ink}" stroke-width="4"/>
    <circle cx="49" cy="42" r="8" fill="#fff" stroke="${ink}" stroke-width="3"/>
    <circle cx="71" cy="42" r="8" fill="#fff" stroke="${ink}" stroke-width="3"/>
    <circle class="pupil" cx="50" cy="43" r="4" fill="${ink}"/><circle class="pupil" cx="72" cy="43" r="4" fill="${ink}"/>
    <circle cx="48" cy="41" r="1.6" fill="#fff"/><circle cx="70" cy="41" r="1.6" fill="#fff"/>
    <ellipse cx="40" cy="53" rx="5" ry="3" fill="#ff8fab" opacity=".8"/><ellipse cx="80" cy="53" rx="5" ry="3" fill="#ff8fab" opacity=".8"/>
    <circle cx="56" cy="51" r="1.4" fill="${ink}"/><circle cx="64" cy="51" r="1.4" fill="${ink}"/>
    ${mouth}
    ${crown ? `<path d="M44 26 L46 12 L53 20 L60 8 L67 20 L74 12 L76 26Z" fill="#ffd23f" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><circle cx="60" cy="19" r="2.5" fill="#ff5d8f"/>` : ""}
  </svg>`;
}
