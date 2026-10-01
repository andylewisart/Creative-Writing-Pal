// Grown-ups corner: progress, settings, and how the game teaches.

import { get, update, resetAll } from "../state.js";
import { SPELLS } from "../spells.js";
import { detectBackend, backendKind, resetBackend } from "../ai.js";
import { IS_STATIC_SITE, getKeys, setKeys, maskKey } from "../keys.js";
import { sessions, summaryLine, describe, buildReport } from "../report.js";
import { clearLog } from "../log.js";
import { esc, el, $ } from "../ui.js";
import { speak } from "../fx.js";

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

      <h2>Recent activity</h2>
      ${activityHtml()}

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
        <label for="set-voice">🎙️ Voice coach (needs an OpenAI key and a microphone)</label><input type="checkbox" id="set-voice" ${s.settings.voice !== false ? "checked" : ""}>
        <label for="set-voice-min">Voice coach minutes per day</label>
        <select id="set-voice-min">${[5, 10, 20, 30, 45].map((n) => `<option value="${n}" ${n === (s.settings.voiceMinutes ?? 20) ? "selected" : ""}>${n} minutes</option>`).join("")}</select>
      </div>
      <p class="p-note" id="saved-note" role="status"></p>

      <h2>AI connection</h2>
      <p class="p-note" id="ai-status">Checking...</p>
      ${IS_STATIC_SITE ? connectHtml() : ""}

      <div class="danger-zone">
        <button class="btn btn-small btn-ghost" type="button" id="test-voice">🔊 Test the read-aloud voice</button>
      </div>
      <p class="p-note" id="voice-note" role="status"></p>
      <p class="p-note">Version: ${typeof __BUILD__ !== "undefined" ? esc(__BUILD__) : "local"}</p>

      <h2>How the game teaches</h2>
      <div class="p-how">
        <p><b>Detail earns power.</b> Every mode rewards the same eight craft moves ("spells"): sensory detail, sound words, dialogue, feelings, comparisons, strong verbs, and twists. Gems, Sparky's growth, and creature stats all come from using them.</p>
        <p><b>Revision is a power-up, not a correction.</b> After each story turn, Sparky picks one sentence your child wrote and asks one curious question about it. They edit that sentence in place, guided by a quick before-and-after example. If they tack the detail on the end ("…from the ground. Red fire."), Sparky celebrates the detail and offers a fill-in-the-blank frame built from their own sentence, so they learn where details go.</p>
        <p><b>Talk first, then write.</b> The 🎙️ voice coach lets your child talk an idea through with Sparky out loud. Kids can usually say much more than they can write. Their spoken ideas appear as notes to write from, and Sparky never dictates the writing.</p>
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
  $("#set-voice", root).addEventListener("change", (e) => (update((st) => (st.settings.voice = e.target.checked)), saved()));
  $("#set-voice-min", root).addEventListener("change", (e) => (update((st) => (st.settings.voiceMinutes = Number(e.target.value))), saved()));
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

  wireActivity();
  $("#test-voice", root).addEventListener("click", () => {
    const note = $("#voice-note", root);
    let fellBack = false;
    note.textContent = "Getting the voice ready...";
    speak("Hi! I'm Sparky. Get ready for an adventure... KABOOM!", {
      onfallback: (code, msg) => {
        fellBack = true;
        note.textContent =
          code === "no_key"
            ? "This device has no OpenAI key, so it uses the basic built-in voice. Add the key under AI connection."
            : `OpenAI's voice didn't work on this device (${code}${msg ? `: ${msg}` : ""}), so the basic built-in voice is reading instead. If the key is a restricted project key, give it access to Audio / Text-to-speech on platform.openai.com.`;
      },
      onstart: () => {
        if (!fellBack) note.textContent = "Playing OpenAI's storyteller voice ✅";
      },
    });
  });
  if (IS_STATIC_SITE) wireConnect();
  await detectBackend();
  const status = $("#ai-status", root);
  if (!status) return;
  status.textContent = {
    direct: "Connected with the OpenAI key saved on this device. It runs the stories, Sparky's coaching, the painted creature art, and the voice coach.",
    claude: "Connected through your Claude account (this is the claude.ai version). Each AI step uses your Claude usage. Painting and the voice coach aren't available here; use the github.io version for those.",
    server: "Connected through the Story Quest server and its OpenAI key.",
    practice: IS_STATIC_SITE
      ? "Not connected. The game is using practice magic: simple word-pattern checks and pre-written story chapters. Add an OpenAI API key below to turn on real AI on this device."
      : "Not connected. The game is using practice magic: simple word-pattern checks and pre-written story chapters. To turn on real AI, run the server with an OpenAI API key (see the README).",
  }[backendKind()];
}

