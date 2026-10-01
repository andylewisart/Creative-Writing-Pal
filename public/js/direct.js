// github.io build: call Claude and the image model straight from the browser,
// using the keys a grown-up saved on this device. Only loaded in that build.

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { runClaudeTask, paintCreature, createVoiceSession, TaskError } from "./engine.js";
import { getKeys } from "./keys.js";

const PAINTS_PER_DAY = 25;
const PAINT_COUNT_KEY = "storyquest.paints.v1";

let cache = { stamp: null };
function clients() {
  const keys = getKeys();
  const stamp = `${keys.anthropic || ""}|${keys.openai || ""}`;
  if (stamp !== cache.stamp) {
    cache = {
      stamp,
      claude: keys.anthropic
        ? { client: new Anthropic({ apiKey: keys.anthropic, dangerouslyAllowBrowser: true }), Anthropic, state: { useFallbacks: true } }
        : null,
      painter: keys.openai ? { openai: new OpenAI({ apiKey: keys.openai, dangerouslyAllowBrowser: true }), OpenAI } : null,
    };
  }
  return cache;
}

export async function directAsk(task, payload) {
  const { claude } = clients();
  if (!claude) throw new TaskError("bad_key", "No Anthropic key saved");
  return runClaudeTask(claude, task, payload);
}

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
  const { painter } = clients();
  if (!painter) throw new TaskError("bad_key", "No OpenAI key saved");
  if (paintsToday() >= PAINTS_PER_DAY) throw new TaskError("paint_limit", "Daily painting limit reached");
  paintsToday(+1);
  try {
    return `data:image/jpeg;base64,${await paintCreature(painter, creature)}`;
  } catch (e) {
    paintsToday(-1);
    throw e;
  }
}

export async function directVoiceSession(ctx) {
  const { painter } = clients();
  if (!painter) throw new TaskError("bad_key", "No OpenAI key saved");
  return createVoiceSession({ openai: painter.openai, OpenAI }, ctx);
}

// Free checks (listing models costs nothing) so a grown-up knows the keys work.
export async function checkKeys() {
  const { claude, painter } = clients();
  const check = async (fn, Klass) => {
    try {
      await fn();
      return "ok";
    } catch (e) {
      if (e instanceof Klass.AuthenticationError || e instanceof Klass.PermissionDeniedError) return "bad";
      return "unreachable";
    }
  };
  return {
    anthropic: claude ? await check(() => claude.client.models.list({ limit: 1 }), Anthropic) : "none",
    openai: painter ? await check(() => painter.openai.models.list(), OpenAI) : "none",
  };
}
