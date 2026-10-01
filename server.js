// Story Quest server: serves the game and talks to OpenAI with your API key.
//   OPENAI_API_KEY=sk-proj-... npm start   ->  http://localhost:3000
// One key runs everything: stories and coaching, painted creature art, and
// the voice coach. Without a key the game runs in "practice magic" mode.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { TASKS } from "./public/js/prompts.js";
import { DEFAULTS, runTextTask, paintCreature, createVoiceSession, synthesizeSpeech, SPEECH_STYLES, SPEECH_MAX_CHARS } from "./public/js/engine.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, "public");

loadDotEnv(path.join(here, ".env"));

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const MODEL = process.env.STORY_QUEST_MODEL || DEFAULTS.model;
const EFFORT = process.env.STORY_QUEST_EFFORT || DEFAULTS.effort;
const openai = process.env.OPENAI_API_KEY ? new OpenAI() : null;
const live = Boolean(openai);
const writer = { openai, OpenAI, model: MODEL, effort: EFFORT };

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || DEFAULTS.imageModel;
const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || DEFAULTS.imageQuality;
const painter = {
  openai,
  OpenAI,
  model: IMAGE_MODEL,
  quality: IMAGE_QUALITY,
  size: process.env.OPENAI_IMAGE_SIZE || DEFAULTS.imageSize,
};
const PAINTS_PER_DAY = Number(process.env.PAINTS_PER_DAY) || 25;
const voice = { openai, OpenAI, model: process.env.OPENAI_VOICE_MODEL || DEFAULTS.voiceModel, voice: process.env.OPENAI_VOICE || DEFAULTS.voiceName };
const VOICE_SESSIONS_PER_DAY = Number(process.env.VOICE_SESSIONS_PER_DAY) || 20;
const voiceCount = { day: "", n: 0 };
const paintCount = { day: "", n: 0 };

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function readBody(req, limit = 200_000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > limit) reject(Object.assign(new Error("Request too large"), { status: 413 }));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function handleAI(req, res) {
  let task, payload;
  try {
    ({ task, payload } = JSON.parse(await readBody(req)));
  } catch (e) {
    return send(res, e.status || 400, { error: "Bad request body" });
  }
  if (!Object.hasOwn(TASKS, task) || typeof payload !== "object" || !payload) {
    return send(res, 400, { error: "Unknown task" });
  }
  if (!live) return send(res, 503, { error: "No OPENAI_API_KEY set", code: "not_granted" });

  const started = Date.now();
  try {
    const result = await runTextTask(writer, task, payload);
    console.log(`${task} ok in ${Date.now() - started}ms`);
    send(res, 200, result);
  } catch (e) {
    console.error(`${task} failed:`, e.message);
    send(res, e.status && e.status < 600 ? e.status : 500, { error: e.message, code: e.code || "default" });
  }
}

async function handlePaint(req, res) {
  if (!openai) return send(res, 503, { error: "No OPENAI_API_KEY set", code: "not_granted" });
  let creature;
  try {
    ({ creature } = JSON.parse(await readBody(req, 20_000)));
  } catch (e) {
    return send(res, e.status || 400, { error: "Bad request body" });
  }
  if (!creature || typeof creature.description !== "string" || !creature.description.trim()) {
    return send(res, 400, { error: "Missing creature description" });
  }
  // A daily cap so a tap-happy artist can't run up the bill.
  const today = new Date().toISOString().slice(0, 10);
  if (paintCount.day !== today) Object.assign(paintCount, { day: today, n: 0 });
  if (paintCount.n >= PAINTS_PER_DAY) {
    return send(res, 429, { error: `Daily painting limit (${PAINTS_PER_DAY}) reached`, code: "paint_limit" });
  }
  paintCount.n += 1;

  const started = Date.now();
  try {
    const b64 = await paintCreature(painter, creature);
    console.log(`paint ok in ${Date.now() - started}ms (${paintCount.n}/${PAINTS_PER_DAY} today)`);
    send(res, 200, { image: `data:image/jpeg;base64,${b64}` });
  } catch (e) {
    paintCount.n -= 1;
    console.error("paint failed:", e.message);
    send(res, e.status && e.status < 600 ? e.status : 500, { error: e.message, code: e.code || "default" });
  }
}

async function handleVoice(req, res) {
  if (!openai) return send(res, 503, { error: "No OPENAI_API_KEY set", code: "not_granted" });
  let ctx;
  try {
    ({ ctx } = JSON.parse(await readBody(req, 20_000)));
  } catch (e) {
    return send(res, e.status || 400, { error: "Bad request body" });
  }
  if (!ctx || typeof ctx.where !== "string") return send(res, 400, { error: "Missing context" });
  const today = new Date().toISOString().slice(0, 10);
  if (voiceCount.day !== today) Object.assign(voiceCount, { day: today, n: 0 });
  if (voiceCount.n >= VOICE_SESSIONS_PER_DAY) {
    return send(res, 429, { error: `Daily voice limit (${VOICE_SESSIONS_PER_DAY}) reached`, code: "voice_limit" });
  }
  try {
    const session = await createVoiceSession(voice, ctx);
    voiceCount.n += 1;
    console.log(`voice session started (${voiceCount.n}/${VOICE_SESSIONS_PER_DAY} today)`);
    send(res, 200, session);
  } catch (e) {
    console.error("voice failed:", e.message);
    send(res, e.status && e.status < 600 ? e.status : 500, { error: e.message, code: e.code || "default" });
  }
}

async function handleSpeech(req, res) {
  if (!openai) return send(res, 503, { error: "No OPENAI_API_KEY set", code: "not_granted" });
  let text, style;
  try {
    ({ text, style } = JSON.parse(await readBody(req, 20_000)));
  } catch (e) {
    return send(res, e.status || 400, { error: "Bad request body" });
  }
  if (typeof text !== "string" || !text.trim() || text.length > SPEECH_MAX_CHARS || !Object.hasOwn(SPEECH_STYLES, style || "story")) {
    return send(res, 400, { error: "Bad speech request" });
  }
  try {
    const audio = await synthesizeSpeech({ openai, OpenAI }, { text, style });
    res.writeHead(200, { "content-type": "audio/mpeg", "cache-control": "no-store" });
    res.end(Buffer.from(audio));
  } catch (e) {
    console.error("speech failed:", e.message);
    send(res, e.status && e.status < 600 ? e.status : 500, { error: e.message, code: e.code || "default" });
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("Not found");
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname === "/api/status" && req.method === "GET") {
    return send(res, 200, { live, model: live ? MODEL : null, paint: Boolean(openai), voice: Boolean(openai) });
  }
  if (pathname === "/api/ai" && req.method === "POST") return handleAI(req, res);
  if (pathname === "/api/paint" && req.method === "POST") return handlePaint(req, res);
  if (pathname === "/api/voice" && req.method === "POST") return handleVoice(req, res);
  if (pathname === "/api/speech" && req.method === "POST") return handleSpeech(req, res);
  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res);
  res.writeHead(405);
  res.end();
});

server.listen(PORT, HOST, () => {
  console.log(`\n  🐉 Story Quest is running at http://localhost:${PORT}`);
  console.log(live ? `  ✨ Real magic: ${MODEL} (${EFFORT} thinking), ${IMAGE_MODEL} paintings, voice coach on` : "  🪄 Practice magic: set OPENAI_API_KEY to turn on real AI");
  console.log("  (Other devices on your Wi-Fi can use this computer's IP address and the same port.)\n");
});