function connectHtml() {
  const k = getKeys();
  return `<div class="connect">
    <p class="p-note">The key is saved only in this browser on this device, and is sent only to OpenAI. Anyone using this device could dig it out of the browser's developer tools, so set a monthly spending limit on your OpenAI account.</p>
    <div class="p-settings">
      <label for="key-openai">OpenAI API key ${k.openai ? `<span class="key-state ok">saved ${esc(maskKey(k.openai))}</span>` : `<span class="key-state">not set</span>`}<small>Runs everything: stories, coaching, paintings, voice. Get one at platform.openai.com</small></label>
      <input id="key-openai" type="password" autocomplete="off" spellcheck="false" placeholder="sk-proj-...">
    </div>
    <div class="danger-zone">
      <button class="btn btn-small btn-go" type="button" id="save-keys">Save key</button>
      <button class="btn btn-small btn-ghost" type="button" id="check-keys">Check key</button>
      ${k.openai ? `<button class="btn btn-small btn-danger" type="button" id="forget-keys">Remove key from this device</button>` : ""}
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
    say("Checking the key...");
    const { checkKey } = await import("../direct.js");
    const word = { ok: "works ✅", bad: "was rejected ❌ (check for typos, or make a new key)", unreachable: "couldn't be reached (check the internet)", none: "isn't set" };
    say(`OpenAI key ${word[await checkKey()]}.`);
  };
  $("#save-keys", root).addEventListener("click", async () => {
    const o = $("#key-openai", root).value.trim();
    if (!o) return say("Paste a key first.");
    if (!setKeys({ openai: o })) return say("This browser won't let the page save anything (private browsing?). Try a regular window.");
    resetBackend();
    await dashboard();
    await check();
  });
  $("#check-keys", root).addEventListener("click", check);
  $("#forget-keys", root)?.addEventListener("click", async () => {
    setKeys({});
    resetBackend();
    await dashboard();
    say("Key removed from this device.");
  });
}

function activityHtml() {
  const list = sessions().slice(-6).reverse();
  if (!list.length) return `<p class="p-note">Nothing recorded yet. Every story part, power-up, revision, and AI reply will show up here.</p>`;
  const time = (t) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `<p class="p-note">Everything is recorded on this device only. Tap a session to see each step. To tune the game, copy the report and paste it into a chat with Claude.</p>
    <div class="sessions">${list
      .map(
        (sn, i) => `<details class="session" ${i === 0 ? "open" : ""}>
          <summary><b>${esc(new Date(sn.start).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }))} ${esc(time(sn.start))}</b> · ${esc(summaryLine(sn))}</summary>
          <ol class="timeline">${sn.events
            .map((e) => [e, describe(e)])
            .filter(([, d]) => d)
            .map(([e, d]) => `<li class="${d.startsWith("  ") ? "sub" : ""} ${/!!/.test(d) ? "bad" : ""}"><time>${esc(time(e.t))}</time><span>${esc(d.trim())}</span></li>`)
            .join("")}</ol>
        </details>`,
      )
      .join("")}</div>
    <div class="danger-zone" id="log-actions">
      <button class="btn btn-small btn-go" type="button" id="copy-report">📋 Copy report for Claude</button>
      <button class="btn btn-small btn-ghost" type="button" id="clear-log">Clear activity</button>
    </div>
    <textarea id="report-fallback" class="report-fallback" rows="8" readonly hidden></textarea>
    <p class="p-note" id="log-note" role="status"></p>`;
}

function wireActivity() {
  const note = () => $("#log-note", root);
  $("#copy-report", root)?.addEventListener("click", async () => {
    const text = buildReport();
    try {
      await navigator.clipboard.writeText(text);
      note().textContent = "Copied! Paste it into a chat with Claude.";
    } catch {
      const ta = $("#report-fallback", root);
      ta.hidden = false;
      ta.value = text;
      ta.focus();
      ta.select();
      note().textContent = "Your browser blocked copying, so the report is selected above. Copy it with Ctrl+C (or long-press → Copy).";
    }
  });
  $("#clear-log", root)?.addEventListener("click", () => {
    const zone = $("#log-actions", root);
    zone.innerHTML = `<span>Clear the activity record? Books, creatures, and gems stay.</span>
      <button class="btn btn-small btn-danger" type="button" id="clear-yes">Yes, clear it</button>
      <button class="btn btn-small btn-ghost" type="button" id="clear-no">Cancel</button>`;
    $("#clear-yes", root).addEventListener("click", () => (clearLog(), dashboard()));
    $("#clear-no", root).addEventListener("click", dashboard);
  });
}
