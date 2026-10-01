// Grown-ups corner: progress, settings, and how the game teaches.

import { get, update, resetAll } from "../state.js";
import { SPELLS } from "../spells.js";
import { detectBackend, backendKind, resetBackend } from "../ai.js";
import { IS_STATIC_SITE, getKeys, setKeys, maskKey } from "../keys.js";
import { esc, el, $ } from "../ui.js";

let root, nav;

export function render(r, n) {
  root = r;
  nav = n;
  gate();
}

// A tiny "are you a grown-up?" check.
function gate() {
  const a = 6 + Math.floor(Math.random() * 4);
  const b = 6 + Math.floor(Math.random() * 4);
  root.innerHTML = "";
  root.appendChild(
    el(`<section class="parents gate">
      <h1 class="screen-title">Grown-ups corner</h1>
      <form id="gate-form" class="gate-form">
        <label for="gate-answer">Grown-up check: what is ${a} × ${b}?</label>
        <input id="gate-answer" inputmode="numeric" autocomplete="off">
        <button class="btn btn-go" type="submit">Enter</button>
        <p class="form-error" id="gate-error" role="alert" hidden>Not quite. Ask a grown-up for help!</p>
      </form>
    </section>`),
  );
  $("#gate-answer", root).focus();
  $("#gate-form", root).addEventListener("submit", (e) => {
    e.preventDefault();
    if (Number($("#gate-answer", root).value) === a * b) dashboard();
    else $("#gate-error", root).hidden = false;
  });
}

function avg(list) {
  return list.length ? Math.round(list.reduce((x, y) => x + y, 0) / list.length) : 0;
}

async function dashboard() {
  const s = get();
  const questLog = s.log.filter((l) => l.mode === "quest");
  const firstFive = questLog.slice(0, 5).map((l) => l.words);
  const lastFive = questLog.slice(-5).map((l) => l.words);
  const totalWords = s.log.reduce((n, l) => n + l.words, 0);
  const powerUps = s.log.filter((l) => l.mode === "powerup").length;
  const maxSpell = Math.max(1, ...SPELLS.map((sp) => s.spellCounts[sp.id] || 0));
  const recent = s.log.slice(-20);
  const maxWords = Math.max(10, ...recent.map((l) => l.words));

  root.innerHTML = "";
  root.appendChild(
    el(`<section class="parents">
      <h1 class="screen-title">Grown-ups corner</h1>

      <div class="p-grid">
        <div class="p-stat"><b>${totalWords}</b><span>words written</span></div>
        <div class="p-stat"><b>${s.stories.length}</b><span>stories finished</span></div>
        <div class="p-stat"><b>${powerUps}</b><span>power-up revisions</span></div>
        <div class="p-stat"><b>${firstFive.length ? `${avg(firstFive)} → ${avg(lastFive)}` : "–"}</b><span>avg words per story turn (first 5 → latest 5)</span></div>
      </div>

      <h2>Length of recent writing</h2>
      ${
        recent.length
          ? `<div class="spark-chart" role="img" aria-label="Word counts of the last ${recent.length} pieces of writing">${recent
              .map((l) => `<span style="height:${Math.max(4, (l.words / maxWords) * 100)}%" title="${l.words} words (${esc(l.mode)})"></span>`)
              .join("")}</div><p class="p-note">Each bar is one piece of writing, oldest on the left. Tallest bar = ${maxWords} words.</p>`
          : `<p class="p-note">Nothing written yet. Bars appear here as your child writes.</p>`
      }

      <h2>Writing moves used (spells)</h2>
      <div class="p-spells">${SPELLS.map(
        (sp) => `<div class="p-spell"><span>${sp.icon} ${esc(sp.name)}</span><div class="p-bar"><div style="width:${((s.spellCounts[sp.id] || 0) / maxSpell) * 100}%;background:${sp.color}"></div></div><b>${s.spellCounts[sp.id] || 0}</b><small>${esc(sp.teaches)}</small></div>`,
      ).join("")}</div>

      <h2>Settings</h2>
      <div class="p-settings">
        <label for="set-name">Writer name</label><input id="set-name" value="${esc(s.writerName)}" maxlength="24">
        <label for="set-turns">Story Quest length</label>
        <select id="set-turns">${[3, 4, 5, 6, 7].map((n) => `<option value="${n}" ${n === s.settings.questTurns ? "selected" : ""}>${n} writing turns</option>`).join("")}</select>
        <label for="set-sound">Sound effects</label><input type="checkbox" id="set-sound" ${s.settings.sound ? "checked" : ""}>
        <label for="set-read">Read new chapters aloud automatically</label><input type="checkbox" id="set-read" ${s.settings.readAloud ? "checked" : ""}>
      </div>
      <p class="p-note" id="saved-note" role="status"></p>

      <h2>AI connection</h2>
      <p class="p-note" id="ai-status">Checking...</p>
      ${IS_STATIC_SITE ? connectHtml() : ""}

      <h2>How the game teaches</h2>
      <div class="p-how">
        <p><b>Detail earns power.</b> Every mode rewards the same eight craft moves ("spells"): sensory detail, sound words, dialogue, feelings, comparisons, strong verbs, and twists. Gems, Sparky's growth, and creature stats all come from using them.</p>
        <p><b>Revision is a power-up, not a correction.</b> After each story turn, Sparky asks one curious question about something your child wrote. Answering it adds a sentence to their part and earns bonus gems. That habit, going back to add a detail, is the heart of the game.</p>
        <p><b>No red pen.</b> The AI never mentions spelling or grammar and never writes your child's part for them. Praise always quotes their actual words. The "Idea crystal" gives questions, not sentences to copy.</p>
        <p><b>Ways to help:</b> read the finished books together and ask about the favorite line. Try Creature Lab side by side: one of you writes a short description, the other a detailed one, and compare the drawings.</p>
      </div>

      <h2>Start over</h2>
      <div class="danger-zone" id="danger">
        <button class="btn btn-small btn-danger" type="button" id="reset">Erase all progress</button>
      </div>
    </section>`),
  );

  const note = $("#saved-note", root);
  const saved = () => {
    note.textContent = "Saved.";
    setTimeout(() => (note.textContent = ""), 1500);
  };
  $("#set-name", root).addEventListener("change", (e) => {
    const v = e.target.value.trim();
    if (v) update((st) => (st.writerName = v)), saved();
  });
  $("#set-turns", root).addEventListener("change", (e) => (update((st) => (st.settings.questTurns = Number(e.target.value))), saved()));
  $("#set-sound", root).addEventListener("change", (e) => (update((st) => (st.settings.sound = e.target.checked)), saved()));
  $("#set-read", root).addEventListener("change", (e) => (update((st) => (st.settings.readAloud = e.target.checked)), saved()));
  $("#reset", root).addEventListener("click", () => {
    const zone = $("#danger", root);
    zone.innerHTML = `<span>This erases every book, creature, gem, and spell. It can't be undone.</span>
      <button class="btn btn-small btn-danger" type="button" id="reset-yes">Yes, erase everything</button>
      <button class="btn btn-small btn-ghost" type="button" id="reset-no">Cancel</button>`;
    $("#reset-yes", root).addEventListener("click", () => {
      resetAll();
      nav.go("hub");
    });
    $("#reset-no", root).addEventListener("click", dashboard);
  });

  if (IS_STATIC_SITE) wireConnect();
  await detectBackend();
  const status = $("#ai-status", root);
  if (!status) return;
  status.textContent = {
    direct: "Connected with the API keys saved on this device. Stories and judging use your Anthropic key; painted creature art uses your OpenAI key.",
    claude: "Connected through your Claude account. Each AI step uses your Claude usage. The first time, Claude asks you to allow this page to use it.",
    server: "Connected through the Story Quest server and your Anthropic API key.",
    practice: IS_STATIC_SITE
      ? "Not connected. The game is using practice magic: simple word-pattern checks and pre-written story chapters. Add an Anthropic API key below to turn on real AI on this device."
      : "Not connected. The game is using practice magic: simple word-pattern checks and pre-written story chapters. To turn on real AI, open the game as a Claude artifact, or run the server with an Anthropic API key (see the README).",
  }[backendKind()];
}

