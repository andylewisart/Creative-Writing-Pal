import { get, update, stageFor, onChange } from "./state.js";
import { detectBackend, backendKind } from "./ai.js";
import { esc, el, $, sparkyHtml } from "./ui.js";
import { sfx, stopSpeaking } from "./fx.js";
import { logEvent } from "./log.js";
import { stopVoice } from "./voice.js";
import * as quest from "./modes/quest.js";
import * as epic from "./modes/epic.js";
import * as creature from "./modes/creature.js";
import * as library from "./modes/library.js";
import * as parents from "./modes/parents.js";

const app = document.getElementById("app");
const bar = document.getElementById("topbar");

const SCREENS = { hub, quest: quest.render, epic: epic.render, creature: creature.render, library: library.render, parents: parents.render };

export function go(name, params = {}) {
  stopSpeaking();
  stopVoice("left");
  logEvent("screen", { name, tab: params.tab });
  app.innerHTML = "";
  app.dataset.screen = name;
  (SCREENS[name] || hub)(app, { go, params });
  renderBar();
  window.scrollTo({ top: 0 });
}

function renderBar() {
  const s = get();
  const st = stageFor(s.gems);
  const home = app.dataset.screen && app.dataset.screen !== "hub";
  bar.innerHTML = `
    ${home ? `<button class="btn-home" type="button" aria-label="Back to the map">🏠<span>Home</span></button>` : `<span class="brand">Story Quest</span>`}
    <div class="bar-right">
      <div class="level-pill" title="${esc(st.name)}">
        ${sparkyHtml("happy", "mini")}
        <div class="level-text"><b>Lv ${st.level}</b><span>${esc(st.name)}</span>
          <div class="xp"><div style="width:${Math.round(st.progress * 100)}%"></div></div>
        </div>
      </div>
      <div class="gems" aria-label="${s.gems} gems">💎 <b>${s.gems}</b></div>
    </div>`;
  $(".btn-home", bar)?.addEventListener("click", () => (sfx.click(), go("hub")));
}
onChange(renderBar);

function hub(root, { go }) {
  const s = get();
  if (!s.writerName) return onboarding(root);
  const st = stageFor(s.gems);
  const toNext = st.next ? st.next.min - s.gems : 0;
  const q = s.activeQuest;
  root.appendChild(
    el(`<section class="hub">
      <div class="hub-hero">
        ${sparkyHtml("happy", "huge float")}
        <div class="speech">
          <p class="hello">Hi, <b>${esc(s.writerName)}</b>!</p>
          <p>${hubLine(st, toNext)}</p>
        </div>
      </div>
      <div class="portals">
        <button class="portal portal-quest" type="button" data-go="quest">
          <span class="portal-art" aria-hidden="true">🗺️</span>
          <span class="portal-name">Story Quest</span>
          <span class="portal-desc">${q ? `Continue <i>${esc(q.title)}</i> (part ${q.turn} of ${q.totalTurns})` : "Write an adventure together with Sparky"}</span>
        </button>
        <button class="portal portal-epic" type="button" data-go="epic">
          <span class="portal-art" aria-hidden="true">⚡</span>
          <span class="portal-name">Boring-to-EPIC</span>
          <span class="portal-desc">Zap a boring sentence until it's epic. Best score: ${s.epicBest || "none yet"}</span>
        </button>
        <button class="portal portal-creature" type="button" data-go="creature">
          <span class="portal-art" aria-hidden="true">🐲</span>
          <span class="portal-name">Creature Lab</span>
          <span class="portal-desc">Describe a creature. The artist draws ONLY what you write!</span>
        </button>
      </div>
      <div class="hub-shelf">
        <button class="shelf-btn" type="button" data-go="library" data-tab="spells">📖 Spellbook</button>
        <button class="shelf-btn" type="button" data-go="library" data-tab="books">📚 My Books <b>${s.stories.length}</b></button>
        <button class="shelf-btn" type="button" data-go="library" data-tab="creatures">🃏 Creature Cards <b>${s.creatures.length}</b></button>
      </div>
      <footer class="hub-foot">
        <button class="link-btn" type="button" data-go="parents">Grown-ups corner</button>
        <span class="mode-tag" id="mode-tag"></span>
      </footer>
    </section>`),
  );
  root.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => {
      sfx.click();
      go(b.dataset.go, { tab: b.dataset.tab });
    }),
  );
  detectBackend().then(() => {
    const tag = $("#mode-tag");
    if (tag) tag.textContent = backendKind() === "practice" ? "Practice magic (AI not connected)" : "Real magic connected ✨";
  });
}

function hubLine(st, toNext) {
  if (st.level === 1) return `I'm still an egg! Feed me ${toNext} more gems of great writing and I'll hatch!`;
  if (!st.next) return "I'm a LEGENDARY Word Dragon! Let's write something amazing!";
  return `I'm a ${esc(st.name)}. ${toNext} more gems and I'll grow into a ${esc(st.next.name)}! Pick an adventure!`;
}

function onboarding(root) {
  root.appendChild(
    el(`<section class="onboard">
      ${sparkyHtml("happy", "huge wobble")}
      <div class="speech">
        <p class="hello">*crack crack*</p>
        <p>Hi! I'm Sparky, a dragon egg. I eat <b>words</b>! The more amazing your writing, the faster I hatch and grow.</p>
        <p>What's your writer name?</p>
      </div>
      <form class="name-form" id="name-form">
        <label for="writer-name" class="sr-only">Your writer name</label>
        <input id="writer-name" maxlength="24" autocomplete="off" placeholder="Type your name" required>
        <button class="btn btn-go" type="submit">Let's go! →</button>
      </form>
    </section>`),
  );
  const form = $("#name-form", root);
  $("#writer-name", root).focus();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#writer-name", root).value.trim();
    if (!name) return;
    sfx.spell();
    update((s) => (s.writerName = name));
    go("hub");
  });
}

function start() {
  detectBackend().then(() => logEvent("app.open", { backend: backendKind(), width: window.innerWidth }));
  go("hub");
}

// Keep state through live artifact updates; otherwise just start.
if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start();
