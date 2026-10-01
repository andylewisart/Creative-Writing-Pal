// The player's saved progress (kept in this browser's local storage).

import { SPELL_IDS } from "./spells.js";

const KEY = "storyquest.v1";

export const STAGES = [
  { min: 0, name: "Mystery Egg" },
  { min: 60, name: "Hatchling" },
  { min: 200, name: "Little Flame" },
  { min: 450, name: "Sky Glider" },
  { min: 800, name: "Storm Dragon" },
  { min: 1300, name: "Star Dragon" },
  { min: 2000, name: "Legendary Word Dragon" },
];

function fresh() {
  return {
    writerName: "",
    gems: 0,
    spellCounts: Object.fromEntries(SPELL_IDS.map((id) => [id, 0])),
    stories: [], // finished books
    activeQuest: null, // quest in progress
    creatures: [],
    epicBest: 0,
    log: [], // {t, mode, words, spells} one entry per thing written, for the grown-ups page
    settings: { questTurns: 5, sound: true, readAloud: true, voiceTips: true, voice: true, voiceMinutes: 20 },
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const base = fresh();
      return {
        ...base,
        ...saved,
        spellCounts: { ...base.spellCounts, ...saved.spellCounts },
        settings: { ...base.settings, ...saved.settings },
      };
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return fresh();
}

export function save() {
  for (;;) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      break;
    } catch (e) {
      // Storage full? Paintings are the big items: drop the oldest one
      // (its sketch stays) and try again, so gems and books are never lost.
      const painted = state.creatures.filter((c) => c.painting);
      if (e?.name !== "QuotaExceededError" || !painted.length) break; // storage unavailable: this visit only
      const oldest = painted[painted.length - 1];
      oldest.painting = null;
      oldest.paintedLevel = 0;
    }
  }
  listeners.forEach((fn) => fn(state));
}

export const get = () => state;
export const onChange = (fn) => listeners.add(fn);

export function update(fn) {
  fn(state);
  save();
}

export function resetAll() {
  const settings = state.settings;
  state = fresh();
  state.settings = settings;
  save();
}

export function stageFor(gems) {
  let idx = 0;
  STAGES.forEach((s, i) => {
    if (gems >= s.min) idx = i;
  });
  const next = STAGES[idx + 1];
  return {
    level: idx + 1,
    ...STAGES[idx],
    next,
    progress: next ? (gems - STAGES[idx].min) / (next.min - STAGES[idx].min) : 1,
  };
}

export const countWords = (t) => String(t || "").trim().split(/\s+/).filter(Boolean).length;

// Record spells + gems. Returns { gained, newSpells, levelUp }.
export function award({ spells = [], gems = 0, mode, text = "" }) {
  const before = stageFor(state.gems);
  const newSpells = [];
  for (const s of spells) {
    if (!state.spellCounts[s.id]) newSpells.push(s.id);
    state.spellCounts[s.id] = (state.spellCounts[s.id] || 0) + 1;
  }
  const gained = gems + spells.length * 10;
  state.gems += gained;
  if (text) {
    state.log.push({ t: Date.now(), mode, words: countWords(text), spells: spells.map((s) => s.id) });
    if (state.log.length > 500) state.log.splice(0, state.log.length - 500);
  }
  save();
  const after = stageFor(state.gems);
  return { gained, newSpells, levelUp: after.level > before.level ? after : null };
}
