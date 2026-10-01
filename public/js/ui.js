// Small shared UI helpers.

import { spellById } from "./spells.js";
import { get, stageFor } from "./state.js";
import { sparkySvg, sfx, confetti, speak } from "./fx.js";
import { logEvent } from "./log.js";
import { detectSpells } from "./demo.js";
import { SPELLS } from "./spells.js";

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function sparkyHtml(mood = "happy", extraClass = "") {
  const st = stageFor(get().gems);
  return `<div class="sparky ${extraClass}" data-level="${st.level}">${sparkySvg(st.level, mood)}</div>`;
}

export function spellChip(id, quote) {
  const s = spellById[id];
  if (!s) return "";
  return `<span class="spell-chip" style="--spell:${s.color}" title="${esc(s.teaches)}">
    <span class="spell-icon">${s.icon}</span><span>${esc(s.name)}</span>${quote ? `<q>${esc(quote)}</q>` : ""}
  </span>`;
}

export function challengeHtml(c, label = "Bonus quest") {
  const s = spellById[c?.spell];
  if (!s) return "";
  return `<div class="challenge" style="--spell:${s.color}">
    <span class="challenge-label">${s.icon} ${esc(label)}: ${esc(s.name)}</span>
    <span class="challenge-text">${esc(c.prompt)}</span>
  </div>`;
}

export function loadingHtml(text, sub = "") {
  return `<div class="brewing" role="status">
    <div class="cauldron" aria-hidden="true"><span>✨</span><span>🔮</span><span>⭐</span></div>
    <p class="brew-main">${esc(text)}</p>
    ${sub ? `<p class="brew-sub">${esc(sub)}</p>` : ""}
  </div>`;
}

// A writing desk: big textarea, live word meter, and spell lights that
// glow while the writer types (a quick hint; the AI makes it official).
export function writingDesk({ id, placeholder, goal = 25, rows = 5, value = "" }) {
  return `<div class="desk" data-goal="${goal}">
    <textarea id="${id}" class="kid-writing" rows="${rows}" placeholder="${esc(placeholder)}" spellcheck="false" autocomplete="off">${esc(value)}</textarea>
    <div class="desk-meta">
      <div class="power-meter" aria-hidden="true"><div class="power-fill"></div></div>
      <span class="word-count">0 words</span>
      <div class="spell-lights" aria-label="Spells charging">${SPELLS.map(
        (s) => `<span class="light" data-spell="${s.id}" style="--spell:${s.color}" title="${esc(s.name)}">${s.icon}</span>`,
      ).join("")}</div>
    </div>
  </div>`;
}

export function wireDesk(root) {
  const ta = $("textarea", root);
  const goal = Number(root.dataset.goal) || 25;
  const fill = $(".power-fill", root);
  const wc = $(".word-count", root);
  const update = () => {
    const n = ta.value.trim().split(/\s+/).filter(Boolean).length;
    fill.style.width = Math.min(100, (n / goal) * 100) + "%";
    fill.classList.toggle("full", n >= goal);
    wc.textContent = n >= goal ? `${n} words · power full!` : `${n} word${n === 1 ? "" : "s"}`;
    const lit = new Set(detectSpells(ta.value).map((s) => s.id));
    $$(".light", root).forEach((l) => l.classList.toggle("on", lit.has(l.dataset.spell)));
  };
  ta.addEventListener("input", update);
  update();
  return ta;
}

// The big reward moment after the writer submits something.
export function showReward({ cheer, spells = [], result, title = "Spells cast!", mood = "chomp", power = "", button = "Awesome! →" }) {
  return new Promise((resolve) => {
    const { gained, newSpells, levelUp } = result;
    const overlay = el(`<div class="overlay" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="reward-card">
        ${sparkyHtml(mood, "big bounce")}
        <p class="cheer">${esc(cheer)}</p>
        ${spells.length ? `<h3>${esc(title)}</h3><div class="spell-list">${spells.map((s, i) => `<div class="pop" style="animation-delay:${0.25 + i * 0.25}s">${spellChip(s.id, s.quote)}</div>`).join("")}</div>` : ""}
        ${newSpells.length ? `<div class="new-spell pop" style="animation-delay:${0.4 + spells.length * 0.25}s">📖 NEW SPELL LEARNED: ${newSpells.map((id) => `${spellById[id].icon} ${esc(spellById[id].name)}`).join(", ")}!</div>` : ""}
        ${power ? `<div class="power-line pop" style="animation-delay:${0.2 + spells.length * 0.25}s">${power}</div>` : ""}
        ${gained ? `<div class="gem-gain pop" style="animation-delay:${0.3 + spells.length * 0.25}s">+${gained} 💎</div>` : ""}
        ${levelUp ? `<div class="level-up pop" style="animation-delay:${0.6 + spells.length * 0.25}s">🎉 Sparky grew! Now a <b>${esc(levelUp.name)}</b>!</div>` : ""}
        <button class="btn btn-go" type="button">${esc(button)}</button>
      </div>
    </div>`);
    document.body.appendChild(overlay);
    sfx.chomp();
    spells.forEach((_, i) => setTimeout(sfx.gem, 300 + i * 250));
    if (newSpells.length || spells.length >= 3) setTimeout(() => (sfx.spell(), confetti(40)), 400);
    if (levelUp) setTimeout(() => (sfx.level(), confetti(90)), 900);
    const btn = $(".btn-go", overlay);
    btn.focus();
    btn.addEventListener("click", () => {
      overlay.remove();
      resolve();
    });
  });
}

// When the writing isn't hitting the mark, Sparky says his tip out loud
// (OpenAI voice, or the browser's voice without a key). Grown-ups can turn
// this off.
export function speakTip(tip, where) {
  if (!tip || get().settings.voiceTips === false) return;
  logEvent("voice.tip", { where, tip });
  speak(tip, { style: "coach" });
}

// The writer's fuzzy words, quoted back ("rord rely loud"), plus a button
// that replays Sparky's tip.
export function fuzzyHtml(fuzzy = [], tip = "") {
  if (!fuzzy.length && !tip) return "";
  return `<div class="fuzzy-row">
    ${fuzzy.length ? `<span class="fuzzy-label">🔍 Fuzzy:</span>${fuzzy.map((f) => `<q class="fuzzy-quote">${esc(f)}</q>`).join("")}` : ""}
    ${tip ? `<button class="tip-play" type="button" data-tip="${esc(tip)}">🔊 Sparky's tip</button>` : ""}
  </div>`;
}

export function wireTipButtons(scope) {
  scope.querySelectorAll(".tip-play").forEach((b) => b.addEventListener("click", () => speak(b.dataset.tip, { style: "coach" })));
}

export function toast(text) {
  const t = el(`<div class="toast" role="status">${esc(text)}</div>`);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
