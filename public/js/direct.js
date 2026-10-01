// github.io build: call OpenAI straight from the browser, using the key a
// grown-up saved on this device. Only loaded in that build.

import OpenAI from "openai";
import { runTextTask, paintCreature, createVoiceSession, TaskError } from "./engine.js";
import { getKeys } from "./keys.js";

const PAINTS_PER_DAY = 25;
const PAINT_COUNT_KEY = "storyquest.paints.v1";

let cache = { key: null, openai: null };
function client() {
  const key = getKeys().openai || null;
  if (key !== cache.key) cache = { key, openai: key ? new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true }) : null };
  if (!cache.openai) throw new TaskError("bad_key", "No OpenAI key saved");
  return { openai: cache.openai, OpenAI };
}

export const directAsk = (task, payload) => runTextTask(client(), task, payload);

// Same daily cap as the server, counted in this browser.
function paintsToday(add = 0) {
  const today = new Date().toISOString().slice(0, 10);
  let rec = { day: today, n: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(PAINT_COUNT_KEY));
    if (saved?.day === today) rec = saved;
    rec.n = Math.max(0, rec.n + add);
    if (add) localStorage.setItem(PAINT_COUNT_KEY, JSON.stringify(rec));
  } catch {
    /* storage blocked: no cap tracking */
  }
  return rec.n;
}

export async function directPaint(creature) {
  const c = client();
  if (paintsToday() >= PAINTS_PER_DAY) throw new TaskError("paint_limit", "Daily painting limit reached");
  paintsToday(+1);
  try {
    return `data:image/jpeg;base64,${await paintCreature(c, creature)}`;
  } catch (e) {
    paintsToday(-1);
    throw e;
  }
}

export const directVoiceSession = (ctx) => createVoiceSession(client(), ctx);

// A free check (listing models costs nothing) so a grown-up knows the key works.
export async function checkKey() {
  let c;
  try {
    c = client();
  } catch {
    return "none";
  }
  try {
    await c.openai.models.list();
    return "ok";
  } catch (e) {
    if (e instanceof OpenAI.AuthenticationError || e instanceof OpenAI.PermissionDeniedError) return "bad";
    return "unreachable";
  }
}