function connectHtml() {
  const k = getKeys();
  const state = (v) => (v ? `<span class="key-state ok">saved ${esc(maskKey(v))}</span>` : `<span class="key-state">not set</span>`);
  return `<div class="connect">
    <p class="p-note">Keys are saved only in this browser on this device, and are sent only to Anthropic and OpenAI. Anyone using this device could dig them out of the browser's developer tools, so set a monthly spending limit on both accounts.</p>
    <div class="p-settings">
      <label for="key-anthropic">Anthropic API key ${state(k.anthropic)}<small>Stories, Sparky, and judging. Get one at console.anthropic.com</small></label>
      <input id="key-anthropic" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-...">
      <label for="key-openai">OpenAI API key ${state(k.openai)}<small>Optional: painted creature art. Get one at platform.openai.com</small></label>
      <input id="key-openai" type="password" autocomplete="off" spellcheck="false" placeholder="sk-proj-...">
    </div>
    <div class="danger-zone">
      <button class="btn btn-small btn-go" type="button" id="save-keys">Save keys</button>
      <button class="btn btn-small btn-ghost" type="button" id="check-keys">Check keys</button>
      ${k.anthropic || k.openai ? `<button class="btn btn-small btn-danger" type="button" id="forget-keys">Remove keys from this device</button>` : ""}
    </div>
    <p class="p-note" id="key-note" role="status"></p>
  </div>`;
}

function wireConnect() {
  // Look the note up each time: saving redraws the page.
  const say = (text) => {
    const n = $("#key-note", root);
    if (n) n.textContent = text;
  };
  const check = async () => {
    say("Checking keys...");
    const { checkKeys } = await import("../direct.js");
    const r = await checkKeys();
    const word = { ok: "works ✅", bad: "was rejected ❌ (check for typos, or make a new key)", unreachable: "couldn't be reached (check the internet)", none: "not set" };
    say(`Anthropic key ${word[r.anthropic]}. OpenAI key ${word[r.openai]}.`);
  };
  $("#save-keys", root).addEventListener("click", async () => {
    const k = getKeys();
    const a = $("#key-anthropic", root).value.trim();
    const o = $("#key-openai", root).value.trim();
    if (!a && !o) {
      say("Paste a key first.");
      return;
    }
    if (!setKeys({ anthropic: a || k.anthropic, openai: o || k.openai })) {
      say("This browser won't let the page save anything (private browsing?). Try a regular window.");
      return;
    }
    resetBackend();
    await dashboard();
    await check();
  });
  $("#check-keys", root).addEventListener("click", check);
  $("#forget-keys", root)?.addEventListener("click", async () => {
    setKeys({});
    resetBackend();
    await dashboard();
    $("#key-note", root).textContent = "Keys removed from this device.";
  });
}
