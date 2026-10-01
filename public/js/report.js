// Turns the activity log into sessions and a readable timeline, for the
// Grown-ups corner and for a report a grown-up can paste to Claude.

import { getLog } from "./log.js";
import { get } from "./state.js";
import { spellById } from "./spells.js";

const GAP = 30 * 60 * 1000; // a new session after 30 quiet minutes

const q = (t) => `"${String(t ?? "").replace(/\s+/g, " ").trim()}"`;
const spells = (ids) => (ids?.length ? ids.map((id) => spellById[id]?.name || id).join(", ") : "none");
const time = (t) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// One readable line per event; null hides noise from the timeline.
export function describe(e) {
  switch (e.type) {
    case "app.open": return `Opened the game (${e.backend === "practice" ? "practice magic, no AI" : `AI: ${e.backend}`})`;
    case "screen": return e.name === "hub" ? null : `Went to ${e.name}${e.tab ? ` (${e.tab})` : ""}`;
    case "quest.start": return `Started a Story Quest: ${e.world}, hero ${q(e.hero)} (${e.kind}), power ${q(e.power)}`;
    case "quest.submit": return `WROTE part ${e.turn}/${e.of} (${e.words} words${e.secs ? `, ${e.secs}s` : ""}): ${q(e.text)}`;
    case "quest.too_short": return `Tried to send too little: ${q(e.text)}`;
    case "quest.react": return `  Sparky: ${q(e.cheer)} | spells: ${spells(e.spells)}${e.bonusDone ? " | bonus done" : ""}`;
    case "powerup.shown": return `  Power-up${e.attempt > 1 ? ` (try ${e.attempt}, with frame ${q(e.frame)})` : ""}: ${q(e.question)} on sentence ${q(e.target)}`;
    case "powerup.try": return `  REVISED try ${e.attempt}: ${q(e.before)} -> ${q(e.after)} => ${!e.changed ? "no change" : e.woven ? "woven in" : "tacked on"}${e.spells?.length ? ` | spells: ${spells(e.spells)}` : ""}`;
    case "powerup.skip": return `  Skipped the power-up (try ${e.attempt}${e.secs ? `, after ${e.secs}s` : ""})`;
    case "quest.chapter": return `  Story continued (turn ${e.turn})`;
    case "quest.finish": return `FINISHED a book: ${q(e.title)}, ${e.words} words, ${e.spells} spells, ${e.mins} min. Favorite line: ${q(e.favoriteLine)}`;
    case "quest.abandon": return `Abandoned a story at part ${e.turn}: ${q(e.title)}`;
    case "spark": return `  Used the idea crystal${e.draft ? ` (draft ${q(e.draft)})` : ""}`;
    case "readaloud": return `  Listened to read-aloud`;
    case "epic.try": return `EPIC try ${e.tryNo} on ${q(e.boring)}: ${q(e.text)} => ${e.score}/10 (spells: ${spells(e.spells)})`;
    case "epic.trailer": return `  Played the movie-trailer voice`;
    case "creature.create": return `CREATURE (${e.words} words, ${e.rarity}): ${q(e.description)}`;
    case "creature.evolve": return `  Evolved ${e.name} (+${e.words} words, ${e.was} -> ${e.rarity}): ${q(e.addition)}`;
    case "creature.paint": return `  Painting (${e.tier}): ${e.ok ? "done" : `failed (${e.code})`}`;
    case "voice.start": return `VOICE coach started (${e.where})`;
    case "voice.said": return `  Said out loud: ${q(e.text)}`;
    case "voice.coach": return `  Coach said: ${q(e.text)}`;
    case "voice.end": return `  Voice coach ended after ${e.secs}s (${e.reason})`;
    case "voice.error": return `  Voice coach problem: ${e.code}`;
    case "ai.error": return `  !! AI error on ${e.task}: ${e.code}`;
    case "error": return `  !! Problem in ${e.where}: ${e.code}`;
    default: return null;
  }
}

export function sessions(events = getLog()) {
  const out = [];
  for (const e of events) {
    const last = out[out.length - 1];
    if (!last || e.t - last.end > GAP) out.push({ start: e.t, end: e.t, events: [e] });
    else {
      last.end = e.t;
      last.events.push(e);
    }
  }
  return out.map((s) => {
    const of = (type) => s.events.filter((e) => e.type === type);
    const writes = of("quest.submit");
    const tries = of("powerup.try");
    return {
      ...s,
      mins: Math.max(1, Math.round((s.end - s.start) / 60000)),
      parts: writes.length,
      avgWords: writes.length ? Math.round(writes.reduce((n, e) => n + (e.words || 0), 0) / writes.length) : 0,
      powerUps: { woven: tries.filter((e) => e.woven).length, tacked: tries.filter((e) => e.changed && !e.woven).length, skipped: of("powerup.skip").length },
      epic: of("epic.try").length,
      creatures: of("creature.create").length + of("creature.evolve").length,
      voiceSecs: of("voice.end").reduce((n, e) => n + (e.secs || 0), 0),
      errors: of("ai.error").length + of("error").length + of("voice.error").length,
    };
  });
}

export function summaryLine(s) {
  const bits = [`${s.mins} min`];
  if (s.parts) bits.push(`${s.parts} story parts (avg ${s.avgWords} words)`);
  const p = s.powerUps;
  if (p.woven + p.tacked + p.skipped) bits.push(`power-ups: ${p.woven} woven in, ${p.tacked} tacked on, ${p.skipped} skipped`);
  if (s.epic) bits.push(`${s.epic} epic tries`);
  if (s.creatures) bits.push(`${s.creatures} creature writes`);
  if (s.voiceSecs) bits.push(`${Math.round(s.voiceSecs / 60)} min voice`);
  if (s.errors) bits.push(`${s.errors} errors`);
  return bits.join(" · ");
}

// Plain-text report for pasting into a chat with Claude.
export function buildReport({ maxSessions = 5 } = {}) {
  const st = get();
  const recent = sessions().slice(-maxSessions);
  const lines = [
    `STORY QUEST ACTIVITY REPORT (${new Date().toLocaleString()})`,
    `Writer: ${st.writerName || "?"} · gems ${st.gems} · books ${st.stories.length} · creatures ${st.creatures.length}`,
    `Spell totals: ${Object.entries(st.spellCounts).map(([id, n]) => `${spellById[id]?.name || id} ${n}`).join(", ")}`,
    `Settings: ${st.settings.questTurns} story turns, read-aloud ${st.settings.readAloud ? "on" : "off"}`,
    "",
  ];
  for (const s of recent) {
    lines.push(`=== Session ${new Date(s.start).toLocaleString()} — ${summaryLine(s)}`);
    for (const e of s.events) {
      const d = describe(e);
      if (d) lines.push(`[${time(e.t)}] ${d}`);
    }
    lines.push("");
  }
  if (!recent.length) lines.push("(No activity recorded yet.)");
  return lines.join("\n");
}
